# REST API

Fastify defaults to loopback port 4000. Backend paths are listed below. The browser uses `/api/...`, rewritten to `/v1/...`. JSON body limit: 16 KiB. All routes except health/login require the `ops_session` cookie. All authenticated mutations require matching `Origin` and `X-CSRF-Token`. Login also checks Origin. Cookies are HttpOnly, SameSite=Strict, eight-hour expiry, and Secure in production.

| Method/path | Permission | Input / outcome |
| --- | --- | --- |
| `GET /health` | Public | Database connectivity; generic error on failure |
| `POST /v1/auth/login` | Origin checked | `{email,password}` → user summary, CSRF token, cookie; 401/429 |
| `GET /v1/auth/me` | Signed in | Current user and CSRF token |
| `POST /v1/auth/logout` | Signed in | Delete session; clear cookie |
| `GET /v1/workflows` | Owner | Up to 100 active records as `{items}` |
| `POST /v1/workflows` | Operator | Full contract → 201, version 1 |
| `PATCH /v1/workflows/:id` | Operator + owner | Full contract + current `version`; 409 if stale |
| `DELETE /v1/workflows/:id` | Operator + owner | Soft archive; history retained |
| `POST /v1/workflows/:id/runs` | Operator + owner | `{message}` + `Idempotency-Key` → `{run,replayed}`, 201/200; conflict 409 |
| `GET /v1/runs` | Owner | `limit` 1–50, optional status and UUID cursor → `{items,nextCursor}` |
| `GET /v1/runs/:id` | Owner | Run snapshot/input/output, ordered attempts/events |
| `POST /v1/runs/:id/decision` | Operator + owner | `{decision:"approve" or "reject"}`; 409 if already decided |
| `POST /v1/runs/:id/retry` | Operator + owner | Recover only failed runs, at most three cycles; same run ID |
| `GET /v1/dashboard` | Owner | Active workflow count, state counts, six recent runs |

## Workflow contract

```json
{"name":"Support triage","description":"Review before ticket creation.","requiresApproval":true,"maxAttempts":3,"timeoutMs":3000,"sandboxMode":"success"}
```

Trimmed names: 3–80 characters. Description: ≤500 characters. Attempts: integer 1–5. Timeout: integer 100–10,000 ms. Execution message: trimmed, 3–2,000 characters. Unknown fields are rejected. Idempotency keys are 8–100 alphanumeric/underscore/hyphen characters and scoped to an owner. Reusing a key for different input/workflow conflicts.

Sandbox modes: `success`; `flaky` (503 first attempt); `recoverable` (503 until initial attempt budget is consumed); `failure` (422); `timeout` (12-second delay); `slow` (1.5-second delay). These are explicit local fault controls, not provider claims.

## Errors and sandbox

Error shape: `{code,message,requestId}`, with field paths/messages for validation. Credentials, upstream bodies, and stacks are not returned. 401: invalid session. 403: role/Origin/CSRF. 404: missing or foreign resource. 409: version/state/idempotency conflict. 413: oversized body. Upstream failures persist as run outcomes.

`POST /tickets` on the configured sandbox requires backend-only bearer authorization, a UUID idempotency key equal to run ID, and `X-Attempt`. It returns ticket ID, category (billing/technical/general), priority (normal/urgent), bounded summary, and `provider: deterministic-sandbox`. Cached and in-flight deduplication is process-local, not restart-durable.
