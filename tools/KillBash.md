# KillBash


- Kills a running background bash shell by its ID
- Takes a shell_id parameter identifying the shell to kill
- Returns a success or failure status 
- Use this tool when you need to terminate a long-running shell
- Shell IDs can be found using the /bashes command


## Input Schema

```json
{
  "type": "object",
  "properties": {
    "shell_id": {
      "type": "string",
      "description": "The ID of the background shell to kill"
    }
  },
  "required": [
    "shell_id"
  ],
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```
