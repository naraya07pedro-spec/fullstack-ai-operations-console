import { randomBytes } from 'node:crypto';
import { appendFileSync, writeFileSync } from 'node:fs';

if (!process.env.GITHUB_ENV)
  throw new Error('This credential generator is only for GitHub Actions');
const entries = [
  ['SANDBOX_TOKEN', randomBytes(32).toString('hex')],
  ['DEMO_PASSWORD', randomBytes(24).toString('base64url')],
  ['POSTGRES_PASSWORD', randomBytes(32).toString('hex')],
];
// Register masks before these values enter any subsequent step's environment or log.
for (const [, value] of entries) process.stdout.write(`::add-mask::${value}\n`);
const environment = entries.map(([key, value]) => `${key}=${value}\n`).join('');
appendFileSync(process.env.GITHUB_ENV, environment);
if (process.argv.includes('--containers'))
  writeFileSync('.env.docker', environment, { flag: 'wx', mode: 0o600 });
