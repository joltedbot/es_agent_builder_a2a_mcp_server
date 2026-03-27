# A2A Bridge — Bidirectional Multi-Agent Communication

Two companion servers enabling full bidirectional A2A communication between AI coding agents:

- **a2a-bridge** (MCP server) — Outbound: Claude Code/Gemini/OpenCode reach A2A agents
- **a2a-server** (HTTP server) — Inbound: A2A agents reach Claude Code

## Architecture

```
                    Outbound (MCP bridge)
Claude Code ─┐
Gemini CLI  ─┤─ MCP (stdio) ─► a2a-bridge ─► Elastic Agent Builder
OpenCode    ─┘                              ─► Gemini CLI A2A Server
                                            ─► Any standard A2A agent

                    Inbound (A2A server)
Gemini CLI  ──A2A──► a2a-server (HTTP :3008) ──subprocess──► claude -p
Other agents         /.well-known/agent-card.json
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

### Initial Setup (One-Time)

1. Clone and install:

```bash
git clone <repo-url>
cd native-api
npm install
npm run build
```

2. Create a `.env` file (sole source of truth for all credentials):

```bash
# For Elastic provider
KIBANA_URL=https://your-deployment.kb.elastic-cloud.com
ELASTIC_API_KEY=your-api-key

# Optional: For Gemini or other A2A servers
# MY_AGENT_TOKEN=your-token-here
```

3. (Optional) Create `agents.json` for multi-provider setup:

```bash
cp agents.json.example agents.json
# Edit agents.json to add your providers
```

Without `agents.json`, the system auto-creates an Elastic provider from `.env` variables.

### Running Bidirectional A2A (Three Terminals)

Open three terminal windows and run these commands in parallel:

**Terminal 1** — Claude Code A2A Server (receives messages from Gemini):

```bash
npm run serve
# Output: "A2A server listening on http://127.0.0.1:3008"
```

**Terminal 2** — Gemini CLI A2A Server (receives messages from Claude):

```bash
npm run gemini-a2a
# Output: "A2A server listening on port 41965"
```

**Terminal 3** — Claude Code or Gemini CLI for testing:

```bash
# In Claude Code, use the MCP bridge:
# List the available A2A agents
# Ask the gemini-local/default agent to [task]

# Or from Gemini CLI:
# /agents list
# /ask claude-code "do something"
```

### Claude Code Integration

Open the project in Claude Code. The `.mcp.json` auto-starts the MCP bridge:

1. Verify the server: `/mcp` — you should see `a2a-bridge` listed
2. Try: "List the available A2A agents" → should show agents including `gemini-local/default`
3. Try: "Ask the gemini-local/default agent to list files in the current directory"

### Gemini CLI Integration

Configure Gemini to discover Claude Code as an A2A agent:

1. Copy the agent config:
   ```bash
   mkdir -p ~/.gemini/agents
   cp examples/gemini-agents/claude-code.md ~/.gemini/agents/
   ```

2. Verify: `/agents list` in Gemini CLI should show `claude-code`

3. Try: `/ask claude-code "list my open files"`

## Usage

### Outbound (MCP bridge — `npm start`)

```
> List the available A2A agents
> Get the agent card for elastic/dev_assistant
> Ask the elastic/dev_assistant agent to list the available indices
> Send a message to gemini-local/default asking it to summarize this file
```

### Inbound (A2A server — `npm run serve`)

Start the A2A server to let other agents talk to Claude Code:

```bash
npm run serve
```

This exposes Claude Code at `http://localhost:3008` with a standard A2A agent card. Gemini CLI (or any A2A client) can discover and message it. See [Bidirectional Demo](examples/demo-bidirectional.md) for a full walkthrough.

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
