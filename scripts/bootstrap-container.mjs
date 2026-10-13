import { spawnSync } from 'node:child_process';

if (process.env.NODE_ENV === 'production')
  throw new Error('Container demo bootstrap must not seed a production environment');
for (const args of [
  ['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema', 'prisma/schema.prisma'],
  ['dist/prisma/seed.js'],
]) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
