import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { buildSandbox } from '../../apps/api/src/sandbox.js';

describe('sandbox full-contract idempotency', () => {
  it('rejects different modes or attempt policies under a completed event key', async () => {
    const sandbox = await buildSandbox('synthetic-unit-token');
    const key = randomUUID();
    const headers = {
      authorization: 'Bearer synthetic-unit-token',
      'idempotency-key': key,
      'x-attempt': '1',
    };
    const payload = {
      input: { message: 'A bounded deterministic ticket' },
      mode: 'success',
      maxAttempts: 3,
    };
    try {
      const first = await sandbox.app.inject({
        method: 'POST',
        url: '/tickets',
        headers,
        payload,
      });
      expect(first.statusCode).toBe(200);
      const replay = await sandbox.app.inject({
        method: 'POST',
        url: '/tickets',
        headers: { ...headers, 'x-attempt': '2' },
        payload,
      });
      expect(replay.statusCode).toBe(200);
      expect(replay.json()).toEqual(first.json());
      const differentMode = await sandbox.app.inject({
        method: 'POST',
        url: '/tickets',
        headers,
        payload: { ...payload, mode: 'slow' },
      });
      expect(differentMode.statusCode).toBe(409);
      expect(differentMode.json()).toEqual({ code: 'IDEMPOTENCY_CONFLICT' });
      const differentPolicy = await sandbox.app.inject({
        method: 'POST',
        url: '/tickets',
        headers,
        payload: { ...payload, maxAttempts: 5 },
      });
      expect(differentPolicy.statusCode).toBe(409);
      expect(sandbox.stats(key)).toEqual({ requests: 4, tickets: 1 });
    } finally {
      await sandbox.app.close();
    }
  });

  it('rejects changed policy while the same-key sandbox call is in flight', async () => {
    const sandbox = await buildSandbox('synthetic-unit-token');
    const key = randomUUID();
    const headers = {
      authorization: 'Bearer synthetic-unit-token',
      'idempotency-key': key,
      'x-attempt': '1',
    };
    const payload = {
      input: { message: 'A delayed deterministic ticket' },
      mode: 'slow',
      maxAttempts: 3,
    };
    try {
      const pending = sandbox.app.inject({
        method: 'POST',
        url: '/tickets',
        headers,
        payload,
      });
      await vi.waitFor(() => expect(sandbox.stats(key).requests).toBe(1));
      const conflict = await sandbox.app.inject({
        method: 'POST',
        url: '/tickets',
        headers,
        payload: { ...payload, maxAttempts: 5 },
      });
      expect(conflict.statusCode).toBe(409);
      expect(conflict.json()).toEqual({ code: 'IDEMPOTENCY_CONFLICT' });
      const accepted = await pending;
      expect(accepted.statusCode).toBe(200);
      expect(sandbox.stats(key)).toEqual({ requests: 2, tickets: 1 });
    } finally {
      await sandbox.app.close();
    }
  });
});
