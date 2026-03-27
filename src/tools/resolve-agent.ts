import type { A2AProvider } from "../providers/provider.js";

export interface ResolvedAgent {
  provider: A2AProvider;
  agentId: string;
}

const SEGMENT_PATTERN = /^[a-zA-Z0-9_.-]{1,128}$/;

export function resolveAgent(input: string, providers: A2AProvider[]): ResolvedAgent {
  if (providers.length === 0) throw new Error("No providers configured");

  const slashIdx = input.indexOf("/");

  if (slashIdx !== -1) {
    // Compound ID: "provider/agentId"
    const providerName = input.slice(0, slashIdx);
    const agentId = input.slice(slashIdx + 1);
    if (!SEGMENT_PATTERN.test(providerName)) {
      throw new Error(`Invalid provider name: ${providerName}`);
    }
    if (!SEGMENT_PATTERN.test(agentId)) {
      throw new Error(`Invalid agent ID: ${agentId}`);
    }
    const provider = providers.find((p) => p.name === providerName);
    if (!provider) {
      throw new Error(
        `Provider "${providerName}" not found. Available: ${providers.map((p) => p.name).join(", ")}`,
      );
    }
    return { provider, agentId };
  }

  // Bare ID: resolve to sole provider if unambiguous
  if (!SEGMENT_PATTERN.test(input)) {
    throw new Error(`Invalid agent ID format: ${input}`);
  }

  // If only one provider, use it
  if (providers.length === 1) {
    return { provider: providers[0], agentId: input };
  }

  // Multiple providers: ambiguous bare ID
  throw new Error(
    `Ambiguous agent ID "${input}". Use compound format: provider/agentId. ` +
      `Available providers: ${providers.map((p) => p.name).join(", ")}`,
  );
}
