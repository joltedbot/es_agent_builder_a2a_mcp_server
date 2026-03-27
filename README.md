# A2A Bridge — Multi-Agent MCP Server

An MCP server that bridges AI coding agents (Claude Code, Gemini CLI, OpenCode) to any [A2A (Agent-to-Agent)](https://a2a-protocol.org/) compliant agent, including Elastic Agent Builder.

## Architecture

```
Claude Code ─┐
Gemini CLI  ─┤─ MCP (stdio) ─► a2a-bridge ─► Elastic Agent Builder (Kibana A2A)
OpenCode    ─┘    (Node.js)                 ─► Gemini CLI A2A Server
                                            ─► Any standard A2A agent
```

## Tools

| Tool | Description |
|------|-------------|
| `list_agents` | List all agents across all configured providers |
| `get_agent_card` | Get an agent's A2A card (capabilities, skills, metadata) |
| `send_message` | Send a message to an agent via A2A and get a response |

Agent IDs use compound format: `provider/agentId` (e.g., `elastic/dev_assistant`, `gemini-local/default`). Bare IDs auto-resolve when only one provider is configured.

## Prerequisites

- Node.js 18+
- At least one A2A-compatible agent endpoint (Elastic Agent Builder, Gemini CLI A2A server, etc.)

## Quick Start

1. Install and build:

```bash
npm install
npm run build
```

2. Create a `.env` file (sole source of truth for all credentials):

```bash
# Required for Elastic provider
KIBANA_URL=https://your-deployment.kb.elastic-cloud.com
ELASTIC_API_KEY=your-api-key

# Optional: tokens for other A2A agents
# MY_AGENT_TOKEN=your-token-here
```

3. (Optional) Create `agents.json` for multi-provider setup — see [Configuration](#configuration).

4. Open the project in Claude Code. The `.mcp.json` auto-starts the server.

5. Verify with `/mcp` — you should see `a2a-bridge` listed.

## Usage

```
> List the available A2A agents
> Get the agent card for elastic/dev_assistant
> Ask the elastic/dev_assistant agent to list the available indices
> Send a message to gemini-local/default asking it to summarize this file
```

## Configuration

### Credentials (`.env`)

`.env` is the **single source of truth** for all secrets. Never put credentials in `agents.json` or `.mcp.json`.

```bash
KIBANA_URL=https://your-deployment.kb.elastic-cloud.com
ELASTIC_API_KEY=your-api-key
MY_AGENT_TOKEN=your-token-here
```

### Provider Registry (`agents.json`)

`agents.json` defines which A2A providers to connect to. It references env var names for secrets — never raw values. This file is safe to commit.

```json
{
  "providers": [
    {
      "type": "elastic",
      "name": "elastic",
      "baseUrl": "${KIBANA_URL}",
      "auth": {
        "scheme": "api-key",
        "envVar": "ELASTIC_API_KEY",
        "headers": { "kbn-xsrf": "true" }
      }
    },
    {
      "type": "a2a",
      "name": "gemini-local",
      "baseUrl": "http://localhost:41965",
      "auth": { "scheme": "none" }
    },
    {
      "type": "a2a",
      "name": "my-remote-agent",
      "baseUrl": "https://agent.example.com",
      "auth": {
        "scheme": "bearer",
        "envVar": "MY_AGENT_TOKEN"
      }
    }
  ]
}
```

**Provider types:**
- `elastic` — Elastic Agent Builder (Kibana-specific endpoints and auth)
- `a2a` — Standard A2A agent (well-known discovery at `/.well-known/agent-card.json`)

**Auth schemes:**
- `api-key` — `Authorization: ApiKey <value>` header
- `bearer` — `Authorization: Bearer <value>` header
- `header` — Custom static headers only
- `none` — No authentication (local agents)

### Backward Compatibility

If no `agents.json` exists, the server auto-creates an Elastic provider from `KIBANA_URL` and `ELASTIC_API_KEY` environment variables. Existing setups work without changes.

### MCP Config (`.mcp.json`)

```json
{
  "mcpServers": {
    "a2a-bridge": {
      "command": "node",
      "args": ["--env-file=.env", "dist/index.js"]
    }
  }
}
```

## Using in Other Clients

See the `docs/` directory for client-specific setup guides:

- [Gemini CLI Setup](docs/gemini-cli-setup.md)
- [OpenCode Setup](docs/opencode-setup.md)

### User-level MCP config (Claude Code)

Register the server once for all Claude Code sessions:

```bash
claude mcp add --scope user a2a-bridge node -- --env-file=/path/to/project/.env /path/to/project/dist/index.js
```

## A2A Protocol Details

- **Standard A2A**: Discovery via `/.well-known/agent-card.json`, messaging via `POST` with JSON-RPC 2.0 `message/send`
- **Elastic A2A**: Agent card at `/api/agent_builder/a2a/{id}.json`, messaging at `/api/agent_builder/a2a/{id}`
- **Part format:** `kind: "text"` discriminator (A2A v0.3+)
- **Streaming:** Not currently supported

## Security

- `.env` is the sole credential store (gitignored, 600 permissions)
- HTTPS enforced for all non-localhost URLs
- Agent ID validation: `[a-zA-Z0-9_.-]{1,128}` per segment
- 30s request timeout, 32KB message size limit
- Error sanitization: internal details logged to stderr only
