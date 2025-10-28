#!/usr/bin/env tsx

import http from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

interface Tool {
  name: string;
  description: string;
  input_schema: any;
}

interface CapturedData {
  systemPrompt: string;
  tools: Tool[];
}

let capturedData: CapturedData | null = null;
let serverResolve: ((value: CapturedData) => void) | null = null;

// Create HTTP server to intercept Anthropic API requests
function createInterceptor(port: number): http.Server {
  const server = http.createServer((req, res) => {
    // Match /v1/messages with or without query parameters
    const url = req.url || '';
    const isMessagesEndpoint = req.method === 'POST' && url.startsWith('/v1/messages');

    console.log(`[Interceptor] ${req.method} ${url} - isMessagesEndpoint: ${isMessagesEndpoint}`);

    if (isMessagesEndpoint) {
      let body = '';

      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', () => {
        try {
          const data = JSON.parse(body);

          // Extract system prompt and tools
          const systemPrompt = Array.isArray(data.system)
            ? data.system.map((s: any) => s.text || s).join('\n')
            : data.system || '';

          const tools = data.tools || [];

          // Only capture if this request has BOTH tools AND a substantial system prompt
          // This ensures we get the main request, not token counting or agent requests
          const hasSubstantialSystemPrompt = systemPrompt.length > 1000;
          if (tools.length > 0 && hasSubstantialSystemPrompt && !capturedData) {
            console.log(`[Interceptor] ✓ Captured data with ${tools.length} tools, ${systemPrompt.length} chars system prompt`);
            capturedData = { systemPrompt, tools };

            // Resolve the promise if waiting
            if (serverResolve) {
              serverResolve(capturedData);
              serverResolve = null;
            }
          } else {
            console.log(`[Interceptor] ✗ Skipping request (${tools.length} tools, ${systemPrompt.length} chars prompt, captured: ${!!capturedData})`);
          }

          // Send back a minimal valid response
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            id: 'msg_intercepted',
            type: 'message',
            role: 'assistant',
            content: [{ type: 'text', text: 'Intercepted' }],
            model: data.model,
            stop_reason: 'end_turn',
            usage: { input_tokens: 10, output_tokens: 5 }
          }));
        } catch (error) {
          console.error('Error parsing request:', error);
          res.writeHead(500);
          res.end();
        }
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(port);
  console.log(`Interceptor listening on port ${port}`);
  return server;
}

// Wait for data to be captured
function waitForCapture(): Promise<CapturedData> {
  return new Promise((resolve) => {
    if (capturedData) {
      resolve(capturedData);
      capturedData = null;
    } else {
      serverResolve = resolve;
    }
  });
}

// Install a specific version of claude-code locally
async function installVersion(version: string, tempDir: string): Promise<void> {
  console.log(`Installing @anthropic-ai/claude-code@${version} in ${tempDir}...`);
  try {
    // Create temp directory
    await fs.mkdir(tempDir, { recursive: true });

    // Initialize package.json
    await fs.writeFile(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ name: 'temp', version: '1.0.0' }, null, 2)
    );

    // Install the specific version
    await execAsync(`npm install @anthropic-ai/claude-code@${version}`, {
      cwd: tempDir,
      env: { ...process.env, npm_config_loglevel: 'error' }
    });
  } catch (error: any) {
    throw new Error(`Failed to install version ${version}: ${error.message}`);
  }
}

// Run claude with a simple prompt to trigger API call
async function runClaude(port: number, tempDir: string): Promise<void> {
  console.log('Running claude to trigger API call...');
  const claudePath = path.join(tempDir, 'node_modules', '.bin', 'claude');

  // Check if claude binary exists
  try {
    await fs.access(claudePath);
    console.log('✓ Claude binary found at:', claudePath);
  } catch (error) {
    console.error('✗ Claude binary NOT found at:', claudePath);
    throw new Error(`Claude binary not found: ${claudePath}`);
  }

  // Log the exact command we're running
  // Note: Not using --dangerously-skip-permissions as older versions don't support it
  const command = `"${claudePath}" -p "hi"`;
  console.log('Command:', command);
  console.log('Env vars: ANTHROPIC_BASE_URL=' + `http://localhost:${port}`, 'ANTHROPIC_API_KEY=***');

  try {
    // Run claude with our interceptor URL and a simple prompt
    // We expect this to fail/timeout after making the request, which is fine
    // Use echo to provide stdin to avoid hanging
    const result = await execAsync(`echo | ${command}`, {
      cwd: tempDir,
      env: {
        ...process.env,
        ANTHROPIC_BASE_URL: `http://localhost:${port}`,
        ANTHROPIC_API_KEY: 'fake-key-for-testing',
        NODE_ENV: 'production'
      },
      timeout: 10000, // 10 second timeout
      shell: '/bin/bash'
    });
    console.log('✓ Claude completed successfully');
    console.log('Claude stdout:', result.stdout.substring(0, 500));
    console.log('Claude stderr:', result.stderr.substring(0, 500));
  } catch (error: any) {
    // We expect this to fail/timeout, which is fine as long as we captured the data
    if (error.stdout) console.log('Claude stdout (error):', error.stdout.substring(0, 500));
    if (error.stderr) console.log('Claude stderr (error):', error.stderr.substring(0, 500));
    if (error.killed) {
      console.log('⚠ Claude command was killed (timeout)');
    } else {
      console.log('⚠ Claude command failed with:', error.message);
    }
  }
}

// Save system prompt to file
async function saveSystemPrompt(systemPrompt: string): Promise<void> {
  // Normalize the working directory path to avoid spurious changes
  const normalized = systemPrompt.replace(
    /Working directory: \/private\/tmp\/claude-code-[^\n]+/g,
    'Working directory: /tmp/claude-code-VERSION'
  );
  await fs.writeFile('system_prompt.md', normalized, 'utf-8');
  console.log('Saved system_prompt.md');
}

// Save tools to separate files
async function saveTools(tools: Tool[]): Promise<void> {
  // Create tools directory
  await fs.mkdir('tools', { recursive: true });

  // Remove old tool files
  try {
    const files = await fs.readdir('tools');
    await Promise.all(
      files.map(file => fs.unlink(path.join('tools', file)))
    );
  } catch (error) {
    // Directory might not exist yet
  }

  // Save each tool
  for (const tool of tools) {
    const filename = `tools/${tool.name}.md`;
    const content = `# ${tool.name}\n\n${tool.description}\n\n## Input Schema\n\n\`\`\`json\n${JSON.stringify(tool.input_schema, null, 2)}\n\`\`\`\n`;
    await fs.writeFile(filename, content, 'utf-8');
  }

  console.log(`Saved ${tools.length} tool definitions`);
}

// Commit changes
async function commitChanges(version: string): Promise<void> {
  try {
    await execAsync('git add -A');
    const message = `Add metadata for @anthropic-ai/claude-code@${version}`;
    await execAsync(`git commit -m "${message}"`);
    console.log(`Committed: ${message}`);
  } catch (error: any) {
    if (error.message.includes('nothing to commit')) {
      console.log('No changes to commit');
    } else {
      throw error;
    }
  }
}

// Get list of versions from npm
async function getVersions(): Promise<string[]> {
  const { stdout } = await execAsync('npm view @anthropic-ai/claude-code versions --json');
  return JSON.parse(stdout);
}

// Check if a version has already been processed
async function isVersionProcessed(version: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`git log --oneline --grep="Add metadata for @anthropic-ai/claude-code@${version}$"`);
    return stdout.trim().length > 0;
  } catch (error) {
    return false;
  }
}

// Process a single version
async function processVersion(version: string, port: number): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Processing version ${version}`);
  console.log('='.repeat(60));

  capturedData = null;
  const tempDir = `/tmp/claude-code-${version}`;

  try {
    // Install the version
    await installVersion(version, tempDir);

    // Start waiting for capture
    const capturePromise = waitForCapture();

    // Run claude
    await runClaude(port, tempDir);

    // Wait for data (with timeout)
    const data = await Promise.race([
      capturePromise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout waiting for capture')), 15000)
      )
    ]);

    // Save the data
    await saveSystemPrompt(data.systemPrompt);
    await saveTools(data.tools);

    // Commit
    await commitChanges(version);

    console.log(`✓ Successfully processed version ${version}`);
  } catch (error: any) {
    console.error(`✗ Failed to process version ${version}:`, error.message);
    throw error;
  } finally {
    // Clean up temp directory
    try {
      await execAsync(`rm -rf "${tempDir}"`);
    } catch (error) {
      console.warn(`Failed to clean up ${tempDir}`);
    }
  }
}

// Main function
async function main() {
  const port = 3000;
  const server = createInterceptor(port);

  // Check for test mode (only process first 3 versions)
  const isTestMode = process.argv.includes('--test');

  try {
    // Get all versions
    const allVersions = await getVersions();
    // In test mode, test recent versions instead of old ones
    const versions = isTestMode ? allVersions.slice(-3) : allVersions;

    if (isTestMode) {
      console.log(`TEST MODE: Processing last ${versions.length} versions only`);
    }
    console.log(`Found ${allVersions.length} versions total, processing ${versions.length}`);

    // Process each version in order (oldest to newest)
    for (let i = 0; i < versions.length; i++) {
      const version = versions[i];
      console.log(`\nProgress: ${i + 1}/${versions.length}`);

      // Skip if already processed
      const alreadyProcessed = await isVersionProcessed(version);
      if (alreadyProcessed) {
        console.log(`⊘ Skipping ${version} (already processed)`);
        continue;
      }
      console.log(`→ Processing ${version} (new version)`);


      try {
        await processVersion(version, port);
      } catch (error) {
        console.error(`Skipping version ${version} due to error`);
        // Continue with next version
      }

      // Small delay between versions
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n✓ All versions processed!');
  } finally {
    server.close();
  }
}

main().catch(console.error);
