# A2A Elastic MCP Server

An MCP server that connects Claude Code to Elastic Agent Builder agents via the [A2A (Agent-to-Agent) protocol](https://a2a-protocol.org/).

## Architecture

```
Claude Code ──MCP (stdio)──► a2a-elastic-mcp ──A2A v0.3.0 (HTTPS/JSON-RPC)──► Elastic Agent Builder
                              (Node.js)                                         (Kibana)
```

## Tools

| Tool | Description |
|------|-------------|
| `list_agents` | List all Agent Builder agents in the cluster |
| `get_agent_card` | Get an agent's A2A card (capabilities, skills, metadata) |
| `send_message` | Send a message to an agent via A2A and get a response |

## Prerequisites

- Node.js 18+
- An Elastic Cloud deployment with Agent Builder agents
- An Elastic API key with Agent Builder access

## Setup

1. Clone this repo and install dependencies:

```bash
npm install
npm run build
```

2. Create a `.env` file in the project root (use `.env.example` as a template):

```
KIBANA_URL=https://your-deployment.kb.elastic-cloud.com
ELASTIC_API_KEY=your-api-key
```

3. Open the project directory in Claude Code. The `.mcp.json` config auto-starts the server.

4. Verify with `/mcp` — you should see `a2a-elastic` listed.

## Usage

Once the MCP server is running, Claude Code can interact with Agent Builder agents:

```
> List the available A2A agents
> Get the agent card for dev_assistant
> Ask the dev_assistant agent to list the available indices
```

## Configuration

The `.mcp.json` file configures Claude Code to launch the server:

```json
{
  "mcpServers": {
    "a2a-elastic": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "KIBANA_URL": "${KIBANA_URL}",
        "ELASTIC_API_KEY": "${ELASTIC_API_KEY}"
      }
    }
  }
}
```

Both variables are read from your environment (set via `.env` or shell profile).

## Using in Other Projects

### Option A: User-level MCP config (recommended)

Register the server once and it's available in all Claude Code sessions:

```bash
claude mcp add --scope user a2a-elastic node /path/to/a2a-setup/dist/index.js
```

Then export `KIBANA_URL` and `ELASTIC_API_KEY` in your shell profile (`~/.zshrc` or `~/.zprofile`) so they're always available.

### Option B: Per-project `.mcp.json`

If the project doesn't have a `.mcp.json`, copy this project's `.mcp.json` into it. If one already exists, add the `a2a-elastic` server config to its `mcpServers` block:

```json
{
  "mcpServers": {
    "a2a-elastic": {
      "command": "node",
      "args": ["/path/to/a2a-setup/dist/index.js"],
      "env": {
        "KIBANA_URL": "${KIBANA_URL}",
        "ELASTIC_API_KEY": "${ELASTIC_API_KEY}"
      }
    }
  }
}
```

Replace `/path/to/a2a-setup` with the absolute path to where you cloned this repo.

## A2A Protocol Details

- **Protocol version:** 0.3.0
- **Agent card endpoint:** `GET /api/agent_builder/a2a/{agentId}.json`
- **Task endpoint:** `POST /api/agent_builder/a2a/{agentId}`
- **JSON-RPC method:** `message/send`
- **Streaming:** Not supported (Agent Builder limitation)
- **Part format:** Uses `kind: "text"` discriminator (v0.3.0)

## Future

- Gemini CLI — has native A2A support, connects directly to the same Agent Builder endpoints
- OpenCode — can use this same MCP server or a similar bridge
