import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { randomUUID } from "crypto";

const KIBANA_URL = process.env.KIBANA_URL;
const API_KEY = process.env.ELASTIC_API_KEY;

if (!KIBANA_URL || !API_KEY) {
  console.error("KIBANA_URL and ELASTIC_API_KEY environment variables are required");
  process.exit(1);
}

try {
  const parsed = new URL(KIBANA_URL);
  if (parsed.protocol !== "https:") {
    console.error("KIBANA_URL must use HTTPS");
    process.exit(1);
  }
} catch {
  console.error("KIBANA_URL is not a valid URL");
  process.exit(1);
}

const AGENT_ID_PATTERN = /^[a-zA-Z0-9_.-]{1,128}$/;

const headers: Record<string, string> = {
  "Authorization": `ApiKey ${API_KEY}`,
  "kbn-xsrf": "true",
  "Content-Type": "application/json",
};

async function kibanaFetch(path: string, options?: RequestInit): Promise<unknown> {
  const url = `${KIBANA_URL}${path}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(30_000),
    ...options,
    headers: { ...headers, ...options?.headers },
  });
  const body = await res.text();
  if (!res.ok) {
    console.error(`Kibana error ${res.status} for ${path}: ${body}`);
    throw new Error(`Upstream request failed with status ${res.status}`);
  }
  try {
    return JSON.parse(body);
  } catch {
    console.error(`Non-JSON response from Kibana (${res.status}): ${body.slice(0, 200)}`);
    throw new Error("Received non-JSON response from upstream");
  }
}

const server = new McpServer({
  name: "a2a-elastic",
  version: "1.0.0",
});

// Tool 1: List all Agent Builder agents
server.tool(
  "list_agents",
  "List all available Agent Builder agents in the Elastic cluster",
  {},
  async () => {
    const data = await kibanaFetch("/api/agent_builder/agents");
    if (!Array.isArray(data)) {
      throw new Error("Unexpected response format from agent list endpoint");
    }
    const agents = data.map((a: any) => ({
      id: a.id ?? a.agentId,
      name: a.name,
      description: a.description,
    }));
    return { content: [{ type: "text", text: JSON.stringify(agents, null, 2) }] };
  }
);

// Tool 2: Get an agent's A2A agent card
server.tool(
  "get_agent_card",
  "Get the A2A agent card (capabilities, skills, metadata) for an Agent Builder agent",
  { agentId: z.string().regex(AGENT_ID_PATTERN, "Invalid agent ID format").describe("The Agent Builder agent ID") },
  async ({ agentId }) => {
    const card = await kibanaFetch(`/api/agent_builder/a2a/${agentId}.json`);
    return { content: [{ type: "text", text: JSON.stringify(card, null, 2) }] };
  }
);

// Tool 3: Send a message to an agent via A2A
server.tool(
  "send_message",
  "Send a message to an Agent Builder agent via the A2A protocol and get a response",
  {
    agentId: z.string().regex(AGENT_ID_PATTERN, "Invalid agent ID format").describe("The Agent Builder agent ID"),
    message: z.string().min(1).max(32768).describe("The message to send to the agent"),
  },
  async ({ agentId, message }) => {
    const result = await kibanaFetch(`/api/agent_builder/a2a/${agentId}`, {
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "message/send",
        id: randomUUID(),
        params: {
          message: {
            role: "user",
            messageId: randomUUID(),
            parts: [{ kind: "text", text: message }],
          },
        },
      }),
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
