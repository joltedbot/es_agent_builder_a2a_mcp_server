import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { A2AProvider } from "../providers/provider.js";
import { resolveAgent } from "./resolve-agent.js";

export function registerGetAgentCard(server: McpServer, providers: A2AProvider[]): void {
  server.tool(
    "get_agent_card",
    "Get the A2A agent card (capabilities, skills, metadata) for an agent",
    {
      agentId: z
        .string()
        .min(1)
        .max(259) // 128 + "/" + 128 + margin
        .describe("Agent ID (bare or compound: provider/agentId)"),
    },
    async ({ agentId }) => {
      const { provider, agentId: resolvedId } = resolveAgent(agentId, providers);
      const card = await provider.getAgentCard(resolvedId);
      return { content: [{ type: "text" as const, text: JSON.stringify(card, null, 2) }] };
    },
  );
}
