import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerLogin } from '../src/commands/login.js';
import { registerWhoami } from '../src/commands/whoami.js';
import { runCommand, withEnv } from './helpers.js';

test('login reports a masked key and success when SWARMS_API_KEY is set', async () => {
  const restore = withEnv({ SWARMS_API_KEY: 'sk-abcdef123456' });
  try {
    const { output, exitCode } = await runCommand(registerLogin, ['login']);
    assert.match(output, /API base\s+https:\/\/swarms\.world/);
    assert.match(output, /SWARMS_API_KEY\s*sk-a…3456/);
    assert.ok(!output.includes('sk-abcdef123456'), 'full key must never be printed');
    assert.match(output, /Ready\./);
    assert.notEqual(exitCode, 1);
  } finally {
    restore();
  }
});

test('login fails with guidance when SWARMS_API_KEY is missing', async () => {
  const restore = withEnv({ SWARMS_API_KEY: undefined });
  try {
    const { output, exitCode } = await runCommand(registerLogin, ['login']);
    assert.match(output, /SWARMS_API_KEY is not set\./);
    assert.match(output, /export SWARMS_API_KEY=/);
    assert.match(output, /swarms\.world\/platform\/api-keys/);
    assert.equal(exitCode, 1);
  } finally {
    restore();
  }
});

test('whoami shows the masked key and base URL', async () => {
  const restore = withEnv({ SWARMS_API_KEY: 'sk-abcdef123456' });
  try {
    const { output, exitCode } = await runCommand(registerWhoami, ['whoami']);
    assert.match(output, /API base\s+https:\/\/swarms\.world/);
    assert.match(output, /SWARMS_API_KEY\s*sk-a…3456/);
    assert.ok(!output.includes('sk-abcdef123456'), 'full key must never be printed');
    assert.notEqual(exitCode, 1);
  } finally {
    restore();
  }
});

test('whoami masks short keys entirely', async () => {
  const restore = withEnv({ SWARMS_API_KEY: 'short' });
  try {
    const { output } = await runCommand(registerWhoami, ['whoami']);
    assert.match(output, /SWARMS_API_KEY\s*••••/);
    assert.ok(!output.includes('short\n'), 'short key must not appear in output');
  } finally {
    restore();
  }
});

test('whoami fails with a hint when SWARMS_API_KEY is missing', async () => {
  const restore = withEnv({ SWARMS_API_KEY: undefined });
  try {
    const { output, exitCode } = await runCommand(registerWhoami, ['whoami']);
    assert.match(output, /SWARMS_API_KEY is not set/);
    assert.match(output, /swarms api-key/);
    assert.equal(exitCode, 1);
  } finally {
    restore();
  }
});
