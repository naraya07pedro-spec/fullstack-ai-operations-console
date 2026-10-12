// Linux fallback for containers where Playwright's CDN or tar ownership is unavailable.
// This extracts the real Chromium shipped by @sparticuz/chromium. No screenshot rendering is simulated.
import { brotliDecompressSync } from 'node:zlib';
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  chmodSync,
  copyFileSync,
  existsSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
const dest = resolve('.local/browser');
mkdirSync(dest, { recursive: true });
const source = resolve('node_modules/@sparticuz/chromium/bin');
writeFileSync(`${dest}/chromium`, brotliDecompressSync(readFileSync(`${source}/chromium.br`)));
chmodSync(`${dest}/chromium`, 0o755);
for (const name of ['fonts', 'swiftshader', 'al2023']) {
  const tarPath = `${dest}/${name}.tar`;
  writeFileSync(tarPath, brotliDecompressSync(readFileSync(`${source}/${name}.tar.br`)));
  const result = spawnSync('tar', ['--no-same-owner', '-xf', tarPath, '-C', dest]);
  if (result.status !== 0) throw new Error(`Browser extraction failed: ${name}`);
}
console.log(`Extracted real Chromium to ${dest}/chromium`);
const revision = JSON.parse(
  readFileSync('node_modules/playwright-core/browsers.json', 'utf8'),
).browsers.find((b) => b.name === 'ffmpeg').revision;
const ffmpegDir = resolve(
  process.env.PLAYWRIGHT_BROWSERS_PATH ?? `${homedir()}/.cache/ms-playwright`,
  `ffmpeg-${revision}`,
);
if (existsSync('/usr/bin/ffmpeg')) {
  mkdirSync(ffmpegDir, { recursive: true });
  copyFileSync('/usr/bin/ffmpeg', `${ffmpegDir}/ffmpeg-linux`);
  chmodSync(`${ffmpegDir}/ffmpeg-linux`, 0o755);
  console.log('Using the installed FFmpeg for authentic browser recording.');
}
