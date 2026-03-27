import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { ElasticProvider } from "./providers/elastic.js";
import { StandardA2AProvider } from "./providers/standard-a2a.js";
import { registerListAgents } from "./tools/list-agents.js";
import { registerGetAgentCard } from "./tools/get-agent-card.js";
import { registerSendMessage } from "./tools/send-message.js";
import type { A2AProvider } from "./providers/provider.js";
import type { ProviderConfig } from "./types.js";

function createProvider(config: ProviderConfig): A2AProvider {
  switch (config.type) {
    case "elastic":
      return new ElasticProvider(config.name, config.baseUrl, config.auth);
    case "a2a":
      return new StandardA2AProvider(config.name, config.baseUrl, config.auth);
    default:
      throw new Error(`Unknown provider type: ${(config as any).type}`);
  }
}

const configs = loadConfig();
const providers = configs.map(createProvider);

if (providers.length === 0) {
  console.error("No providers configured");
  process.exit(1);
}

const server = new McpServer({
  name: "a2a-bridge",
  version: "2.0.0",
});

registerListAgents(server, providers);
registerGetAgentCard(server, providers);
registerSendMessage(server, providers);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
