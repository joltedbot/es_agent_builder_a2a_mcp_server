export interface AgentInfo {
  id: string;
  name: string;
  description?: string;
  source: string;
}

export interface ProviderConfig {
  type: "elastic" | "a2a";
  name: string;
  baseUrl: string;
  auth?: AuthConfig;
}

export interface AuthConfig {
  scheme: "api-key" | "bearer" | "header" | "none";
  envVar?: string;
  headers?: Record<string, string>;
}
