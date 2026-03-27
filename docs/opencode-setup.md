# OpenCode Setup

OpenCode has native MCP client support and can use this server to interact with A2A agents.

## Configuration

Add to your OpenCode config file:

```json
{
  "mcp": {
    "a2a-bridge": {
      "type": "local",
      "command": ["node", "--env-file=/path/to/project/.env", "/path/to/project/dist/index.js"],
      "enabled": true
    }
  }
}
```

Replace `/path/to/project` with the absolute path to this repo's `native-api` directory.

OpenCode will auto-discover the `list_agents`, `get_agent_card`, and `send_message` tools.

## Usage

Once configured, you can interact with A2A agents through OpenCode:

```
> List the available A2A agents
> Send a message to elastic/dev_assistant asking about cluster health
```

## Bidirectional Communication

### OpenCode → A2A Agents

OpenCode uses this MCP server as a client to reach any A2A agent configured in `agents.json`. No additional setup needed.

### A2A Agents → OpenCode

OpenCode does not natively expose itself as an A2A server. A community wrapper (`a2a-opencode`) exists but failed security review due to critical dependency vulnerabilities (CVE-2026-22812, CVE-2026-22813), unauthenticated endpoints, and unsafe defaults. It is not recommended. The supported integration path is MCP-only (OpenCode as client).
