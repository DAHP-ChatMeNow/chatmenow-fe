const normalizeEnvUrl = (value?: string) => value?.replace(/\/+$/, "");

const apiUrlEnv = normalizeEnvUrl(process.env.NEXT_PUBLIC_API_URL);

export const BASE_API_URL = apiUrlEnv;

export const BASE_SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;
