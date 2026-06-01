import { Command } from 'commander';
import { ApiError, post } from '../lib/api.js';
import { loadManifest } from '../lib/manifest.js';
import { fail, ok, theme } from '../lib/theme.js';

interface ValidationError {
  path: string[];
  message: string;
}

interface ValidationResponse {
  valid: boolean;
  errors?: ValidationError[];
  message?: string;
}

type ManifestType = 'agent' | 'prompt' | 'tool';

function inferTypeFromPath(path: string): ManifestType | null {
  const lower = path.toLowerCase();
  if (lower.includes('agent')) return 'agent';
  if (lower.includes('prompt')) return 'prompt';
  if (lower.includes('tool')) return 'tool';
  return null;
}

function formatJsonPath(path: string[]): string {
  if (path.length === 0) return '(root)';
  return path.map((p, i) => (i === 0 ? p : `[${p}]`)).join('.');
}

function formatValidationErrors(errors: ValidationError[]): string {
  const lines: string[] = [];
  errors.forEach((err, idx) => {
    const num = theme.error(`${idx + 1}.`);
    const path = theme.textMuted(formatJsonPath(err.path));
    const msg = theme.text(err.message);
    lines.push(`  ${num} ${path}`);
    lines.push(`     ${msg}`);
  });
  return lines.join('\n');
}

export function registerValidate(program: Command): void {
  program
    .command('validate')
    .description('Validate a manifest against the server schema without submitting.')
    .argument('[path]', 'Path to manifest JSON. Use "-" for stdin. Defaults to "-".')
    .option(
      '--type <type>',
      'Manifest type: agent, prompt, or tool. Auto-inferred from filename if omitted.',
    )
    .action(
      async (
        pathArg: string | undefined,
        opts: { type?: string },
      ) => {
        try {
          const path = pathArg ?? '-';
          let manifestType: ManifestType | null = null;

          if (opts.type) {
            const normalized = opts.type.toLowerCase();
            if (!['agent', 'prompt', 'tool'].includes(normalized)) {
              throw new Error(
                `Invalid --type "${opts.type}". Must be one of: agent, prompt, tool`,
              );
            }
            manifestType = normalized as ManifestType;
          } else if (path !== '-') {
            manifestType = inferTypeFromPath(path);
          }

          if (!manifestType) {
            throw new Error(
              'Cannot infer manifest type. Use --type agent|prompt|tool',
            );
          }

          const manifest = await loadManifest<Record<string, unknown>>(path);

          const endpoint = `/api/validate-${manifestType}`;
          
          try {
            const result = await post<ValidationResponse>(endpoint, manifest);

            if (result.valid) {
              console.log('');
              console.log(ok('Valid manifest'));
              console.log('');
              process.exitCode = 0;
            } else {
              console.log('');
              console.log(fail('Invalid manifest'));
              if (result.errors && result.errors.length > 0) {
                console.log('');
                console.log(formatValidationErrors(result.errors));
              } else if (result.message) {
                console.log(`  ${theme.text(result.message)}`);
              }
              console.log('');
              process.exitCode = 1;
            }
          } catch (err) {
            if (err instanceof ApiError && err.status === 404) {
              console.log('');
              console.log(
                fail(
                  `Validation endpoint not yet available for ${manifestType} manifests.`,
                ),
              );
              console.log(
                `  ${theme.textMuted('The server needs to implement')} ${theme.text(endpoint)}`,
              );
              console.log('');
              process.exitCode = 1;
            } else {
              throw err;
            }
          }
        } catch (err) {
          console.log('');
          if (err instanceof ApiError) {
            console.log(fail(err.message));
          } else {
            console.log(fail(err instanceof Error ? err.message : String(err)));
          }
          console.log('');
          process.exitCode = 1;
        }
      },
    );
}
