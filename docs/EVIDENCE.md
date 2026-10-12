# Engineering evidence index

Implementation and executed verification are separated. The links below identify executed checks, authentic visual captures, and their exact source files.

| Claim                                                                 | Source                                                                                                           | Executable proof                                                                                   |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Validated input and bounded policy                                    | [contracts](../packages/contracts/src/index.ts)                                                                  | [unit tests](../tests/unit/contracts.test.ts)                                                      |
| Passwords, sessions, expiry/revocation, Origin/CSRF, roles, ownership | [auth](../apps/api/src/auth.ts), [API](../apps/api/src/app.ts)                                                   | Authentication/authorization negative cases in [system tests](../tests/integration/system.test.ts) |
| CRUD, optimistic versions, snapshots, archive/history                 | [API](../apps/api/src/app.ts), [schema](../prisma/schema.prisma)                                                 | CRUD/version/rollback cases in system tests                                                        |
| Duplicate admissions and conflicting content                          | [engine](../apps/api/src/engine.ts)                                                                              | Sequential, eight-concurrent, different-owner and conflict cases                                   |
| Approval gates outbound requests                                      | [decisions and claims](../apps/api/src/engine.ts)                                                                | Zero-request rejection/pre-approval and racing-decision cases                                      |
| Ownership, retry, timeout, worker failure, recovery                   | [worker](../apps/api/src/worker-main.ts), [engine](../apps/api/src/engine.ts)                                    | Real HTTP and SIGKILL reliability cases                                                            |
| Database invariants                                                   | [schema](../prisma/schema.prisma), [SQL constraints](../prisma/migrations/202610120002_invariants/migration.sql) | Foreign-key, CHECK, uniqueness, rollback tests                                                     |
| Real frontend/backend/database interaction                            | [UI](../apps/web/app/page.tsx), [browser configuration](../playwright.config.ts)                                 | [Desktop/mobile browser tests](../tests/e2e/console.spec.ts)                                       |
| Known secret/dependency checks                                        | [scanner](../scripts/scan-secrets.mjs), [audit](../scripts/dependency-audit.mjs)                                 | [Scanner negative tests](../tests/unit/security-scanner.test.ts) and audit artifact                |
| Actual CI and source packaging                                        | [workflow](../.github/workflows/verify.yml)                                                                      | Exact inspected GitHub run/artifact links recorded below                                           |

## Executed verification

- **Native PostgreSQL CI:** [run 38287930268](https://github.com/naraya07pedro-spec/fullstack-ai-operations-console/actions/runs/38287930268), reviewed PR head `c0d83f0107d9ead0777a4fbd31e4e9a8c767e99b`. All workflow steps passed, including **55/55 unit/API/database/authorization/reliability tests and 10/10 desktop/mobile browser cases**, production frontend build, dependency/secret checks, evidence fingerprints, and review-source packaging. This executed the native database constraint-error case that the local bridge cannot relay.
- **Local PostgreSQL WASM fallback:** [VERIFICATION.json](VERIFICATION.json) contains **54 passed, 0 failed, 1 explicitly native-only skipped**; **10/10 browser cases passed without retries/flakes**. It records the selected API/contracts coverage, source SHA-256 fingerprints, and hashes/dimensions of all 16 screenshots.
- **Coverage scope:** API/auth/config/engine/errors/sandbox and shared contracts only; frontend and process launchers are excluded. Latest inspected local report: 95.87% statements, 92.92% branches, 96.42% functions, 98.03% lines. The CI artifact contains its independently generated report.
- **Security checks:** npm advisory response reported 0 vulnerabilities across all installed dependencies. Known-pattern scan passed. HTTP/API negative cases executed for wrong/expired/revoked/forged sessions, role/owner isolation, Origin/CSRF, invalid/oversized input, redirects, response validation, and integration authentication. These are bounded verification claims, not a penetration-test certification.
- **Reliability outcomes:** eight simultaneous admissions produced one run; racing decisions produced one outcome; approval rejection sent zero integration requests; real HTTP 503 retried successfully; timeout exhausted its configured two attempts; HTTP 422 stopped after one attempt; manual recovery retained the same run ID; a real worker SIGKILL was followed by lease recovery and successful replay with one sandbox ticket; stale ownership could not commit. Named cases and outputs are in `tests/integration/system.test.ts` and the CI test-report artifact.

The inspected run includes global status filtering, stable cursor pages during polling, mobile sign-out, keyboard focus, reduced motion, and escaped hostile input. A clean build removes stale generated output before compilation.

## Authentic visual proof and recording

[Selected screenshot gallery](screenshots/README.md) links dashboard, configuration, history, waiting approval, successful output, failure, recovery, and rejection in desktop/mobile views. Required states are asserted by browser tests. Desktop/mobile layouts and approval/failure/recovery frames were visually inspected; all 16 PNG hashes and dimensions are validated in [VERIFICATION.json](VERIFICATION.json). Counts and messages come from synthetic persisted test records.

The complete desktop walkthrough was recorded directly from the running application and inspected with FFprobe: **19.04 seconds, 1440 × 1000, VP9** for the local capture. It covers sign-in, workflow configuration, approval, integration output, execution history, actual 503 failure, recovery, rejection, and dashboard outcomes. CI produces its own independent recordings.

[CI evidence artifact](https://github.com/naraya07pedro-spec/fullstack-ai-operations-console/actions/runs/38287930268/artifacts/11763593752) contains:

| Artifact path                                                                                           | Evidence                                             |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `artifacts/test-results.json` and `artifacts/test-results.xml`                                          | Individual unit/API/database/reliability outcomes    |
| `artifacts/coverage/coverage-summary.json`                                                              | Scoped executed coverage                             |
| `artifacts/e2e-results.json`                                                                            | Browser outcomes, project names, durations, retries  |
| `artifacts/dependency-audit.json`                                                                       | Exact npm advisory response                          |
| `artifacts/screenshots/`                                                                                | Independent native-CI browser captures               |
| `test-results/console-complete-workflow--49c0c-thentic-states-and-recovery-desktop-chromium/video.webm` | Complete authentic desktop walkthrough               |
| `test-results/**/trace.zip` and videos                                                                  | Browser actions, requests, snapshots and recordings  |
| `playwright-report/index.html`                                                                          | Reviewable HTML browser report                       |
| `artifacts/reviewed-source.tar.gz`                                                                      | Exact reviewed-source release package; no deployment |

Artifacts have 14-day retention and may require GitHub sign-in; the selected PNGs, source/test files, documentation, and concise verification summary are retained in Git. No video or bulky disposable report is committed.

## Reproduce and inspect

Use the [README](../README.md) with a disposable database. CI uses native `postgres:16`. The local harness explicitly identifies its PGlite fallback. E2E drives the built UI without DOM replacement, mocked API responses, generated screenshots, or manufactured recordings.

Selected screenshots stay under `docs/screenshots/`. Videos/traces/reports are CI artifacts. [Architecture](ARCHITECTURE.md), [API](API.md), [decisions](DECISIONS.md), [case study](PORTFOLIO_CASE_STUDY.md), and [limitations](KNOWN_LIMITATIONS.md) define the engineering scope.

No production merge/deployment is included in this review deliverable.
