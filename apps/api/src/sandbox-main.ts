import { buildSandbox } from './sandbox.js';
import { getConfig } from './config.js';
const config = getConfig(),
  { app } = await buildSandbox(config.SANDBOX_TOKEN);
await app.listen({ port: Number(process.env.SANDBOX_PORT ?? 4100), host: '127.0.0.1' });
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, async () => {
    await app.close();
    process.exit(0);
  });
