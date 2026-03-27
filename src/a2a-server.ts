import { createServer } from "http";
import { getAgentCard } from "./a2a/agent-card.js";
import { handleMessage } from "./a2a/message-handler.js";

const HOST = process.env.A2A_HOST ?? "127.0.0.1";
const PORT = parseInt(process.env.A2A_PORT ?? "3008", 10);
const AUTH_TOKEN = process.env.A2A_SERVER_TOKEN;

const MAX_BODY_SIZE = 32 * 1024; // 32KB
const RATE_LIMIT_MAX = parseInt(process.env.A2A_RATE_LIMIT ?? "10", 10); // requests per minute
const RATE_LIMIT_WINDOW = 60_000; // 1 minute

const requestTimes: number[] = [];

function isRateLimited(): boolean {
  const now = Date.now();
  while (requestTimes.length > 0 && requestTimes[0] < now - RATE_LIMIT_WINDOW) {
    requestTimes.shift();
  }
  if (requestTimes.length >= RATE_LIMIT_MAX) return true;
  requestTimes.push(now);
  return false;
}

function sendJson(res: import("http").ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function checkAuth(req: import("http").IncomingMessage, res: import("http").ServerResponse): boolean {
  // Auth is optional when bound to localhost only
  if (!AUTH_TOKEN && (HOST === "127.0.0.1" || HOST === "localhost" || HOST === "::1")) {
    return true;
  }
  if (!AUTH_TOKEN) {
    console.error("[a2a-server] A2A_SERVER_TOKEN required when binding to non-localhost address");
    sendJson(res, 500, { error: "Server misconfigured: auth token required for non-localhost" });
    return false;
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${AUTH_TOKEN}`) {
    sendJson(res, 401, { error: "Unauthorized" });
    return false;
  }
  return true;
}

function readBody(req: import("http").IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      data += chunk.toString();
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  const url = req.url ?? "/";
  const method = req.method ?? "GET";

  // Health check
  if (method === "GET" && url === "/health") {
    sendJson(res, 200, { status: "ok" });
    return;
  }

  // Agent card discovery (rate-limited to prevent enumeration)
  if (method === "GET" && (url === "/.well-known/agent-card.json" || url === "/.well-known/agent.json")) {
    if (isRateLimited()) {
      sendJson(res, 429, { error: "Rate limited" });
      return;
    }
    sendJson(res, 200, getAgentCard());
    return;
  }

  // Message endpoint — requires auth + rate limit
  if (method === "POST" && (url === "/" || url === "")) {
    if (!checkAuth(req, res)) return;
    if (isRateLimited()) {
      sendJson(res, 429, { jsonrpc: "2.0", id: null, error: { code: -32000, message: `Rate limited (max ${RATE_LIMIT_MAX} requests/minute)` } });
      return;
    }

    try {
      const body = await readBody(req);
      const response = await handleMessage(body);
      const status = response.error ? 400 : 200;
      sendJson(res, status, response);
    } catch (err) {
      if (err instanceof Error && err.message === "Request body too large") {
        sendJson(res, 413, { jsonrpc: "2.0", id: null, error: { code: -32600, message: "Request body too large (max 32KB)" } });
      } else {
        console.error("[a2a-server] Unexpected error:", err);
        sendJson(res, 500, { jsonrpc: "2.0", id: null, error: { code: -32603, message: "Internal server error" } });
      }
    }
    return;
  }

  // 404 for everything else
  sendJson(res, 404, { error: "Not found" });
});

// Fail fast: require token for non-localhost
const isLocalhost = HOST === "127.0.0.1" || HOST === "localhost" || HOST === "::1";
if (!isLocalhost && !AUTH_TOKEN) {
  console.error("[a2a-server] FATAL: A2A_SERVER_TOKEN is required when binding to non-localhost address");
  process.exit(1);
}

server.listen(PORT, HOST, () => {
  console.error(`[a2a-server] Claude Code A2A server listening on http://${HOST}:${PORT}`);
  console.error(`[a2a-server] Agent card: http://${HOST}:${PORT}/.well-known/agent-card.json`);
  if (!AUTH_TOKEN) {
    console.error("[a2a-server] WARNING: No A2A_SERVER_TOKEN set — any local process can invoke Claude Code");
  }
});
