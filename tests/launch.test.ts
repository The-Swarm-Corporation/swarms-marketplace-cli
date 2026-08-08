import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Command } from 'commander';
import { registerLaunchAgent } from '../src/commands/launch-agent.js';
import { registerLaunchPrompt } from '../src/commands/launch-prompt.js';
import { forbidFetch, jsonResponse, mockFetch, runCommand, withEnv } from './helpers.js';

function registerLaunch(program: Command): void {
  const launch = program.command('launch');
  registerLaunchAgent(launch);
  registerLaunchPrompt(launch);
}

function tmpFile(name: string, content: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarms-cli-test-'));
  const p = path.join(dir, name);
  fs.writeFileSync(p, content);
  return p;
}

test('launch agent validates name locally before any network call', async () => {
  const restoreEnv = withEnv({ SWARMS_API_KEY: 'sk-test-key' });
  const { calls, restore } = forbidFetch();
  try {
    const { output, exitCode } = await runCommand(registerLaunch, [
      'launch', 'agent',
      '--name', 'x',
      '--description', 'A test agent',
    ]);
    assert.equal(calls.length, 0);
    assert.match(output, /Missing or short --name \(need ≥ 2 chars\)\./);
    assert.equal(exitCode, 1);
  } finally {
    restore();
    restoreEnv();
  }
});

test('launch agent requires a description', async () => {
  const restoreEnv = withEnv({ SWARMS_API_KEY: 'sk-test-key' });
  const { restore } = forbidFetch();
  try {
    const { output, exitCode } = await runCommand(registerLaunch, [
      'launch', 'agent',
      '--name', 'Test Agent',
    ]);
    assert.match(output, /Missing --description\./);
    assert.equal(exitCode, 1);
  } finally {
    restore();
    restoreEnv();
  }
});

test('launch agent rejects a negative --price-usd', async () => {
  const restoreEnv = withEnv({ SWARMS_API_KEY: 'sk-test-key' });
  const { restore } = forbidFetch();
  try {
    const { output, exitCode } = await runCommand(registerLaunch, [
      'launch', 'agent',
      '--name', 'Test Agent',
      '--description', 'A test agent',
      '--price-usd', '-5',
    ]);
    assert.match(output, /--price-usd must be a non-negative number/);
    assert.equal(exitCode, 1);
  } finally {
    restore();
    restoreEnv();
  }
});

test('launch agent publishes with Bearer auth and prints the listing', async () => {
  const restoreEnv = withEnv({ SWARMS_API_KEY: 'sk-test-key' });
  const { calls, restore } = mockFetch(() =>
    jsonResponse({ id: 'agent-uuid', listing_url: 'https://swarms.world/agent/agent-uuid' }),
  );
  try {
    const { output, exitCode } = await runCommand(registerLaunch, [
      'launch', 'agent',
      '--name', 'Test Agent',
      '--description', 'A test agent',
      '--price-usd', '9.99',
    ]);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://swarms.world/api/add-agent');
    assert.equal(calls[0].headers['authorization'], 'Bearer sk-test-key');
    const payload = JSON.parse(calls[0].body ?? '{}');
    assert.equal(payload.name, 'Test Agent');
    assert.equal(payload.description, 'A test agent');
    assert.equal(payload.is_free, false);
    assert.equal(payload.price_usd, 9.99);
    assert.ok(Array.isArray(payload.useCases), 'default useCases must be filled in');

    assert.match(output, /Agent published\./);
    assert.match(output, /agent-uuid/);
    assert.notEqual(exitCode, 1);
  } finally {
    restore();
    restoreEnv();
  }
});

test('launch agent merges a manifest with flag overrides and --code-file', async () => {
  const restoreEnv = withEnv({ SWARMS_API_KEY: 'sk-test-key' });
  const manifest = tmpFile(
    'agent.json',
    JSON.stringify({
      name: 'Manifest Name',
      description: 'From the manifest',
      category: 'research',
    }),
  );
  const codeFile = tmpFile('agent.py', 'print("hello")\n');
  const { calls, restore } = mockFetch(() => jsonResponse({ id: 'x' }));
  try {
    await runCommand(registerLaunch, [
      'launch', 'agent',
      '-m', manifest,
      '--name', 'Override Name',
      '--code-file', codeFile,
      '--free',
    ]);
    const payload = JSON.parse(calls[0].body ?? '{}');
    assert.equal(payload.name, 'Override Name', 'flags override the manifest');
    assert.equal(payload.description, 'From the manifest');
    assert.equal(payload.category, 'research');
    assert.equal(payload.agent, 'print("hello")\n');
    assert.equal(payload.is_free, true);
  } finally {
    restore();
    restoreEnv();
  }
});

test('launch agent fails cleanly when the code file does not exist', async () => {
  const restoreEnv = withEnv({ SWARMS_API_KEY: 'sk-test-key' });
  const { restore } = forbidFetch();
  try {
    const { output, exitCode } = await runCommand(registerLaunch, [
      'launch', 'agent',
      '--name', 'Test Agent',
      '--description', 'A test agent',
      '--code-file', '/nonexistent/agent.py',
    ]);
    assert.match(output, /Code file not found: \/nonexistent\/agent\.py/);
    assert.equal(exitCode, 1);
  } finally {
    restore();
    restoreEnv();
  }
});

test('launch agent prints the login hint on a 401', async () => {
  const restoreEnv = withEnv({ SWARMS_API_KEY: 'sk-revoked' });
  const { restore } = mockFetch(() =>
    jsonResponse({ error: 'Unauthorized' }, 401),
  );
  try {
    const { output, exitCode } = await runCommand(registerLaunch, [
      'launch', 'agent',
      '--name', 'Test Agent',
      '--description', 'A test agent',
    ]);
    assert.match(output, /HTTP 401/);
    assert.match(output, /Run `swarms login` to set an API key\./);
    assert.equal(exitCode, 1);
  } finally {
    restore();
    restoreEnv();
  }
});

test('launch prompt requires prompt content', async () => {
  const restoreEnv = withEnv({ SWARMS_API_KEY: 'sk-test-key' });
  const { restore } = forbidFetch();
  try {
    const { output, exitCode } = await runCommand(registerLaunch, [
      'launch', 'prompt',
      '--name', 'Test Prompt',
      '--description', 'A test prompt',
    ]);
    assert.match(output, /Missing --prompt-file or `prompt` in manifest\./);
    assert.equal(exitCode, 1);
  } finally {
    restore();
    restoreEnv();
  }
});

test('launch prompt publishes with the prompt file contents', async () => {
  const restoreEnv = withEnv({ SWARMS_API_KEY: 'sk-test-key' });
  const promptFile = tmpFile('prompt.txt', 'You are a helpful assistant.');
  const { calls, restore } = mockFetch(() =>
    jsonResponse({ id: 'prompt-uuid', listing_url: 'https://swarms.world/prompt/prompt-uuid' }),
  );
  try {
    const { output, exitCode } = await runCommand(registerLaunch, [
      'launch', 'prompt',
      '--name', 'Test Prompt',
      '--description', 'A test prompt',
      '--prompt-file', promptFile,
    ]);

    assert.equal(calls[0].url, 'https://swarms.world/api/add-prompt');
    assert.equal(calls[0].headers['authorization'], 'Bearer sk-test-key');
    const payload = JSON.parse(calls[0].body ?? '{}');
    assert.equal(payload.prompt, 'You are a helpful assistant.');

    assert.match(output, /Prompt published\./);
    assert.match(output, /prompt-uuid/);
    assert.notEqual(exitCode, 1);
  } finally {
    restore();
    restoreEnv();
  }
});
