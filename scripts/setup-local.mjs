import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
const password = randomBytes(18).toString('base64url'),
  integrationToken = randomBytes(32).toString('hex');
if (existsSync('.env') || existsSync('.env.test'))
  throw new Error('Local environment already exists; keep its credentials or move it before setup');
writeFileSync(
  '.env',
  `DATABASE_URL=postgresql://postgres:local-only@127.0.0.1:5433/postgres?connection_limit=1&pgbouncer=true\nAPP_ORIGIN=http://localhost:3000\nSANDBOX_URL=http://127.0.0.1:4100\nSANDBOX_TOKEN=${integrationToken}\nDEMO_PASSWORD=${password}\nAPI_PORT=4000\nSANDBOX_PORT=4100\nNODE_ENV=development\n`,
  { mode: 0o600 },
);
writeFileSync(
  '.env.test',
  `DATABASE_URL=postgresql://postgres:local-only@127.0.0.1:5434/postgres?connection_limit=1&pgbouncer=true\nAPP_ORIGIN=http://localhost:3000\nSANDBOX_URL=http://127.0.0.1:4101\nSANDBOX_TOKEN=${randomBytes(32).toString('hex')}\nALLOW_TEST_DB_RESET=1\nNODE_ENV=test\n`,
  { mode: 0o600 },
);
console.log(
  'Created ignored .env and .env.test with random credentials. Read DEMO_PASSWORD privately from .env to sign in.',
);
