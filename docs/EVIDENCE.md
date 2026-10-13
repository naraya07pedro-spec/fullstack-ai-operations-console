# Engineering evidence index

Implementation and executed verification are separated. The links below identify executed checks, authentic visual captures, and their exact source files.

| Claim                                                                 | Source                                                                                                           | Executable proof                                                                                       |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Validated input and bounded policy                                    | [contracts](../packages/contracts/src/index.ts)                                                                  | [unit tests](../tests/unit/contracts.test.ts)                                                          |
| Passwords, sessions, expiry/revocation, Origin/CSRF, roles, ownership | [auth](../apps/api/src/auth.ts), [API](../apps/api/src/app.ts)                                                   | Authentication/authorization negative cases in [system tests](../tests/integration/system.test.ts)     |
| CRUD, optimistic versions, snapshots, archive/history                 | [API](../apps/api/src/app.ts), [schema](../prisma/schema.prisma)                                                 | CRUD/version/rollback cases in system tests                                                            |
| Duplicate admissions and conflicting content                          | [engine](../apps/api/src/engine.ts)                                                                              | Sequential, eight-concurrent, different-owner and conflict cases                                       |
| Approval gates outbound requests                                      | [decisions and claims](../apps/api/src/engine.ts)                                                                | Zero-request rejection/pre-approval and racing-decision cases                                          |
| Ownership, retry, timeout, worker failure, recovery                   | [worker](../apps/api/src/worker-main.ts), [engine](../apps/api/src/engine.ts)                                    | Real HTTP and SIGKILL reliability cases                                                                |
| Database invariants                                                   | [schema](../prisma/schema.prisma), [SQL constraints](../prisma/migrations/202610120002_invariants/migration.sql) | Foreign-key, CHECK, uniqueness, rollback tests                                                         |
| Real frontend/backend/database interaction                            | [UI](../apps/web/app/page.tsx), [browser configuration](../playwright.config.ts)                                 | [Desktop/mobile browser tests](../tests/e2e/console.spec.ts)                                           |
| Known secret/dependency checks                                        | [scanner](../scripts/scan-secrets.mjs), [audit](../scripts/dependency-audit.mjs)                                 | [Scanner negative tests](../tests/unit/security-scanner.test.ts) and audit artifact                    |
| Actual CI and source packaging                                        | [workflow](../.github/workflows/verify.yml)                                                                      | Exact inspected GitHub run/artifact links recorded below                                               |
| Compiled container runtime and isolated service boundaries            | [Dockerfile](../Dockerfile), [Compose](../compose.yaml), [setup and release boundary](DEPLOYMENT.md)             | [Container HTTP smoke](../scripts/container-smoke.mjs), the same browser suite in the container CI job |
| Ephemeral credential masks and sanitized container log artifacts      | [CI generator](../scripts/ci-credentials.mjs), [collector](../scripts/collect-container-evidence.mjs)            | [Executed CI security regression tests](../tests/unit/ci-security.test.ts)                             |
| Formatting, lint and strict compilation                               | [ESLint configuration](../eslint.config.mjs), [runtime TypeScript configuration](../tsconfig.runtime.json)       | CI steps and local executable checks                                                                   |

## Executed verification

- **Previously inspected native PostgreSQL CI:** [run 38288870634](https://github.com/naraya07pedro-spec/fullstack-ai-operations-console/actions/runs/38288870634), reviewed PR head `751a28f939f4877c237ed6c939718d2d19264248`. All steps passed, including **55/55 unit/API/database/authorization/reliability tests and 10/10 desktop/mobile browser cases**. This baseline executed the native database constraint-error case that the local bridge cannot relay. [Earlier implementation run](https://github.com/naraya07pedro-spec/fullstack-ai-operations-console/actions/runs/38287930268) is retained as historical evidence.
- **Latest local PostgreSQL WASM fallback, 13 October 2026:** [VERIFICATION.json](VERIFICATION.json) records **57 passed, 0 failed, 1 explicitly native-only skipped**; **10/10 browser cases passed without retries/flakes** against the built standalone frontend. The three added security cases verify CI credential masking, artifact redaction, and refusal to overwrite local credentials. The summary records selected API/contracts coverage, a complete source SHA-256 inventory, and hashes/dimensions of all 16 newly captured screenshots.
- **Container/native re-verification:** pending the feature-branch CI run. Container configuration/build success is not claimed until the actual Docker job is inspected. The local host has no Docker CLI/daemon; native/container proof is collected in GitHub Actions.
- **Coverage scope:** API/auth/config/engine/errors/sandbox and shared contracts only; frontend and process launchers are excluded. Latest inspected local report: 95.87% statements, 92.92% branches, 96.42% functions, 98.03% lines. The CI artifact contains its independently generated report.
- **Security checks:** npm advisory response reported 0 vulnerabilities across all installed dependencies. Known-pattern scan passed. HTTP/API negative cases executed for wrong/expired/revoked/forged sessions, role/owner isolation, Origin/CSRF, invalid/oversized input, redirects, response validation, and integration authentication. These are bounded verification claims, not a penetration-test certification.
- **Reliability outcomes:** eight simultaneous admissions produced one run; racing decisions produced one outcome; approval rejection sent zero integration requests; real HTTP 503 retried successfully; timeout exhausted its configured two attempts; HTTP 422 stopped after one attempt; manual recovery retained the same run ID; a real worker SIGKILL was followed by lease recovery and successful replay with one sandbox ticket; stale ownership could not commit. Named cases and outputs are in `tests/integration/system.test.ts` and the CI test-report artifact.

The inspected run includes global status filtering, stable cursor pages during polling, mobile sign-out, keyboard focus, reduced motion, and escaped hostile input. A clean build removes stale generated output before compilation.

## Authentic visual proof and recording

[Selected screenshot gallery](screenshots/README.md) links dashboard, configuration, history, waiting approval, successful output, failure, recovery, and rejection in desktop/mobile views. Required states are asserted by browser tests. Desktop/mobile layouts and approval/failure/recovery frames were visually inspected; all 16 PNG hashes and dimensions are validated in [VERIFICATION.json](VERIFICATION.json). Counts and messages come from synthetic persisted test records.

The latest complete desktop walkthrough was recorded directly from the running application and inspected with FFprobe and extracted frames: **16.64 seconds, 1440 × 1000, VP9** for the 13 October local capture. It covers sign-in, workflow configuration, approval, integration output, execution history, actual 503 failure, recovery, rejection, and dashboard outcomes. CI produces its own independent recordings; capture durations are not interchangeable.

[Previous CI evidence artifact](https://github.com/naraya07pedro-spec/fullstack-ai-operations-console/actions/runs/38288870634/artifacts/11764334189) contains the baseline native run outputs below. The new container/native artifact links will be added after inspection:

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
