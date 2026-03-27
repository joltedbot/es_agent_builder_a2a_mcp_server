# Bidirectional A2A Demo: Claude Code + Gemini CLI

This walkthrough demonstrates full bidirectional communication between Claude Code and Gemini CLI via the A2A protocol.

## Prerequisites

- Claude Code CLI installed and authenticated (`claude --version`)
- Gemini CLI installed and authenticated (`gemini --version`)
- This project built: `npm install && npm run build`
- `.env` configured with Elastic credentials (optional, for Elastic agents)

## Architecture

```
Direction 1: Claude Code --> Gemini CLI
  Claude Code --MCP--> a2a-bridge --A2A--> Gemini A2A Server

Direction 2: Gemini CLI --> Claude Code
  Gemini CLI --A2A--> a2a-server --subprocess--> claude -p
```

## Step 1: Start the Claude Code A2A Server

In terminal 1:
```bash
cd /path/to/a2a-bridge
npm run serve
```

Expected output:
```
[a2a-server] Claude Code A2A server listening on http://127.0.0.1:3008
[a2a-server] Agent card: http://127.0.0.1:3008/.well-known/agent-card.json
```

Verify:
```bash
curl http://localhost:3008/.well-known/agent-card.json
```

## Step 2: Start the Gemini CLI A2A Server (for Claude-to-Gemini direction)

In terminal 2, start Gemini CLI's A2A server:
```bash
npm run gemini-a2a
```

This starts on port 41965 (configured via `CODER_AGENT_PORT`).

> **Note:** `npx @google/gemini-cli-a2a-server` has a known bug where the symlink
> causes the `isMainModule` check to fail, so the server silently exits.
> The `npm run gemini-a2a` script works around this by invoking the `.mjs` file directly.

## Step 3: Configure Gemini CLI to Discover Claude Code

Copy the example agent config:
```bash
mkdir -p .gemini/agents
cp examples/gemini-agents/claude-code.md .gemini/agents/
```

In Gemini CLI, verify:
```
/agents list
```

Claude Code Agent should appear in the list.

## Step 4: Test Gemini --> Claude Code

In Gemini CLI:
```
> Ask the Claude Code agent to list the files in this project
```

Gemini will discover Claude Code via the agent card, send the request via A2A, and display Claude's response.

## Step 5: Test Claude Code --> Gemini

If you have the Gemini A2A server running (Step 2), add it to `agents.json`:
```json
{
  "providers": [
    {
      "type": "a2a",
      "name": "gemini-local",
      "baseUrl": "http://localhost:41965",
      "auth": { "scheme": "none" }
    }
  ]
}
```

Then in Claude Code:
```
> List the available A2A agents
> Send a message to gemini-local/default asking it to summarize this README
```

## Step 6: Full Round-Trip

You now have:
- Gemini asking Claude to do tasks (via A2A server)
- Claude asking Gemini to do tasks (via MCP bridge)

Both agents can delegate work to each other through standard A2A protocol.

## Troubleshooting

**Agent card not found?**
- Verify A2A server is running: `curl http://localhost:3008/health`
- Check Gemini agent config path: `.gemini/agents/claude-code.md`

**Claude execution timeout?**
- Increase timeout: `A2A_EXEC_TIMEOUT=300000` in `.env`
- Reduce max turns: modify `MAX_TURNS` in `src/a2a/claude-executor.ts`

**Authentication errors?**
- For localhost, no token needed
- For remote: set `A2A_SERVER_TOKEN` in `.env` and configure Gemini with matching bearer token
