import axios from "axios";

const instance = axios.create({
  baseURL: "https://wp.12all.tv:1357/",
  timeout: 6000,
});

export const getStream = async (id) => {
  return await instance.get(`shared-streams/${id}`);
};

export const vlrFree = async (token) => {
  return await instance.post(
    "vlr-free",
    {},
    {
      headers: {
        authorization: `Bearer ${token}`,
      },
    }
  );
};

export const updateMetaData = async (token, data) => {
  return await instance.post("vlr/update-meta-data", data, {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });
};

export const playedSuccess = async (videoId, token) => {
  return await instance.post(
    "shared-streams/played-successfully",
    {
      id: videoId,
      playedSuccessfully: true,
    },
    {
      headers: {
        authorization: `Bearer ${token}`,
      },
    }
  );
};

export const getIceServers = async () => {
  return await instance.get("ice-servers");
};

export const vlrPing = async (public_id) => {
  return await instance.post("vlr-ping", {
    public_id,
  });
};
