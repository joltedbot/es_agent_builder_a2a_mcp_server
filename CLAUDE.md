# CLAUDE.md (Project-Specific)

Project: A2A Elastic MCP Server — bridges Claude Code to Elastic Agent Builder agents via A2A protocol v0.3.0.

## Quick Start

**Build and start the server:**

```bash
npm install
npm run build
npm start
```

**Configure environment (`.env` file in project root):**

```bash
KIBANA_URL=https://your-deployment.kb.elastic-cloud.com
ELASTIC_API_KEY=your-api-key
```

Template: `.env.example`. The `.env` file is the single source of truth for credentials (gitignored, 600 perms).

**Verify the server:**

Open the project in Claude Code. The `.mcp.json` auto-starts the server. Use `/mcp` to verify `a2a-elastic` is listed.

## Project Structure

```
src/
  index.ts          — Main MCP server (3 tools: list_agents, get_agent_card, send_message)
package.json        — Dependencies, build/start scripts
tsconfig.json       — TypeScript config
.mcp.json           — Claude Code MCP server config (auto-start, refs ${KIBANA_URL} and ${ELASTIC_API_KEY})
.env                — Environment variables (KIBANA_URL, ELASTIC_API_KEY) — gitignored
.env.example        — Template for .env (committable)
docs/               — Implementation specs and plans
scripts/
  discover-a2a.sh   — Shell script to explore A2A endpoints
```

## Key Technical Details

### A2A Protocol (v0.3.0)

- **Agent card endpoint:** `GET /api/agent_builder/a2a/{agentId}.json` — fetch agent capabilities
- **Task endpoint:** `POST /api/agent_builder/a2a/{agentId}` — send messages, receive responses
- **JSON-RPC method:** `message/send` (not `tasks/send`)
- **Message part format:** Uses `kind: "text"` discriminator (not `type: "text"`)
- **Streaming:** Not supported by Agent Builder

### MCP Tools

1. **list_agents** — GET `/api/agent_builder/agents`, returns array of agents with id, name, description
2. **get_agent_card** — GET `/api/agent_builder/a2a/{agentId}.json`, returns agent capabilities/skills
3. **send_message** — POST `/api/agent_builder/a2a/{agentId}` with JSON-RPC payload, returns agent response

### Authentication

All requests require:
- `Authorization: ApiKey {ELASTIC_API_KEY}` header
- `kbn-xsrf: true` header (Kibana CSRF protection)

### Security Hardening

- **Agent ID validation:** Regex `[a-zA-Z0-9_.-]{1,128}` prevents path traversal
- **HTTPS enforcement:** Rejects non-HTTPS `KIBANA_URL` at startup
- **Request timeout:** 30s abort on all Kibana API calls
- **Message length:** Capped at 32KB
- **Error sanitization:** Internal errors logged to stderr only; MCP clients see generic messages

### Kibana Instance

**Current deployment:** https://hybrid-search-demo-207a2a.kb.ca-central-1.aws.elastic-cloud.com (v9.3.0)

## Development

**TypeScript compilation:**

```bash
npm run build    # Compiles src/ → dist/
```

**File watching (if needed):**

```bash
npx tsc --watch
```

**Code style:** ESM modules, TypeScript 5.7+, zod for runtime validation.

## Testing

Manual testing via Claude Code:
- Use `/mcp` to verify server is running
- Try: "List the available A2A agents"
- Try: "Get the agent card for [agentId]"
- Try: "Ask the [agentId] agent to [task]"

## Future Work

- **Gemini CLI** — has native A2A support, connects to same Agent Builder endpoints
- **OpenCode** — can use this MCP server or similar bridge

## Debugging

**Server not starting?**
- Check `.env` file exists with `KIBANA_URL` and `ELASTIC_API_KEY`
- Verify Kibana is reachable: `curl -H "Authorization: ApiKey $ELASTIC_API_KEY" "$KIBANA_URL/api/status"`

**Tool calls failing?**
- Verify compiled JavaScript exists in `dist/`
- Check Claude Code console for error messages

**Agent returns "Connection refused" or inference errors?**
- This is a Kibana connector issue, not an A2A/MCP issue
- Test the connector in Kibana: Stack Management > Connectors > Test
- Check inference endpoint: `GET _inference/_all` in Dev Tools
- The managed `.gp-llm-v2-chat_completion` endpoint only supports streaming — Agent Builder agents need a compatible connector

**A2A endpoint issues?**
- Use `scripts/discover-a2a.sh` to test endpoints directly
- Verify agent ID is correct (use `list_agents` tool)
- Check API key has Agent Builder permissions

## Reference

- [A2A Protocol Specification](https://a2a-protocol.org/)
- [Elastic Agent Builder Docs](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/)
- [MCP Specification](https://modelcontextprotocol.io/)
