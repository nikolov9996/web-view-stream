import axios from "axios";

const instance = axios.create({
  baseURL: "https://wp.12all.tv:1357/",
  timeout: 10000,
});

export const getStream = async (id) => {
  return await instance.get(`shared-streams/${id}`);
};

export const vlrFree = async (token, phoneNumber) => {
  return await instance.post("vlr-free", { token, phoneNumber });
};

export const updateMetaData = async (data) => {
  return await instance.post("vlr/update-meta-data", data);
};

export const playedSuccess = async (videoId, token, phoneNumber) => {
  return await instance.post("shared-streams/played-successfully", {
    id: videoId,
    playedSuccessfully: true,
    token,
    phoneNumber,
  });
};

export const getIceServers = async () => {
  return await instance.get("ice-servers");
};

export const vlrPing = async (public_id) => {
  return await instance.post("vlr-ping", {
    public_id,
  });
};
