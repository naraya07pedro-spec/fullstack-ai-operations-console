import { z } from 'zod';
export function getConfig() {
  const c = z
    .object({
      DATABASE_URL: z.string().startsWith('postgresql://'),
      APP_ORIGIN: z.url().default('http://localhost:3000'),
      SANDBOX_URL: z.url().default('http://127.0.0.1:4100'),
      SANDBOX_TOKEN: z.string().min(24),
      NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    })
    .parse(process.env);
  const origin = new URL(c.APP_ORIGIN);
  if (c.APP_ORIGIN !== origin.origin)
    throw new Error('APP_ORIGIN must be an origin without a path');
  if (c.NODE_ENV === 'production' && origin.protocol !== 'https:')
    throw new Error('Production requires HTTPS APP_ORIGIN');
  const sandbox = new URL(c.SANDBOX_URL);
  if (
    !['http:', 'https:'].includes(sandbox.protocol) ||
    sandbox.username ||
    sandbox.password ||
    sandbox.search ||
    sandbox.hash
  )
    throw new Error('Invalid configured integration URL');
  return c;
}
