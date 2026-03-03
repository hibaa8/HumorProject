const API_BASE_URL = "https://api.almostcrackd.ai";

export const almostCrackdFetch = async (
  path: string,
  options: RequestInit,
  token: string
) => {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
};
