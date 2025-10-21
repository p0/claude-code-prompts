# SlashCommand

Execute a slash command within the main conversation
Usage:
- `command` (required): The slash command to execute, including any arguments
- Example: `command: "/review-pr 123"`
Important Notes:
- Only available slash commands can be executed.
- Some commands may require arguments as shown in the command list above
- If command validation fails, list up to 5 available commands, not all of them.
- Do not use this tool if you are already processing a slash command with the same name as indicated by <command-message>{name_of_command} is running…</command-message>
Available Commands:



## Input Schema

```json
{
  "type": "object",
  "properties": {
    "command": {
      "type": "string",
      "description": "The slash command to execute with its arguments, e.g., \"/review-pr 123\""
    }
  },
  "required": [
    "command"
  ],
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```
