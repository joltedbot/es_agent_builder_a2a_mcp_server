import type { AuthConfig } from "../types.js";

export function buildAuthHeaders(auth?: AuthConfig): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (!auth || auth.scheme === "none") return headers;

  const secret = auth.envVar ? process.env[auth.envVar] : undefined;

  switch (auth.scheme) {
    case "api-key":
      if (secret) headers["Authorization"] = `ApiKey ${secret}`;
      break;
    case "bearer":
      if (secret) headers["Authorization"] = `Bearer ${secret}`;
      break;
    case "header":
      // Custom headers only — no standard auth header
      break;
  }

  if (auth.headers) {
    Object.assign(headers, auth.headers);
  }

  return headers;
}

export async function authedFetch(
  baseUrl: string,
  path: string,
  auth: AuthConfig | undefined,
  options?: RequestInit,
): Promise<unknown> {
  const url = `${baseUrl}${path}`;
  const authHeaders = buildAuthHeaders(auth);
  const res = await fetch(url, {
    signal: AbortSignal.timeout(30_000),
    ...options,
    headers: { ...options?.headers, ...authHeaders },
  });
  const body = await res.text();
  if (!res.ok) {
    console.error(`HTTP error ${res.status} for ${new URL(url).origin}${new URL(url).pathname}: ${body.slice(0, 200)}`);
    throw new Error(`Upstream request failed with status ${res.status}`);
  }
  try {
    return JSON.parse(body);
  } catch {
    console.error(`Non-JSON response (${res.status}): ${body.slice(0, 200)}`);
    throw new Error("Received non-JSON response from upstream");
  }
}
