import { useEffect, useRef, useState } from "react";
import ReactPlayer from "react-player";
import "./App.css";
import {
  getStream,
  vlrFree,
  updateMetaData,
  playedSuccess,
  vlrPing,
} from "./services/api";
import { vertoSession } from "./services/rtc";

function App() {
  const [jwt, setJwt] = useState("");
  const [streamId, setStreamId] = useState("");
  const [streamUrl, setStreamUrl] = useState("");
  const [canPlay, setCanPlay] = useState(false);
  const [mUser, setMUser] = useState("");
  const [mPass, setMPass] = useState("");
  const [roomID, setRoomID] = useState("");

  const streamRef = useRef(null);
  const audioRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStream = useRef(null);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: true,
      })
      .then((x) => {
        localStreamRef.current.srcObject = x;
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
            { stream:  capturedStream},
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

  const start = async () => {
    setCanPlay(false);
    const {
      data: { url, name, language, genre },
    } = await getStream(streamId);
    setStreamUrl(url);
    const {
      data: { public_id, moderator_password, moderator_username, room_id },
    } = await vlrFree(jwt);

    setRoomID(room_id);
    setMUser(moderator_username);
    setMPass(moderator_password);

    await updateMetaData(jwt, {
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
  };

  const handlePlaySuc = async () => {
    const resp = await playedSuccess(streamId, jwt);
    console.log(resp);
  };

  return (
    <div>
      {canPlay && (
        <ReactPlayer
        style={{visibility:"hidden"}}
          width={800}
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
        controls
        style={{ height: "auto", width: 400 }}
        ref={localStreamRef}
      ></video>
      remote video here
      <video
        muted
        autoPlay
        controls
        style={{ height: "auto", width: 400 }}
        ref={remoteStream}
        src={remoteStream.current}
      ></video>
      <audio ref={audioRef} hidden />
      <input
        placeholder="room id"
        onChange={({ target }) => setStreamId(target.value)}
      />
      <input
        placeholder="jwt"
        onChange={({ target }) => setJwt(target.value)}
      />
      <button onClick={start}>create room and join</button>
    </div>
  );
}

export default App;
