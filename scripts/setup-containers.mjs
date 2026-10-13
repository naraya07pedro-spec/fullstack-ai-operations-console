import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';

// Exclusive creation preserves the password of an existing persisted demo database.
writeFileSync(
  '.env.docker',
  `POSTGRES_PASSWORD=${randomBytes(32).toString('hex')}\nSANDBOX_TOKEN=${randomBytes(32).toString('hex')}\nDEMO_PASSWORD=${randomBytes(24).toString('base64url')}\n`,
  { flag: 'wx', mode: 0o600 },
);
console.log(
  'Created ignored .env.docker with random local demo credentials. No credentials logged.',
);
