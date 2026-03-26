#!/usr/bin/env bash
# Probes Kibana for Agent Builder A2A endpoint paths
# Usage: ./scripts/discover-a2a.sh <API_KEY> [AGENT_ID]

set -euo pipefail

API_KEY="${1:?Usage: $0 <API_KEY> [AGENT_ID]}"
AGENT_ID="${2:-}"
BASE="https://hybrid-search-demo-207a2a.kb.ca-central-1.aws.elastic-cloud.com"
AUTH="Authorization: ApiKey ${API_KEY}"

echo "=== Step 1: Check Kibana version ==="
curl -s -H "$AUTH" -H "kbn-xsrf: true" "${BASE}/api/status" | python3 -c "
import sys, json
d = json.load(sys.stdin)
v = d.get('version', {})
print(f\"Version: {v.get('number', 'unknown')} (build: {v.get('build_number', 'unknown')}\")
" 2>/dev/null || echo "Could not fetch version"

echo ""
echo "=== Step 2: List Agent Builder agents ==="
for path in \
  "/api/agent_builder/agents" \
  "/api/security_ai_assistant/agent_builder/agents" \
  "/internal/agent_builder/agents"; do
  CODE=$(curl -s -o /tmp/a2a_probe.json -w "%{http_code}" \
    -H "$AUTH" -H "kbn-xsrf: true" "${BASE}${path}")
  echo "${CODE}  ${path}"
  if [ "$CODE" = "200" ]; then
    echo "  >>> FOUND! Response:"
    python3 -c "import json; print(json.dumps(json.load(open('/tmp/a2a_probe.json')), indent=2))" 2>/dev/null | head -60
  fi
done

echo ""
echo "=== Step 3: Probe A2A agent card (confirmed path pattern) ==="
if [ -n "$AGENT_ID" ]; then
  CODE=$(curl -s -o /tmp/a2a_probe.json -w "%{http_code}" \
    -H "$AUTH" -H "kbn-xsrf: true" \
    "${BASE}/api/agent_builder/a2a/${AGENT_ID}.json")
  echo "${CODE}  /api/agent_builder/a2a/${AGENT_ID}.json"
  if [ "$CODE" = "200" ]; then
    echo "  >>> FOUND! Agent Card:"
    python3 -m json.tool /tmp/a2a_probe.json 2>/dev/null
  else
    echo "  Response body:"
    cat /tmp/a2a_probe.json 2>/dev/null
  fi
else
  echo "Skipped (no AGENT_ID provided). Re-run with an agent ID from Step 2."
fi

echo ""
echo "=== Step 4: Probe A2A task endpoint ==="
if [ -n "$AGENT_ID" ]; then
  # Send a minimal JSON-RPC 2.0 message/send request (A2A protocol v0.3.0)
  CODE=$(curl -s -o /tmp/a2a_probe.json -w "%{http_code}" \
    -X POST \
    -H "$AUTH" \
    -H "kbn-xsrf: true" \
    -H "Content-Type: application/json" \
    -d '{
      "jsonrpc": "2.0",
      "method": "message/send",
      "id": "discovery-test-1",
      "params": {
        "message": {
          "role": "user",
          "messageId": "discovery-msg-1",
          "parts": [{"type": "text", "text": "Hello, what can you do?"}]
        }
      }
    }' \
    "${BASE}/api/agent_builder/a2a/${AGENT_ID}")
  echo "${CODE}  POST /api/agent_builder/a2a/${AGENT_ID}"
  echo "  Response:"
  python3 -m json.tool /tmp/a2a_probe.json 2>/dev/null || cat /tmp/a2a_probe.json 2>/dev/null
else
  echo "Skipped (no AGENT_ID provided)."
fi

echo ""
echo "=== Done ==="
