import { cpSync, existsSync } from 'node:fs';

const root = new URL('../apps/web/', import.meta.url);
const server = new URL('.next/standalone/apps/web/server.js', root);
if (!existsSync(server))
  throw new Error('Build the frontend before starting its standalone server');
cpSync(new URL('.next/static', root), new URL('.next/standalone/apps/web/.next/static', root), {
  recursive: true,
});
if (existsSync(new URL('public', root)))
  cpSync(new URL('public', root), new URL('.next/standalone/apps/web/public', root), {
    recursive: true,
  });
process.env.PORT ??= '3000';
process.env.HOSTNAME = process.env.WEB_HOST ?? '0.0.0.0';
await import(server.href);
