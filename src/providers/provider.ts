import type { AgentInfo } from "../types.js";

export interface A2AProvider {
  readonly name: string;
  listAgents(): Promise<AgentInfo[]>;
  getAgentCard(agentId: string): Promise<unknown>;
  sendMessage(agentId: string, message: string): Promise<unknown>;
}
