# Full-Stack AI Operations Console — engineering case study

## Problem

An integration needs more than a successful API call. Operators need to inspect the configuration, approval, attempts, and outcome, including what happened after execution ownership was lost. A browser-only demonstration cannot establish these controls.

## Implementation

The console connects a Next.js/React interface to a Fastify REST API and PostgreSQL/Prisma persistence. Operators define versioned workflows, submit validated requests, make approval decisions, and inspect saved attempts/events. A standalone worker calls a real HTTP sandbox and commits results only under a current lease.

The engineering boundaries are concrete: persisted sessions and owner checks; optimistic workflow updates; admission idempotency; immutable snapshots; approval before outbound execution; bounded retries/timeouts; and transactional recovery after worker loss. Deterministic classification and synthetic tickets keep the evidence reproducible without private data or paid API access.

## Proof

An inspected native PostgreSQL CI run passed 55 unit/API/database/reliability checks and 10 browser checks. Sixteen authentic screenshots and a recorded workflow walkthrough accompany the source. The [evidence index](EVIDENCE.md) links demonstrated behavior to named tests, executed results, CI runs, and authentic screenshots. Unit checks cover contracts/credentials. Database/API cases cover ownership, rollback, concurrent admission, state transitions, real HTTP failures/timeouts, and process death. Browser tests drive the built UI against the running backend/database/worker/sandbox, with desktop/mobile recordings and selected states.

Screenshots document configuration, waiting approval, successful output, failures, rejection, and recovery of the same execution. Reports and videos stay in CI artifacts instead of bulky source binaries.

## Trade-offs and scope

PostgreSQL is the durable coordination boundary. Conditional updates and CHECK constraints enforce ownership/state rules. The sandbox's cache is process-local, so no universal exactly-once claim is made. Ownership is per user and self-approval is allowed. Local restricted-container PostgreSQL WASM evidence is distinguished from native PostgreSQL CI.

This demonstrates full-stack workflow control and reliability against a deterministic HTTP integration. Live LLM quality, customer outcomes, production hosting, and multi-year experience are outside the demonstrated scope.
