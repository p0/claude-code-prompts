# CronDelete

Cancel a cron job previously scheduled with CronCreate. Removes it from .claude/scheduled_tasks.json (durable jobs) or the in-memory session store (session-only jobs).

## Input Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "id": {
      "description": "Job ID returned by CronCreate.",
      "type": "string"
    }
  },
  "required": [
    "id"
  ],
  "additionalProperties": false
}
```
