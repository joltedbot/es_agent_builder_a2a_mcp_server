import { randomUUID } from "crypto";
import type { A2AProvider } from "./provider.js";
import type { AgentInfo, AuthConfig } from "../types.js";
import { authedFetch } from "../util/http.js";

export class ElasticProvider implements A2AProvider {
  readonly name: string;
  private readonly baseUrl: string;
  private readonly auth: AuthConfig | undefined;

  constructor(name: string, baseUrl: string, auth?: AuthConfig) {
    this.name = name;
    this.baseUrl = baseUrl;
    this.auth = auth;
  }

  async listAgents(): Promise<AgentInfo[]> {
    const raw = await authedFetch(this.baseUrl, "/api/agent_builder/agents", this.auth);
    const obj = raw as any;
    const data = Array.isArray(raw)
      ? raw
      : Array.isArray(obj?.results)
        ? obj.results
        : Array.isArray(obj?.agents)
          ? obj.agents
          : null;
    if (!data) {
      throw new Error(
        `Unexpected response format from agent list endpoint: ${JSON.stringify(raw).slice(0, 200)}`,
      );
    }
    return data.map((a: any) => ({
      id: a.id ?? a.agentId,
      name: a.name,
      description: a.description,
      source: this.name,
    }));
  }

  async getAgentCard(agentId: string): Promise<unknown> {
    return authedFetch(this.baseUrl, `/api/agent_builder/a2a/${agentId}.json`, this.auth);
  }

  async sendMessage(agentId: string, message: string): Promise<unknown> {
    return authedFetch(this.baseUrl, `/api/agent_builder/a2a/${agentId}`, this.auth, {
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
  }
}
