import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { redactCredentials } from './redact-credentials.mjs';

mkdirSync('artifacts', { recursive: true });
for (const [filename, args] of [
  ['container-status.txt', ['ps', '--all']],
  ['container-logs.txt', ['logs', '--no-color']],
]) {
  const result = spawnSync('docker', ['compose', '--env-file', '.env.docker', ...args], {
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  });
  const text = redactCredentials(`${result.stdout ?? ''}\n${result.stderr ?? ''}`, [
    process.env.SANDBOX_TOKEN,
    process.env.DEMO_PASSWORD,
    process.env.POSTGRES_PASSWORD,
  ]);
  writeFileSync(`artifacts/${filename}`, text);
  if (result.status !== 0) process.exitCode = 1;
}
