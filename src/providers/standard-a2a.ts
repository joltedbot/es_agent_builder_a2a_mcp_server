import { randomUUID } from "crypto";
import type { A2AProvider } from "./provider.js";
import type { AgentInfo, AuthConfig } from "../types.js";
import { authedFetch } from "../util/http.js";

export class StandardA2AProvider implements A2AProvider {
  readonly name: string;
  private readonly baseUrl: string;
  private readonly auth: AuthConfig | undefined;

  constructor(name: string, baseUrl: string, auth?: AuthConfig) {
    this.name = name;
    this.baseUrl = baseUrl;
    this.auth = auth;
  }

  async listAgents(): Promise<AgentInfo[]> {
    const card = (await this.fetchAgentCard()) as any;
    return [
      {
        id: "default",
        name: card?.name ?? this.name,
        description: card?.description,
        source: this.name,
      },
    ];
  }

  async getAgentCard(_agentId: string): Promise<unknown> {
    return this.fetchAgentCard();
  }

  async sendMessage(_agentId: string, message: string): Promise<unknown> {
    return authedFetch(this.baseUrl, "", this.auth, {
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

  private async fetchAgentCard(): Promise<unknown> {
    return authedFetch(this.baseUrl, "/.well-known/agent-card.json", this.auth);
  }
}
