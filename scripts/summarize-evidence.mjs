import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const unit = read('artifacts/test-results.json'),
  e2e = read('artifacts/e2e-results.json'),
  coverage = read('artifacts/coverage/coverage-summary.json'),
  audit = read('artifacts/dependency-audit.json');
if (
  unit.numFailedTests ||
  !unit.success ||
  e2e.stats.unexpected ||
  e2e.stats.flaky ||
  e2e.stats.skipped ||
  audit.metadata.vulnerabilities.total
)
  throw new Error(
    'Failed, flaky, skipped browser checks or dependency advisories cannot be summarized as verified',
  );
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const candidates = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
  { encoding: 'utf8' },
)
  .split('\0')
  .filter(Boolean);
const sourceFiles = [...new Set(candidates)]
  .filter((p) =>
    /^(apps\/|packages\/|prisma\/|tests\/|scripts\/|\.github\/workflows\/|package(?:-lock)?\.json|tsconfig\.json|(?:vitest\.config|playwright\.config)\.ts)/.test(
      p,
    ),
  )
  .filter((p) => p !== 'apps/web/next-env.d.ts')
  .sort()
  .map((path) => ({ path, sha256: sha(readFileSync(path)) }));
const screenshots = readdirSync('docs/screenshots')
  .filter((n) => n.endsWith('.png'))
  .sort()
  .map((name) => {
    const bytes = readFileSync(`docs/screenshots/${name}`);
    return {
      path: `docs/screenshots/${name}`,
      sha256: sha(bytes),
      bytes: bytes.length,
      width: bytes.readUInt32BE(16),
      height: bytes.readUInt32BE(20),
    };
  });
const result = {
  date: new Date(unit.startTime).toISOString(),
  scope:
    'Local executed proof. Native PostgreSQL results and exact CI commit are indexed separately in EVIDENCE.md.',
  database: 'PostgreSQL WASM / PGlite development fallback',
  tests: {
    passed: unit.numPassedTests,
    failed: unit.numFailedTests,
    nativeOnlySkipped: unit.numPendingTests,
  },
  browser: {
    passed: e2e.stats.expected,
    failed: e2e.stats.unexpected,
    flaky: e2e.stats.flaky,
    projects: e2e.config.projects.map((p) => p.name),
  },
  coverage: {
    scope:
      'Selected API/auth/config/engine/errors/sandbox and shared contract source; excludes frontend and process launchers',
    statements: coverage.total.statements.pct,
    branches: coverage.total.branches.pct,
    functions: coverage.total.functions.pct,
    lines: coverage.total.lines.pct,
  },
  dependencyAudit: audit.metadata.vulnerabilities,
  sourceTreeSha256: sha(JSON.stringify(sourceFiles)),
  sourceFiles,
  screenshots,
};
writeFileSync('docs/VERIFICATION.json', JSON.stringify(result, null, 2) + '\n');
console.log(
  JSON.stringify({
    tests: result.tests,
    browser: result.browser,
    screenshots: screenshots.length,
    sourceTreeSha256: result.sourceTreeSha256,
  }),
);
