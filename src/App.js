import { useEffect, useRef, useState } from "react";
import ReactPlayer from "react-player";
import "./App.css";
import {
  getStream,
  vlrFree,
  updateMetaData,
  // playedSuccess,
  vlrPing,
} from "./services/api";
import { vertoSession } from "./services/rtc";

function App() {
  const [streamUrl, setStreamUrl] = useState("");
  const [canPlay, setCanPlay] = useState(false);
  const [mUser, setMUser] = useState("");
  const [mPass, setMPass] = useState("");
  const [roomID, setRoomID] = useState("");

  const streamRef = useRef(null);
  const audioRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStream = useRef(null);

  const params = new URLSearchParams(window.location.search);

  const token = params.get("token");
  const phoneNumber = "+" + params.get("phoneNumber");
  const streamId = params.get("roomId");

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: true,
      })
      .then((x) => {
        localStreamRef.current.srcObject = x;
      })
      .finally(async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await start();
      });
  }, []);

  const handleRpOnReady = async (player) => {
    const play = async () => {
      try {
        const videoEl = player.getInternalPlayer();

        await videoEl.play();
        let capturedStream;
        if (videoEl.captureStream) {
          capturedStream = videoEl.captureStream();
        } else if (videoEl.mozCaptureStream) {
          const stream = videoEl.mozCaptureStream();
          const tracks = [stream.getAudioTracks()[0]];

          if (stream.getVideoTracks().length) {
            tracks.push(stream.getVideoTracks()[0]);
          }

          capturedStream = new MediaStream(tracks);

          if (audioRef.current) {
            audioRef.current.srcObject = stream;
            audioRef.current.play().then();
          }
        }
        setTimeout(() => {
          vertoSession(
            mUser,
            mPass,
            { stream: capturedStream },
            roomID,
            remoteStream,
            localStreamRef.current.srcObject
          );
        }, 1200);
      } catch (error) {
        console.error(error);
      }
    };

    play().catch((e) => console.log(e));
  };

  async function start() {
    setCanPlay(false);
    const {
      data: { url, name, language, genre },
    } = await getStream(streamId);
    setStreamUrl(url);
    const {
      data: { public_id, moderator_password, moderator_username, room_id },
    } = await vlrFree(token, phoneNumber);

    setRoomID(room_id);
    setMUser(moderator_username);
    setMPass(moderator_password);

    await updateMetaData({
      token,
      phoneNumber,
      roomId: public_id,
      streamId,
      streamUrl: url,
      streamCamera: false,
      chanelName: "test " + name,
      channelLanguage: language,
      is_private: false,
      channelGenre: genre,
      channelLogo: "",
      channelDescription: "test",
    });

    const cb = async () => {
      const { data } = await vlrPing(public_id);
      console.log(data);
    };
    setInterval(cb, 25000);

    setCanPlay(true);
  }

  const handlePlaySuc = async () => {
    // const resp = await playedSuccess(streamId, token, phoneNumber);
    // console.log(resp);
  };

  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      {canPlay  && (
        <ReactPlayer
          style={{ position: "absolute", visibility: "hidden" }}
          width={100}
          height="auto"
          ref={streamRef}
          controls
          url={streamUrl}
          onPlay={handlePlaySuc}
          onError={(e) => console.log(e)}
          onReady={handleRpOnReady}
          muted
        />
      )}
      <video
        muted
        autoPlay
        style={{ visibility: "hidden", position: "absolute" }}
        ref={localStreamRef}
      ></video>
      <video
        autoPlay
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          margin: "auto",
          width: "100vw",
          height: "100vh",
        }}
        ref={remoteStream}
        // src={remoteStream.current}
      ></video>
      <audio ref={audioRef} hidden />

      <button style={{zIndex:9999,position:"relative", top:300}} onClick={start}>Join Room  {streamId}</button>
    </div>
  );
}

export default App;
