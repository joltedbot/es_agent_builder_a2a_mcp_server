import { randomUUID } from "crypto";
import { z } from "zod";
import { executeClaude } from "./claude-executor.js";

const MAX_CONCURRENT = parseInt(process.env.A2A_MAX_CONCURRENT ?? "2", 10);
let activeExecutions = 0;

const MessagePartSchema = z.object({
  kind: z.literal("text"),
  text: z.string().min(1).max(32768),
});

const MessageSchema = z.object({
  role: z.string(),
  messageId: z.string(),
  parts: z.array(MessagePartSchema).min(1),
});

const JsonRpcRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]),
  method: z.literal("message/send"),
  params: z.object({
    message: MessageSchema,
  }),
});

export interface A2AResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string };
}

function makeTaskResponse(requestId: string | number, text: string): A2AResponse {
  return {
    jsonrpc: "2.0",
    id: requestId,
    result: {
      kind: "task",
      id: randomUUID(),
      contextId: randomUUID(),
      status: {
        state: "completed",
        timestamp: new Date().toISOString(),
      },
      artifacts: [
        {
          artifactId: randomUUID(),
          name: "response",
          parts: [{ kind: "text", text }],
        },
      ],
    },
  };
}

function makeErrorResponse(
  requestId: string | number | null,
  code: number,
  message: string,
): A2AResponse {
  return {
    jsonrpc: "2.0",
    id: requestId ?? "unknown",
    error: { code, message },
  };
}

export async function handleMessage(body: string): Promise<A2AResponse> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return makeErrorResponse(null, -32700, "Parse error: invalid JSON");
  }

  const validation = JsonRpcRequestSchema.safeParse(parsed);
  if (!validation.success) {
    const id = (parsed as any)?.id ?? null;
    console.error(`[a2a-server] Validation failure: ${validation.error.message}`);
    return makeErrorResponse(id, -32600, "Invalid request");
  }

  const { id, params } = validation.data;
  const messageText = params.message.parts.map((p) => p.text).join("\n");

  console.error(`[a2a-server] Received message/send (id=${id})`);

  if (activeExecutions >= MAX_CONCURRENT) {
    return makeErrorResponse(id, -32000, "Agent is busy — too many concurrent requests");
  }

  activeExecutions++;
  try {
    const result = await executeClaude(messageText);
    return makeTaskResponse(id, result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown execution error";
    console.error(`[a2a-server] Execution error: ${msg}`);
    // Sanitize: don't leak internal error details to callers
    return makeErrorResponse(id, -32000, "Agent execution failed");
  } finally {
    activeExecutions--;
  }
}
