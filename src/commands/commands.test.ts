import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Command } from 'commander';
import { registerApiKey } from './api-key.js';
import { registerLogin } from './login.js';
import { registerWhoami } from './whoami.js';
import { registerLaunchAgent } from './launch-agent.js';
import { registerLaunchPrompt } from './launch-prompt.js';
import { registerLaunchToken } from './launch-token.js';
import { registerList } from './list.js';
import { registerListTokenized } from './list-tokenized.js';
import { registerOpen } from './open.js';
import { registerClaim } from './claim.js';
import { registerClaimAll } from './claim-all.js';

describe('Commands', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;
  const originalConsoleLog = console.log;
  const originalExitCode = process.exitCode;
  let consoleOutput: string[] = [];

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.exitCode = 0;
    consoleOutput = [];
    console.log = vi.fn((...args) => {
      consoleOutput.push(args.join(' '));
    });
    global.fetch = vi.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
    console.log = originalConsoleLog;
    process.exitCode = originalExitCode;
    vi.restoreAllMocks();
  });

  describe('api-key', () => {
    it('should print URL', async () => {
      const program = new Command();
      registerApiKey(program);
      
      await program.parseAsync(['node', 'test', 'api-key', '--no-open']);
      
      const output = consoleOutput.join('\n');
      expect(output).toContain('https://swarms.world/platform/api-keys');
    });

    it('should suggest export command', async () => {
      const program = new Command();
      registerApiKey(program);
      
      await program.parseAsync(['node', 'test', 'api-key', '--no-open']);
      
      const output = consoleOutput.join('\n');
      expect(output).toContain('export SWARMS_API_KEY');
    });

    it('should not spawn browser with --no-open', async () => {
      const program = new Command();
      registerApiKey(program);
      
      await program.parseAsync(['node', 'test', 'api-key', '--no-open']);
      
      const output = consoleOutput.join('\n');
      expect(output).not.toContain('Opening in your default browser');
    });
  });

  describe('login', () => {
    it('should exit 1 when API key is missing', async () => {
      delete process.env.SWARMS_API_KEY;
      const program = new Command();
      registerLogin(program);
      
      await program.parseAsync(['node', 'test', 'login']);
      
      expect(process.exitCode).toBe(1);
      const output = consoleOutput.join('\n');
      expect(output).toContain('SWARMS_API_KEY is not set');
    });

    it('should show masked key on success', async () => {
      process.env.SWARMS_API_KEY = 'test-key-12345678';
      const program = new Command();
      registerLogin(program);
      
      await program.parseAsync(['node', 'test', 'login']);
      
      expect(process.exitCode).toBe(0);
      const output = consoleOutput.join('\n');
      expect(output).toMatch(/test…5678|••••/);
      expect(output).toContain('Ready');
    });

    it('should display base URL', async () => {
      process.env.SWARMS_API_KEY = 'test-key';
      const program = new Command();
      registerLogin(program);
      
      await program.parseAsync(['node', 'test', 'login']);
      
      const output = consoleOutput.join('\n');
      expect(output).toContain('https://swarms.world');
    });
  });

  describe('whoami', () => {
    it('should exit 1 when API key is missing', async () => {
      delete process.env.SWARMS_API_KEY;
      const program = new Command();
      registerWhoami(program);
      
      await program.parseAsync(['node', 'test', 'whoami']);
      
      expect(process.exitCode).toBe(1);
      const output = consoleOutput.join('\n');
      expect(output).toContain('SWARMS_API_KEY is not set');
    });

    it('should show masked key when set', async () => {
      process.env.SWARMS_API_KEY = 'abcdefghijklmnop';
      const program = new Command();
      registerWhoami(program);
      
      await program.parseAsync(['node', 'test', 'whoami']);
      
      expect(process.exitCode).toBe(0);
      const output = consoleOutput.join('\n');
      expect(output).toContain('abcd…mnop');
    });
  });

  describe('launch agent', () => {
    it('should require name', async () => {
      process.env.SWARMS_API_KEY = 'test-key';
      const launch = new Command('launch');
      registerLaunchAgent(launch);
      
      await launch.parseAsync(['node', 'test', 'agent', '--description', 'Test']);
      
      expect(process.exitCode).toBe(1);
      const output = consoleOutput.join('\n');
      expect(output).toContain('Missing or short --name');
    });

    it('should require description', async () => {
      process.env.SWARMS_API_KEY = 'test-key';
      const launch = new Command('launch');
      registerLaunchAgent(launch);
      
      await launch.parseAsync(['node', 'test', 'agent', '--name', 'Test Agent']);
      
      expect(process.exitCode).toBe(1);
      const output = consoleOutput.join('\n');
      expect(output).toContain('Missing --description');
    });

    it('should handle server error', async () => {
      process.env.SWARMS_API_KEY = 'test-key';
      (global.fetch as any).mockResolvedValue(
        new Response(JSON.stringify({ error: 'Server error' }), { status: 500 })
      );
      
      const launch = new Command('launch');
      registerLaunchAgent(launch);
      
      await launch.parseAsync(['node', 'test', 'agent', '--name', 'Test', '--description', 'Desc']);
      
      expect(process.exitCode).toBe(1);
      const output = consoleOutput.join('\n');
      expect(output).toContain('Server error');
    });

    it('should succeed with valid inputs', async () => {
      process.env.SWARMS_API_KEY = 'test-key';
      (global.fetch as any).mockResolvedValue(
        new Response(JSON.stringify({ id: '123', listing_url: 'https://swarms.world/agent/123' }), { status: 200 })
      );
      
      const launch = new Command('launch');
      registerLaunchAgent(launch);
      
      await launch.parseAsync(['node', 'test', 'agent', '--name', 'Test Agent', '--description', 'Test description']);
      
      expect(process.exitCode).toBe(0);
      const output = consoleOutput.join('\n');
      expect(output).toContain('Agent published');
    });
  });

  describe('launch prompt', () => {
    it('should require prompt field', async () => {
      process.env.SWARMS_API_KEY = 'test-key';
      const launch = new Command('launch');
      registerLaunchPrompt(launch);
      
      await launch.parseAsync(['node', 'test', 'prompt', '--name', 'Test', '--description', 'Desc']);
      
      expect(process.exitCode).toBe(1);
      const output = consoleOutput.join('\n');
      expect(output).toContain('Missing --prompt-file');
    });
  });

  describe('launch token', () => {
    it('should require ticker', async () => {
      process.env.SWARMS_API_KEY = 'test-key';
      process.env.PRIVATE_KEY = 'test-private-key';
      const launch = new Command('launch');
      registerLaunchToken(launch);
      
      await launch.parseAsync(['node', 'test', 'token', '--name', 'Test', '--description', 'Desc']);
      
      expect(process.exitCode).toBe(1);
      const output = consoleOutput.join('\n');
      expect(output).toContain('ticker');
    });

    it('should validate ticker format', async () => {
      process.env.SWARMS_API_KEY = 'test-key';
      process.env.PRIVATE_KEY = 'test-private-key';
      const launch = new Command('launch');
      registerLaunchToken(launch);
      
      await launch.parseAsync(['node', 'test', 'token', '--name', 'Test', '--description', 'Desc', '--ticker', 'invalid-ticker!']);
      
      expect(process.exitCode).toBe(1);
      const output = consoleOutput.join('\n');
      expect(output).toContain('ticker must be 1–10 chars');
    });

    it('should use PRIVATE_KEY env var', async () => {
      process.env.SWARMS_API_KEY = 'test-key';
      process.env.PRIVATE_KEY = 'wallet-key';
      (global.fetch as any).mockResolvedValue(
        new Response(JSON.stringify({ id: '123', token_address: 'ABC123' }), { status: 200 })
      );
      
      const launch = new Command('launch');
      registerLaunchToken(launch);
      
      await launch.parseAsync(['node', 'test', 'token', '--name', 'Test', '--description', 'Desc', '--ticker', 'TEST']);
      
      expect(process.exitCode).toBe(0);
      const output = consoleOutput.join('\n');
      expect(output).toContain('Token launched');
    });
  });

  describe('list', () => {
    it('should require --user or --user-id or $SWARMS_USERNAME', async () => {
      delete process.env.SWARMS_USERNAME;
      const program = new Command();
      registerList(program);
      
      await program.parseAsync(['node', 'test', 'list']);
      
      expect(process.exitCode).toBe(1);
      const output = consoleOutput.join('\n');
      expect(output).toContain('--user');
    });

    it('should use $SWARMS_USERNAME when set', async () => {
      process.env.SWARMS_API_KEY = 'test-key';
      process.env.SWARMS_USERNAME = 'testuser';
      (global.fetch as any).mockResolvedValue(
        new Response(JSON.stringify({
          username: 'testuser',
          total_products: 0,
          agents: [],
          prompts: [],
          tools: [],
          summary: { total_agents: 0, total_prompts: 0, total_tools: 0, tokenized_products: 0 }
        }), { status: 200 })
      );
      
      const program = new Command();
      registerList(program);
      
      await program.parseAsync(['node', 'test', 'list']);
      
      expect(process.exitCode).toBe(0);
    });

    it('should support --json output', async () => {
      process.env.SWARMS_API_KEY = 'test-key';
      (global.fetch as any).mockResolvedValue(
        new Response(JSON.stringify({
          username: 'test',
          total_products: 1,
          agents: [],
          prompts: [],
          tools: [],
          summary: { total_agents: 0, total_prompts: 0, total_tools: 0, tokenized_products: 0 }
        }), { status: 200 })
      );
      
      const program = new Command();
      registerList(program);
      
      await program.parseAsync(['node', 'test', 'list', '--user', 'test', '--json']);
      
      const output = consoleOutput.join('\n');
      expect(output).toContain('"username"');
    });

    it('should filter tokenized products with --tokenized', async () => {
      process.env.SWARMS_API_KEY = 'test-key';
      (global.fetch as any).mockResolvedValue(
        new Response(JSON.stringify({
          username: 'test',
          total_products: 2,
          agents: [
            { id: '1', name: 'Agent 1', type: 'agent', business_model: 'free' },
            { id: '2', name: 'Agent 2', type: 'agent', business_model: 'tokenized' }
          ],
          prompts: [],
          tools: [],
          summary: { total_agents: 2, total_prompts: 0, total_tools: 0, tokenized_products: 1 }
        }), { status: 200 })
      );
      
      const program = new Command();
      registerList(program);
      
      await program.parseAsync(['node', 'test', 'list', '--user', 'test', '--tokenized']);
      
      expect(process.exitCode).toBe(0);
    });
  });

  describe('list-tokenized', () => {
    it('should validate --type parameter', async () => {
      (global.fetch as any).mockResolvedValue(
        new Response(JSON.stringify({
          total: 0,
          counts: { agents: 0, prompts: 0 },
          data: [],
          pagination: { page: 1, limit: 100, total_pages: 0, has_next: false, has_prev: false }
        }), { status: 200 })
      );
      
      const program = new Command();
      registerListTokenized(program);
      
      await program.parseAsync(['node', 'test', 'list-tokenized', '--type', 'all']);
      
      expect(process.exitCode).toBe(0);
    });

    it('should support pagination', async () => {
      (global.fetch as any).mockResolvedValue(
        new Response(JSON.stringify({
          total: 200,
          counts: { agents: 100, prompts: 100 },
          data: [],
          pagination: { page: 2, limit: 100, total_pages: 2, has_next: false, has_prev: true }
        }), { status: 200 })
      );
      
      const program = new Command();
      registerListTokenized(program);
      
      await program.parseAsync(['node', 'test', 'list-tokenized', '--page', '2']);
      
      const output = consoleOutput.join('\n');
      expect(output).toContain('page 2/2');
    });
  });

  describe('open', () => {
    it('should require --type when ref is UUID', async () => {
      const program = new Command();
      registerOpen(program);
      
      await program.parseAsync(['node', 'test', 'open', '12345678-1234-1234-1234-123456789012']);
      
      expect(process.exitCode).toBe(1);
      const output = consoleOutput.join('\n');
      expect(output).toContain('UUIDs need a type');
    });

    it('should build URL with UUID and --type without network call', async () => {
      const program = new Command();
      registerOpen(program);
      
      await program.parseAsync(['node', 'test', 'open', '12345678-1234-1234-1234-123456789012', '--type', 'agent', '--print']);
      
      expect(process.exitCode).toBe(0);
      const output = consoleOutput.join('\n');
      expect(output).toContain('https://swarms.world/agent/12345678-1234-1234-1234-123456789012');
    });

    it('should lookup CA via API', async () => {
      const validCA = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
      (global.fetch as any).mockResolvedValue(
        new Response(JSON.stringify({
          total: 1,
          data: [{
            id: '123',
            name: 'Test Agent',
            type: 'agent',
            token_address: validCA,
            listing_url: 'https://swarms.world/agent/123'
          }],
          pagination: { page: 1, total_pages: 1, has_next: false }
        }), { status: 200 })
      );
      
      const program = new Command();
      registerOpen(program);
      
      await program.parseAsync(['node', 'test', 'open', validCA, '--print']);
      
      expect(process.exitCode).toBe(0);
      const output = consoleOutput.join('\n');
      expect(output).toContain('https://swarms.world/agent/123');
    });

    it('should exit 1 when CA not found', async () => {
      const validCA = '8yKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsV';
      (global.fetch as any).mockResolvedValue(
        new Response(JSON.stringify({
          total: 0,
          data: [],
          pagination: { page: 1, total_pages: 0, has_next: false }
        }), { status: 200 })
      );
      
      const program = new Command();
      registerOpen(program);
      
      await program.parseAsync(['node', 'test', 'open', validCA, '--print']);
      
      expect(process.exitCode).toBe(1);
      const output = consoleOutput.join('\n');
      expect(output).toContain('No tokenized product found');
    });

    it('should suppress spawn with --print', async () => {
      const program = new Command();
      registerOpen(program);
      
      await program.parseAsync(['node', 'test', 'open', '12345678-1234-1234-1234-123456789012', '--type', 'agent', '--print']);
      
      const output = consoleOutput.join('\n');
      expect(output).not.toContain('Opening in your default browser');
    });

    it('should suppress spawn with --no-open', async () => {
      const program = new Command();
      registerOpen(program);
      
      await program.parseAsync(['node', 'test', 'open', '12345678-1234-1234-1234-123456789012', '--type', 'agent', '--no-open']);
      
      const output = consoleOutput.join('\n');
      expect(output).not.toContain('Opening in your default browser');
    });
  });

  describe('claim', () => {
    it('should require --ca', async () => {
      const program = new Command();
      program.exitOverride();
      registerClaim(program);
      
      try {
        await program.parseAsync(['node', 'test', 'claim']);
        expect.fail('Should have thrown error for missing --ca');
      } catch (err: any) {
        expect(err.code).toBe('commander.missingMandatoryOptionValue');
      }
    });

    it('should use --private-key flag', async () => {
      (global.fetch as any).mockResolvedValue(
        new Response(JSON.stringify({ success: true, signature: 'sig123' }), { status: 200 })
      );
      
      const program = new Command();
      registerClaim(program);
      
      await program.parseAsync(['node', 'test', 'claim', '--ca', '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', '--private-key', 'test-key']);
      
      expect(process.exitCode).toBe(0);
      const output = consoleOutput.join('\n');
      expect(output).toContain('Claim submitted');
    });

    it('should handle server error', async () => {
      (global.fetch as any).mockResolvedValue(
        new Response(JSON.stringify({ error: 'Insufficient balance' }), { status: 400 })
      );
      
      const program = new Command();
      registerClaim(program);
      
      await program.parseAsync(['node', 'test', 'claim', '--ca', '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', '--private-key', 'key']);
      
      expect(process.exitCode).toBe(1);
      const output = consoleOutput.join('\n');
      expect(output).toContain('Insufficient balance');
    });
  });

  describe('claim-all', () => {
    it('should support --dry-run', async () => {
      (global.fetch as any).mockResolvedValue(
        new Response(JSON.stringify({
          total: 2,
          data: [
            { id: '1', name: 'Agent 1', type: 'agent', token_address: 'CA1' },
            { id: '2', name: 'Agent 2', type: 'agent', token_address: 'CA2' }
          ],
          pagination: { page: 1, total_pages: 1, has_next: false }
        }), { status: 200 })
      );
      
      const program = new Command();
      registerClaimAll(program);
      
      await program.parseAsync(['node', 'test', 'claim-all', '--dry-run']);
      
      expect(process.exitCode).toBe(0);
      const output = consoleOutput.join('\n');
      expect(output).toContain('Dry run');
      expect(output).not.toContain('Claim submitted');
    });

    it('should continue on failure', async () => {
      let callCount = 0;
      (global.fetch as any).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(new Response(JSON.stringify({
            total: 2,
            data: [
              { id: '1', name: 'Agent 1', type: 'agent', token_address: 'CA1' },
              { id: '2', name: 'Agent 2', type: 'agent', token_address: 'CA2' }
            ],
            pagination: { page: 1, total_pages: 1, has_next: false }
          }), { status: 200 }));
        } else if (callCount === 2) {
          return Promise.resolve(new Response(JSON.stringify({ error: 'Failed' }), { status: 500 }));
        } else {
          return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
        }
      });
      
      const program = new Command();
      registerClaimAll(program);
      
      await program.parseAsync(['node', 'test', 'claim-all', '--private-key', 'key']);
      
      expect(process.exitCode).toBe(1);
      const output = consoleOutput.join('\n');
      expect(output).toContain('failed');
    });
  });
});
