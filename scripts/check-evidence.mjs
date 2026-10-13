import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { evidenceSourcePaths } from './evidence-sources.mjs';
const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const documents = [
  'README.md',
  ...readdirSync('docs')
    .filter((n) => n.endsWith('.md'))
    .map((n) => `docs/${n}`),
  'docs/screenshots/README.md',
];
let links = 0;
for (const document of documents) {
  const text = readFileSync(document, 'utf8');
  for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1].split('#')[0];
    if (!target || /^https?:/.test(target)) continue;
    if (!existsSync(resolve(dirname(document), target)))
      throw new Error(`Broken evidence link in ${document}: ${target}`);
    links++;
  }
}
const report = JSON.parse(readFileSync('docs/VERIFICATION.json', 'utf8'));
if (
  JSON.stringify(report.sourceFiles.map((file) => file.path)) !==
  JSON.stringify(evidenceSourcePaths())
)
  throw new Error('Evidence source inventory is incomplete or no longer matches the repository');
for (const file of [...report.sourceFiles, ...report.screenshots])
  if (sha(file.path) !== file.sha256) throw new Error(`Evidence fingerprint differs: ${file.path}`);
for (const state of [
  'dashboard',
  'workflow-creation',
  'execution-history',
  'approval',
  'failure',
  'recovery',
])
  for (const prefix of ['', 'mobile-'])
    if (!existsSync(`docs/screenshots/${prefix}${state}.png`))
      throw new Error(`Missing required screenshot: ${prefix}${state}`);
if (
  report.tests.failed ||
  report.browser.failed ||
  report.browser.flaky ||
  report.dependencyAudit.total
)
  throw new Error('Evidence reports a failed check');
console.log(
  JSON.stringify({
    status: 'passed',
    relativeLinks: links,
    sourceFingerprints: report.sourceFiles.length,
    screenshotFingerprints: report.screenshots.length,
  }),
);
