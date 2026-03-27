import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { A2AProvider } from "../providers/provider.js";
import { resolveAgent } from "./resolve-agent.js";

export function registerSendMessage(server: McpServer, providers: A2AProvider[]): void {
  server.tool(
    "send_message",
    "Send a message to an agent via the A2A protocol and get a response",
    {
      agentId: z
        .string()
        .min(1)
        .max(259)
        .describe("Agent ID (bare or compound: provider/agentId)"),
      message: z
        .string()
        .min(1)
        .max(32768)
        .describe("The message to send to the agent"),
    },
    async ({ agentId, message }) => {
      const { provider, agentId: resolvedId } = resolveAgent(agentId, providers);
      const result = await provider.sendMessage(resolvedId, message);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
