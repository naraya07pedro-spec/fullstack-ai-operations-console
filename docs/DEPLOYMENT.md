# Container setup and release boundary

## Reproducible local review

The [Dockerfile](../Dockerfile) builds TypeScript API, worker, sandbox and seed code into JavaScript. The application runtime omits development dependencies; the separate tools image retains the migration CLI. Next.js runs its traced standalone server with static assets copied into the image. All application images run as the `node` user. No image registry publication is configured.

The [Compose stack](../compose.yaml) contains PostgreSQL 16, a one-shot migration/demo bootstrap, API, worker, sandbox and web. Database health and successful bootstrap gate application startup; sandbox health gates the worker. Only `127.0.0.1:3000` is published. API/database/sandbox/worker have no host ports.

```bash
node scripts/setup-containers.mjs
docker compose --env-file .env.docker config --quiet
docker compose --env-file .env.docker up --build --detach --wait --wait-timeout 180
node --env-file=.env.docker scripts/container-smoke.mjs
```

The credential generator exclusively creates ignored `.env.docker` with random values. Keep it private. Read `DEMO_PASSWORD` there to sign in as `operator@example.test` or `viewer@example.test`. An existing file is never overwritten, preserving the credential used by an existing volume. Bootstrap also refuses `NODE_ENV=production`.

The [smoke script](../scripts/container-smoke.mjs) checks HTML/static asset delivery, the same-origin API rewrite, persisted login, approval gating, duplicate admission, ticket execution, rejection, actual HTTP 503 exhaustion/recovery, and viewer/owner isolation. Its executed output is `artifacts/container-smoke.json`.

For independent browser evidence against this running stack:

```bash
npm ci
npx playwright install --with-deps chromium
E2E_EXTERNAL_SERVICES=1 node --env-file=.env.docker node_modules/@playwright/test/cli.js test
```

The browser suite runs with real services, videos and traces. It uses no response mocks. It adds synthetic records to the local demo database. Use a fresh disposable stack when reproducing the CI screenshots/counts.

To stop services while preserving records:

```bash
docker compose --env-file .env.docker down
```

The named `console-data` volume holds demo PostgreSQL records. Do not remove it merely to stop the application. CI removes only its own disposable stack and volume after collecting evidence.

## CI delivery

[Verify workflow](../.github/workflows/verify.yml) has native-system and container jobs. The container job builds images locally, waits for health, runs HTTP smoke and desktop/mobile browser checks, then uploads reports, recordings, traces, container status and application logs. It does not push images or expose a public service. CI credentials are generated anew and registered as masked values before use. Browser traces contain only synthetic inputs and disposable sessions.

The exact inspected run/commit/artifact links are maintained in [EVIDENCE.md](EVIDENCE.md). A configuration file alone is not proof that a container ran successfully.

## Production requires a separate owner-approved release

This Compose configuration deliberately uses development-mode API cookies and seeds local demonstration accounts behind a loopback-only port. It is unsuitable as a public production deployment.

A production release needs an owner-approved hosting target, managed PostgreSQL/credentials, HTTPS origin and reverse proxy, real account provisioning, supervision, monitoring, backups and an explicit provider choice. Set `NODE_ENV=production` on the API/worker, configure an HTTPS `APP_ORIGIN`, and supply the correct build-time `API_URL`. Demo bootstrap cannot provision production users. The live-provider adapter and provider evaluation remain future work.

The branch/PR is the current delivery boundary. No production merge, image publication, domain change or hosting deployment is included.

Implementation references: [Next.js standalone output and monorepo tracing](https://nextjs.org/docs/app/api-reference/config/next-config-js/output), [Compose health/completion dependencies](https://docs.docker.com/compose/how-tos/startup-order/).
