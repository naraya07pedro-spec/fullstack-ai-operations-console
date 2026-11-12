# Security Policy

## Scope and support

This is a **local engineering demonstration**, not a production service or managed customer deployment. The default branch is the maintained reference; there is no separately supported release line or security support commitment for past commits. Consult [known limitations](docs/KNOWN_LIMITATIONS.md) and [deployment boundaries](docs/DEPLOYMENT.md) before evaluating risk.

The current code models session/authentication, user ownership, approvals, bounded worker execution, and a deterministic ticket sandbox. Passing tests, a green CI run, or a zero-advisory npm audit **do not** certify the application or make a public production deployment safe.

## Report security issues privately

Please **do not publish exploit details, active credentials, private request payloads, or personal data in GitHub Issues or pull requests**.

1. If this repository has **Report a vulnerability** on its GitHub Security / Advisories page, submit a private vulnerability report there.
2. If that feature is unavailable, email the maintainer at **evannarayahp@gmail.com** with the subject `Security report: fullstack-ai-operations-console`. This address is already publicly listed by the maintainer; do not attach secrets or customer data.

For triage, include the affected commit SHA and version, relevant file or endpoint, expected versus observed behavior, and a minimal _synthetic-only_, non-destructive reproduction. State whether this affects authentication, authorization, CSRF/origin controls, approval boundaries, retry/lease recovery, secrets, dependency vulnerabilities, or the local container setup.

A published `SECURITY.md` does **not** enable GitHub's private vulnerability reporting setting. Maintainer notification/response timelines, bounties, and coordinated release schedules are **not promised**.

## Safe reproduction rules

- Use only disposable test accounts and synthetic data. Never point test commands at a real or production database. Integration tests can truncate the selected database; `ALLOW_TEST_DB_RESET=1` must be restricted to disposable test environments.
- The Compose stack is loopback-only and seeds demonstration accounts. Do not expose its services publicly.
- Do not share `.env`, `.env.test`, `.env.docker`, session cookies, tokens, or trace files containing sensitive information.
- A timeout or failed external request does not establish that its side effect was absent. Report uncertain outcomes and any recovery/replay behavior precisely.
- Before changing security-relevant code or dependencies, preserve review gates and test the affected failure mode. There is no auto-merge or production-release authorization from security tooling.

## Evidence and limitations

Refer to [test and architecture evidence](docs/EVIDENCE.md), [source-based limitations](docs/KNOWN_LIMITATIONS.md), and [CI workflow](.github/workflows/verify.yml) for revision-bound verification. The known-pattern secret scanner does not cover all Git history, binary objects, or all possible credentials; npm audit reflects known advisories at execution time only.
