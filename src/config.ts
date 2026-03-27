import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import type { ProviderConfig } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");

const SAFE_HEADER_NAME = /^[a-zA-Z0-9\-]+$/;
const NO_CRLF = /^[^\r\n]+$/;
const RESERVED_HEADERS = new Set(["authorization", "host", "content-length"]);

const HeadersSchema = z
  .record(z.string().regex(NO_CRLF, "Header values must not contain CR/LF"))
  .refine(
    (headers) =>
      Object.keys(headers).every(
        (k) => SAFE_HEADER_NAME.test(k) && !RESERVED_HEADERS.has(k.toLowerCase()),
      ),
    { message: "Invalid or reserved header name (Authorization, Host, Content-Length are set automatically)" },
  );

const AuthConfigSchema = z.object({
  scheme: z.enum(["api-key", "bearer", "header", "none"]),
  envVar: z.string().optional(),
  headers: HeadersSchema.optional(),
});

const ProviderConfigSchema = z.object({
  type: z.enum(["elastic", "a2a"]),
  name: z.string().min(1).max(64),
  baseUrl: z.string().min(1),
  auth: AuthConfigSchema.optional(),
});

const AgentsConfigSchema = z.object({
  providers: z.array(ProviderConfigSchema).min(1),
});

function interpolateEnvVars(value: string): string {
  return value.replace(/\$\{([^}]+)\}/g, (_, varName) => {
    const envVal = process.env[varName];
    if (!envVal) {
      throw new Error(`Environment variable ${varName} referenced in agents.json is not set`);
    }
    return envVal;
  });
}

function resolveConfig(config: ProviderConfig): ProviderConfig {
  return {
    ...config,
    baseUrl: interpolateEnvVars(config.baseUrl),
  };
}

function validateAuthEnvVars(config: ProviderConfig): void {
  const auth = config.auth;
  if (!auth || auth.scheme === "none" || auth.scheme === "header") return;
  if (auth.envVar && !process.env[auth.envVar]) {
    throw new Error(
      `Provider "${config.name}": auth requires environment variable ${auth.envVar} but it is not set`,
    );
  }
}

const BLOCKED_HOSTS = new Set([
  "169.254.169.254",     // AWS/GCP IMDS
  "169.254.170.2",       // AWS ECS task metadata
  "fd00:ec2::254",       // AWS IPv6 IMDS
  "metadata.google.internal",
  "metadata.internal",
  "100.100.100.200",     // Alibaba IMDS
  "0.0.0.0",             // Maps to localhost on many systems
]);

function validateUrl(baseUrl: string, providerName: string): void {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error(`Provider "${providerName}": baseUrl is not a valid URL`);
  }
  if (BLOCKED_HOSTS.has(parsed.hostname)) {
    throw new Error(`Provider "${providerName}": blocked SSRF target "${parsed.hostname}"`);
  }
  const isLocal =
    parsed.hostname === "localhost" ||
    parsed.hostname === "127.0.0.1" ||
    parsed.hostname === "[::1]";
  if (parsed.protocol !== "https:" && !isLocal) {
    throw new Error(`Provider "${providerName}": HTTPS required for non-localhost URLs`);
  }
}

export function loadConfig(): ProviderConfig[] {
  const configPath = join(PROJECT_ROOT, "agents.json");

  if (existsSync(configPath)) {
    const raw = readFileSync(configPath, "utf-8");
    const parsed = AgentsConfigSchema.parse(JSON.parse(raw));
    const resolved = parsed.providers.map(resolveConfig);
    for (const p of resolved) {
      validateUrl(p.baseUrl, p.name);
      validateAuthEnvVars(p);
    }
    return resolved;
  }

  // Backward compatibility: auto-generate Elastic provider from env vars
  const kibanaUrl = process.env.KIBANA_URL;
  const apiKey = process.env.ELASTIC_API_KEY;

  if (!kibanaUrl || !apiKey) {
    console.error(
      "No agents.json found and KIBANA_URL/ELASTIC_API_KEY not set. " +
        "Provide either agents.json or both environment variables.",
    );
    process.exit(1);
  }

  validateUrl(kibanaUrl, "elastic");

  return [
    {
      type: "elastic",
      name: "elastic",
      baseUrl: kibanaUrl,
      auth: {
        scheme: "api-key",
        envVar: "ELASTIC_API_KEY",
        headers: { "kbn-xsrf": "true" },
      },
    },
  ];
}
