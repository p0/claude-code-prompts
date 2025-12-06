# AgentOutputTool

- Retrieves output from a completed async agent task by agentId
- Provide a single agentId
- If you want to check on the agent's progress call AgentOutputTool with block=false to get an immediate update on the agent's status
- If you run out of things to do and the agent is still running - call AgentOutputTool with block=true to idle and wait for the agent's result (do not use block=true unless you completely run out of things to do as it will waste time)

## Input Schema

```json
{
  "type": "object",
  "properties": {
    "agentId": {
      "type": "string",
      "description": "The agent ID to retrieve results for"
    },
    "block": {
      "type": "boolean",
      "default": true,
      "description": "Whether to block until results are ready"
    },
    "wait_up_to": {
      "type": "number",
      "minimum": 0,
      "maximum": 300,
      "default": 150,
      "description": "Maximum time to wait in seconds"
    }
  },
  "required": [
    "agentId"
  ],
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```
