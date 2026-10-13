import { it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
// @ts-expect-error The executable JS helper is tested directly, without a TS declaration wrapper.
import { redactCredentials } from '../../scripts/redact-credentials.mjs';

it('registers a GitHub mask for every ephemeral exported/container credential', () => {
  const dir = mkdtempSync(join(tmpdir(), 'console-ci-security-'));
  try {
    const result = spawnSync(
      process.execPath,
      [resolve('scripts/ci-credentials.mjs'), '--containers'],
      {
        cwd: dir,
        env: { ...process.env, GITHUB_ENV: join(dir, 'github-env') },
        encoding: 'utf8',
      },
    );
    expect(result.status).toBe(0);
    const exported = readFileSync(join(dir, 'github-env'), 'utf8');
    expect(readFileSync(join(dir, '.env.docker'), 'utf8')).toBe(exported);
    const values = exported
      .trim()
      .split('\n')
      .map((line) => line.slice(line.indexOf('=') + 1));
    expect(values).toHaveLength(3);
    expect(values.every((value) => value.length >= 32)).toBe(true);
    expect(result.stdout.trim().split('\n')).toEqual(values.map((value) => `::add-mask::${value}`));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

it('redacts exact credentials inside artifact text, including URL passwords and special characters', () => {
  const password = 'synthetic-credential-$[test]?';
  const text = `postgresql://console:${password}@postgres/demo\nvalue=${password}\nkeep this`;
  const redacted = redactCredentials(text, [undefined, '', password]);
  expect(redacted).not.toContain(password);
  expect(redacted).toContain('postgresql://console:[REDACTED]@postgres/demo');
  expect(redacted).toContain('keep this');
});

it('refuses to overwrite an existing local container credential file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'console-container-security-'));
  try {
    const script = resolve('scripts/setup-containers.mjs');
    expect(spawnSync(process.execPath, [script], { cwd: dir }).status).toBe(0);
    const original = readFileSync(join(dir, '.env.docker'), 'utf8');
    expect(spawnSync(process.execPath, [script], { cwd: dir }).status).not.toBe(0);
    expect(readFileSync(join(dir, '.env.docker'), 'utf8')).toBe(original);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
