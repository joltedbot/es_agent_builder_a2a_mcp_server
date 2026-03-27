# Gemini CLI Setup

Gemini CLI can interact with A2A agents in two ways:

1. **As an MCP client** — use this MCP server to talk to Elastic Agent Builder and other A2A agents
2. **As a native A2A client** — connect directly to A2A agents (bypasses MCP entirely)

## Option 1: Using a2a-bridge as MCP Server

Add to your `.gemini/settings.json` (project or `~/.gemini/settings.json` for global):

```json
{
  "mcpServers": {
    "a2a-bridge": {
      "command": "node",
      "args": ["--env-file=/path/to/project/.env", "/path/to/project/dist/index.js"],
      "cwd": "/path/to/project"
    }
  }
}
```

Replace `/path/to/project` with the absolute path to this repo's `native-api` directory.

Gemini CLI will auto-discover the `list_agents`, `get_agent_card`, and `send_message` tools.

## Option 2: Native A2A Client (Direct Connection)

Gemini CLI has built-in A2A client support. To connect directly to an Elastic Agent Builder agent:

Create `.gemini/agents/elastic-agent.md` in your project:

```yaml
---
kind: remote
agent_card_url: https://your-deployment.kb.elastic-cloud.com/api/agent_builder/a2a/YOUR_AGENT_ID.json
---
Connect to an Elastic Agent Builder agent directly via A2A.
```

Note: Native A2A connections require the remote agent to serve a standard agent card. Elastic Agent Builder endpoints require API key authentication which may need additional configuration.

## Bidirectional Communication

### Claude Code → Gemini CLI

If Gemini CLI runs as an A2A server (via `@google/gemini-cli-a2a-server`), add it as a standard A2A provider in `agents.json`:

```json
{
  "type": "a2a",
  "name": "gemini-local",
  "baseUrl": "http://localhost:41965",
  "auth": { "scheme": "none" }
}
```

### Gemini CLI → Claude Code (via A2A Server)

Start the A2A inbound server to expose Claude Code as an A2A agent:

```bash
npm run serve
```

This starts an HTTP server at `http://localhost:3008` with a standard A2A agent card.

Create `.gemini/agents/claude-code.md` in your project:

```yaml
---
kind: remote
agent_card_url: http://localhost:3008/.well-known/agent-card.json
---
Claude Code Agent — AI coding assistant accessible via A2A.
```

Gemini CLI will discover Claude Code and can send it tasks directly:

```
> Ask the Claude Code agent to review the authentication module
```

See `examples/gemini-agents/claude-code.md` for a ready-to-use config, and `examples/demo-bidirectional.md` for a full walkthrough.
