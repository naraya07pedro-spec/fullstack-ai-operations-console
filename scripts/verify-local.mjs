// Single parent process keeps database and child checks in the same network namespace.
// CI uses native PostgreSQL instead. Only the ignored local development databases are opened here.
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import { parseEnv } from 'node:util';
const phase = process.argv[2] ?? 'tests';
const environment = phase === 'tests' ? '.env.test' : '.env';
const env = { ...process.env, ...parseEnv(readFileSync(environment, 'utf8')), LOCAL_PGLITE: '1' };
const port = Number(new URL(env.DATABASE_URL).port);
const dir = `.local/postgres-${port}`;
mkdirSync(dir, { recursive: true });
const db = await PGlite.create(phase === 'e2e' ? undefined : dir),
  server = new PGLiteSocketServer({ db, port, host: '127.0.0.1', maxConnections: 30 });
await server.start();
console.log(`Local verification uses PostgreSQL WASM via TCP on port ${port}.`);
async function run(command, args, extra = {}) {
  const child = spawn(command, args, { env: { ...env, ...extra }, stdio: 'inherit' });
  return new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (code, signal) =>
      code === 0 ? resolve() : reject(new Error(`${command} failed: ${code ?? signal}`)),
    );
  });
}
try {
  await run(process.execPath, [
    'node_modules/prisma/build/index.js',
    'migrate',
    'deploy',
    '--schema',
    'prisma/schema.prisma',
  ]);
  if (phase === 'tests') {
    await run('npm', ['run', 'typecheck']);
    await run('npm', ['run', 'test:coverage']);
  } else {
    await run('npm', ['run', 'db:seed']);
    if (phase === 'e2e')
      await run('npm', ['run', 'test:e2e'], {
        PLAYWRIGHT_CHROMIUM_EXECUTABLE: new URL('../.local/browser/chromium', import.meta.url)
          .pathname,
        EVIDENCE_DIR: 'docs/screenshots',
        BROWSER_LIB_DIR: new URL('../.local/browser', import.meta.url).pathname,
      });
    else await run('npm', ['run', 'dev']);
  }
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await server.stop();
  await db.close();
}
