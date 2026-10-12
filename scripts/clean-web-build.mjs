import { rmSync } from 'node:fs';
// Rebuild emitted HTML and client references together. Never remove source or evidence.
rmSync(new URL('../apps/web/.next', import.meta.url), { recursive: true, force: true });
