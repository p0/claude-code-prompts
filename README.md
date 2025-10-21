# Claude Code Prompts Collection

This repository automatically collects system prompts and tool definitions from each version of `@anthropic-ai/claude-code` published on npm.

## How It Works

The script:
1. Fetches all published versions of `@anthropic-ai/claude-code` from npm
2. For each version:
   - Installs it locally in a temporary directory
   - Starts an HTTP interceptor on port 3000
   - Runs `claude -p "hi"` with `ANTHROPIC_BASE_URL=http://localhost:3000`
   - Captures the first API request that contains both tools and a substantial system prompt
   - Saves the system prompt to `system_prompt.md`
   - Saves each tool definition to `tools/{tool_name}.md`
   - Creates a git commit for that version
3. Cleans up temporary files

## Usage

### Install Dependencies

```bash
npm install
```

### Run Collection

```bash
# Process all versions (will take 30-60 minutes for 234+ versions)
npm start

# Test mode: only process the last 3 versions
npm start -- --test
```

### View Results

After running, you can use `git log` to see all the commits, one per version:

```bash
git log --oneline
```

To see how the system prompt changed between versions:

```bash
git diff <version1> <version2> system_prompt.md
```

To see how a specific tool changed:

```bash
git diff <version1> <version2> tools/Bash.md
```

## Files

- `collect.ts` - Main collection script
- `package.json` - Project dependencies
- `test-interceptor.ts` - Standalone HTTP interceptor for testing
- `system_prompt.md` - The captured system prompt (overwritten for each version)
- `tools/*.md` - Tool definitions (overwritten for each version)

## Technical Details

### Key Challenges Solved

1. **stdin Blocking**: Claude hangs when run programmatically. Solution: pipe stdin with `echo |`
2. **Query Parameters**: API requests include `?beta=true`. Solution: match URLs with `startsWith()` instead of exact match
3. **Multiple Requests**: Claude makes several API calls. Solution: capture only the first request with both tools AND a substantial system prompt (>1000 chars)
4. **Version Compatibility**: Older versions don't support `--dangerously-skip-permissions`. Solution: removed the flag

### Request Capture Logic

The interceptor captures the first POST request to `/v1/messages` that has:
- At least 1 tool definition
- A system prompt longer than 1000 characters

This ensures we get the main request (not token counting or agent requests).

## Notes

- Each version takes approximately 10-15 seconds to process
- The script skips versions that fail (logged to stderr)
- Temporary directories are automatically cleaned up
- All tool definitions are saved as separate Markdown files for easy reading
