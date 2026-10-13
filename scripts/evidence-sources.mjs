import { execFileSync } from 'node:child_process';

const source =
  /^(apps\/|packages\/|prisma\/|tests\/|scripts\/|\.github\/workflows\/|package(?:-lock)?\.json$|tsconfig(?:\.runtime)?\.json$|(?:vitest\.config|playwright\.config)\.ts$|Dockerfile$|compose\.yaml$|\.dockerignore$|\.gitignore$|\.prettier(?:rc\.json|ignore)$|eslint\.config\.mjs$)/;
export function evidenceSourcePaths() {
  return [
    ...new Set(
      execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
        encoding: 'utf8',
      })
        .split('\0')
        .filter(Boolean),
    ),
  ]
    .filter((path) => source.test(path) && path !== 'apps/web/next-env.d.ts')
    .sort();
}
