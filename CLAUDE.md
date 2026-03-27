# CLAUDE.md (Project-Specific)

Project: A2A Bridge — multi-provider MCP server bridging AI coding agents to A2A-compliant agents (Elastic Agent Builder, Gemini CLI, arbitrary A2A servers).

## Quick Start

```bash
npm install
npm run build
npm start
```

**Configure credentials (`.env` — single source of truth for all secrets):**

```bash
KIBANA_URL=https://your-deployment.kb.elastic-cloud.com
ELASTIC_API_KEY=your-api-key
```

**Optional multi-provider setup:** Create `agents.json` (see `agents.json.example`). Without it, the server auto-creates an Elastic provider from `.env`.

**Verify:** Open in Claude Code, use `/mcp` to confirm `a2a-bridge` is listed.

## Project Structure

```
src/
  index.ts              — Entry point: loads config, creates providers, registers tools, starts stdio
  config.ts             — Config loading (agents.json with .env fallback for backward compat)
  types.ts              — Shared interfaces: AgentInfo, ProviderConfig, AuthConfig
  providers/
    provider.ts         — A2AProvider interface
    elastic.ts          — Elastic/Kibana provider (Kibana-specific endpoints and auth)
    standard-a2a.ts     — Standard A2A provider (well-known discovery, generic JSON-RPC)
  tools/
    list-agents.ts      — list_agents tool (aggregates across all providers)
    get-agent-card.ts   — get_agent_card tool (routes by compound ID)
    send-message.ts     — send_message tool (routes by compound ID)
    resolve-agent.ts    — Compound ID parsing and provider routing
  util/
    http.ts             — authedFetch with configurable auth, timeout, error handling
agents.json.example     — Provider registry template
.env.example            — Credential template
.mcp.json               — Claude Code MCP server config
docs/
  gemini-cli-setup.md   — Gemini CLI integration guide
  opencode-setup.md     — OpenCode integration guide
scripts/
  discover-a2a.sh       — Shell script to explore Elastic A2A endpoints
```

## Key Technical Details

### Provider Architecture

Two provider types implementing the `A2AProvider` interface:

- **`ElasticProvider`** — Kibana-specific: `/api/agent_builder/agents` for listing, `/api/agent_builder/a2a/{id}` for messaging. Requires `ApiKey` auth + `kbn-xsrf` header.
- **`StandardA2AProvider`** — Generic A2A: `/.well-known/agent-card.json` for discovery, `POST {baseUrl}` for JSON-RPC messaging. Works with any A2A-compliant agent.

### Agent ID Routing

Tools accept compound IDs: `provider/agentId` (e.g., `elastic/dev_assistant`). Bare IDs auto-resolve to the sole provider when unambiguous. The `list_agents` output includes compound IDs.

### Configuration

- **`agents.json`** — Provider registry. References env var names via `${VAR}` interpolation. Safe to commit (no secrets).
- **`.env`** — All credentials. Loaded via Node's `--env-file` flag. Gitignored.
- **Backward compat**: No `agents.json` + `KIBANA_URL`/`ELASTIC_API_KEY` env vars = auto-generated Elastic provider.

### MCP Tools

1. **list_agents** — Aggregates agents from all providers. Returns compound IDs with `source` field.
2. **get_agent_card** — Routes to correct provider via compound ID. Elastic: fetches from Kibana. Standard: fetches `/.well-known/agent-card.json`.
3. **send_message** — Routes to correct provider. Both use JSON-RPC 2.0 `message/send` with `kind: "text"` parts.

### Authentication

Per-provider auth configured in `agents.json`:
- `api-key` — `Authorization: ApiKey {value}` (Elastic)
- `bearer` — `Authorization: Bearer {value}`
- `header` — Custom static headers
- `none` — No auth (local agents)

### Security Hardening

- **HTTPS enforcement:** Required for all non-localhost URLs
- **Agent ID validation:** `[a-zA-Z0-9_.-]{1,128}` per segment (prevents path traversal)
- **Request timeout:** 30s abort on all requests
- **Message length:** 32KB cap
- **Error sanitization:** Internal details to stderr only; MCP clients see generic errors
- **Credential isolation:** `.env` only — never in `agents.json`, `.mcp.json`, or committed files

### Kibana Instance

**Current deployment:** https://hybrid-search-demo-207a2a.kb.ca-central-1.aws.elastic-cloud.com (v9.3.0)

## Development

```bash
npm run build    # Compiles src/ → dist/
npx tsc --watch  # File watching
```

**Code style:** ESM modules, TypeScript 5.7+, zod for runtime validation.

## Testing

Manual testing via Claude Code:
- `/mcp` to verify server is running
- "List the available A2A agents" — should show compound IDs with source
- "Get the agent card for elastic/[agentId]"
- "Ask the elastic/[agentId] agent to [task]"

## Debugging

**Server not starting?**
- Check `.env` file exists with required vars (or `agents.json` is valid)
- Verify Kibana is reachable: `curl -H "Authorization: ApiKey $ELASTIC_API_KEY" "$KIBANA_URL/api/status"`

**Tool calls failing?**
- Verify `dist/` has compiled JS: `ls dist/**/*.js`
- Check Claude Code console for error messages

**Provider errors?**
- "Provider not found" — check `agents.json` provider names match the compound ID prefix
- "Ambiguous agent ID" — use compound format `provider/agentId`
- "Environment variable not set" — check `.env` has the var referenced in `agents.json`

**Elastic-specific issues?**
- Use `scripts/discover-a2a.sh` to test endpoints directly
- Test connector in Kibana: Stack Management > Connectors > Test

## Reference

- [A2A Protocol Specification](https://a2a-protocol.org/)
- [Elastic Agent Builder Docs](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/)
- [MCP Specification](https://modelcontextprotocol.io/)
