import { nanoid } from "nanoid";
import { getIceServers } from "./api";
import { notificationsMock } from "./notificationsMock";
const wssUrl = "wss://wp5.12all.tv:8082";
let iceServers = [];
const sessId = nanoid();
let wsRequestId = 0;
let remoteStream;
let MU, roomID;
let webSocket;
let localStream;
let pc2;

export async function vertoSession(
  moderatorUsername,
  moderatorPassword,
  options,
  room_id,
  remote,
  local
) {
  localStream = local;
  remoteStream = remote;
  MU = moderatorUsername;
  roomID = room_id;
  await vertoWebSocket(sessId, moderatorUsername, moderatorPassword, options);
}

async function vertoWebSocket(
  sessId,
  moderatorUsername,
  moderatorPassword,
  options
) {
  webSocket = new WebSocket(wssUrl);

  const initWS = () => {
    webSocket.onopen = () => {
      const params = {
        login: moderatorUsername,
        passwd: moderatorPassword,
      };

      publish({
        method: "login",
        params,
        onSuccess: () => {},
        onError: (err) => {
          console.error("Error while login", err);
        },
      });
    };
    webSocket.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      if (data.method === "verto.clientReady") {
        await vertoRTC(options);
      }
    };
  };

  function publish({ method, params }) {
    const request = {
      jsonrpc: "2.0",
      method,
      params: { sessid: sessId, ...params },
      id: ++wsRequestId,
    };

    const requestStringify = JSON.stringify(request);
    webSocket.readyState === WebSocket.OPEN && webSocket.send(requestStringify);
  }
  initWS();
}

async function peerConnection(options) {
  const { stream } = options;
  let pc;
  let counter = 0;
  const subscribe = (data) => {
    if (data) {
      const { chatChannel, infoChannel, modChannel, laChannel, laName } = data;
      const chatBody = JSON.stringify({
        jsonrpc: "2.0",
        method: "verto.subscribe",
        params: {
          sessid: sessId,
          eventChannel: chatChannel,
        },
        id: wsRequestId,
      });

      const infoBody = JSON.stringify({
        jsonrpc: "2.0",
        method: "verto.subscribe",
        params: {
          sessid: sessId,
          eventChannel: infoChannel,
        },
        id: wsRequestId,
      });

      const modBody = JSON.stringify({
        jsonrpc: "2.0",
        method: "verto.subscribe",
        params: {
          sessid: sessId,
          eventChannel: modChannel,
        },
        id: wsRequestId,
      });

      const liveArrayBody = JSON.stringify({
        jsonrpc: "2.0",
        method: "verto.subscribe",
        params: {
          sessid: sessId,
          eventChannel: laChannel,
        },
        id: wsRequestId,
      });

      const broadcastBody = JSON.stringify({
        jsonrpc: "2.0",
        method: "verto.subscribe",
        params: {
          data: {
            liveArray: {
              command: "bootstrap",
              context: laChannel,
              name: laName,
            },
          },
          sessid: sessId,
          eventChannel: laChannel,
        },
        id: wsRequestId,
      });

      wsRequestId++;
      webSocket.send(chatBody);

      wsRequestId++;
      webSocket.send(infoBody);

      wsRequestId++;
      webSocket.send(modBody);
      wsRequestId++;

      webSocket.send(liveArrayBody);
      wsRequestId++;

      webSocket.send(broadcastBody);
      wsRequestId++;
    }
  };

  webSocket.onmessage = async (e) => {
    const { data } = e;
    const dataJSON = JSON.parse(data);
    if (dataJSON.method === "verto.media") {
      const sdp = { sdp: dataJSON?.params.sdp, type: "answer" };
      if (counter) {
        pc2.setRemoteDescription(new RTCSessionDescription(sdp));
        console.log(dataJSON);
      } else {
        counter++;
        pc.setRemoteDescription(new RTCSessionDescription(sdp));
      }
    }
    if (dataJSON.method === "verto.answer") {
    }
    if (
      dataJSON.method === "verto.event" &&
      dataJSON.params.eventType === "channelPvtData"
    ) {
      const { pvtData } = dataJSON.params;
      subscribe(pvtData);
    }
  };

  const init = async () => {
    // options here
    try {
      if (!iceServers.length) {
        try {
          const { data } = await getIceServers();
          iceServers = data;
        } catch (e) {}
      }

      pc = new RTCPeerConnection({ iceServers });
      pc2 = new RTCPeerConnection({ iceServers });

      if (stream.getAudioTracks().length) {
        await pc.addTrack(stream.getAudioTracks()[0]);
      }

      if (stream.getVideoTracks().length) {
        await pc.addTrack(stream.getVideoTracks()[0]);
      }

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      pc.setLocalDescription(new RTCSessionDescription(offer));

      pc.addEventListener("track", (e) => {
        console.log(e.streams);
        remoteStream.current.srcObject = e.streams[0];
      });

      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          // pc.addIceCandidate(
          //   new RTCPeerConnectionIceEvent(ev)
          // );
        } else {
          sendInvite(pc.localDescription.sdp);
        }
      };

      function sendInvite(updatedSdp) {
        const params = {
          sdp: modifySDP(updatedSdp),
          dialogParams: {
            remote_caller_id_name: "OUTBOUND CALL",
            remote_caller_id_number: roomID,
            dedEnc: false,
            callID: nanoid(),
            caller_id_name: MU,
            destination_number: roomID+"_stream",
            displayName: MU,
            isHost: true,
            isPrimaryCall: true,
            localStream: {},
            notification: notificationsMock, // mocked notifications object
            notifyOnStateChange: true, // check with true here
            receiveStream: true,
            screenShare: false,
            showMe: true,
            userVariables: {
              displayName: MU,
              isHost: true,
              isPrimaryCall: true,
              showMe: true,
              userId: "undefined",
            },
          },
        };

        const request = {
          jsonrpc: "2.0",
          method: "verto.invite",
          params: { sessid: sessId, ...params },
          id: ++wsRequestId,
        };

        const requestStringify = JSON.stringify(request);
        webSocket.readyState === WebSocket.OPEN &&
          webSocket.send(requestStringify);
      }
    } catch (error) {
      console.error(error);
    }
  };

  await init();

  await videoChannelStream();
}

export async function vertoRTC(options) {
  peerConnection(options);
}

const videoChannelStream = async () => {
  if (localStream.getAudioTracks().length) {
    await pc2.addTrack(localStream.getAudioTracks()[0]);
  }

  if (localStream.getVideoTracks().length) {
    await pc2.addTrack(localStream.getVideoTracks()[0]);
  }

  const offer = await pc2.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
  });

  pc2.setLocalDescription(new RTCSessionDescription(offer));

  pc2.onicecandidate = (ev) => {
    if (ev.candidate) {
    } else {
      secondStreamJoin(pc2.localDescription.sdp);
    }

    function secondStreamJoin(sdp) {
      const params = {
        sdp: modifySDP(sdp),
        dialogParams: {
          remote_caller_id_name: "OUTBOUND CALL",
          remote_caller_id_number: roomID,
          dedEnc: false,
          callID: nanoid(),
          caller_id_name: MU + "11",
          destination_number: roomID,
          displayName: MU,
          isHost: false,
          isHostSharedVideo: true,
          isPrimaryCall: false,
          localStream: {},
          notification: notificationsMock, // mocked notifications object
          notifyOnStateChange: true,
          receiveStream: true,
          screenShare: false,
          showMe: true,
          userVariables: {
            displayName: MU,
            isHost: false,
            isHostSharedVideo: true,
            isPrimaryCall: false,
            showMe: false,
            userId: "undefined",
          },
        },
      };

      const request = {
        jsonrpc: "2.0",
        method: "verto.invite",
        params: { sessid: sessId, ...params },
        id: ++wsRequestId,
      };

      const requestStringify = JSON.stringify(request);
      webSocket.readyState === WebSocket.OPEN &&
        webSocket.send(requestStringify);
    }
  };
};

function modifySDP(SDP) {

  const h264Codec = SDP.match(/a=rtpmap:(\d+) H264/);

  if (h264Codec && h264Codec.length > 1) {
    const sdpSplit = SDP.split("\n");
    for (let i = 0; i < sdpSplit.length; i++) {
      const line = sdpSplit[i];

      const videoMatch = line.match(/^(m=video \d+ [^ ]+ )/g);

      if (videoMatch) {
        sdpSplit[i] = `${videoMatch[0]}${h264Codec[1]}`;
        break;
      }
    }
  
    return sdpSplit.join("\n");
  }
}
