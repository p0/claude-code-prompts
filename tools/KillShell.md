# KillShell


- Kills a running background bash shell by its ID
- Takes a shell_id parameter identifying the shell to kill
- Returns a success or failure status 
- Use this tool when you need to terminate a long-running shell
- Shell IDs can be found using the /tasks command


## Input Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "shell_id": {
      "description": "The ID of the background shell to kill",
      "type": "string"
    }
  },
  "required": [
    "shell_id"
  ],
  "additionalProperties": false
}
```
