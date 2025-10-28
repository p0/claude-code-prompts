# exit_plan_mode

Use this tool when you are in plan mode and have finished presenting your plan and are ready to code. This will prompt the user to exit plan mode.

## Input Schema

```json
{
  "type": "object",
  "properties": {
    "plan": {
      "type": "string",
      "description": "The plan you came up with, that you want to run by the user for approval. Supports markdown. The plan should be pretty concise."
    }
  },
  "required": [
    "plan"
  ],
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```
