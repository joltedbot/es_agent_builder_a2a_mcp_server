---
kind: remote
name: claude-code
agent_card_url: http://localhost:3008/.well-known/agent-card.json
---

Claude Code Agent — AI coding assistant accessible via A2A protocol.

## Setup

1. Start the A2A server: `cd /path/to/a2a-bridge && npm run serve`
2. Copy this file to `.gemini/agents/claude-code.md` in your project
3. In Gemini CLI, use `/agents list` to verify Claude Code appears
4. Ask Gemini to delegate a task to Claude Code

## Usage

From Gemini CLI:
```
> Ask the Claude Code agent to review the authentication module
> Have Claude Code fix the failing test in src/utils.ts
> Ask Claude Code to explain the routing architecture
```
