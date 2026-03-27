import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { A2AProvider } from "../providers/provider.js";

export function registerListAgents(server: McpServer, providers: A2AProvider[]): void {
  server.tool(
    "list_agents",
    "List all available agents across all configured providers",
    {},
    async () => {
      const results = await Promise.allSettled(providers.map((p) => p.listAgents()));
      const agents = results.flatMap((r, i) => {
        if (r.status === "fulfilled") {
          return r.value.map((a) => ({
            ...a,
            id: `${providers[i].name}/${a.id}`,
          }));
        }
        console.error(`Provider "${providers[i].name}" failed to list agents:`, r.reason);
        return [];
      });
      return { content: [{ type: "text" as const, text: JSON.stringify(agents, null, 2) }] };
    },
  );
}
