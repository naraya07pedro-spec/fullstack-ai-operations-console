# Authentic application screenshots

Captured by `tests/e2e/console.spec.ts` against the built frontend, running API, PostgreSQL WASM development database, worker, and HTTP sandbox. These are browser captures at CSS pixel scale with synthetic test accounts/input. No generated imagery, response mocks, or reconstructed states are used.

| State                  | Desktop                           | Mobile                                  | Visible evidence                                                   |
| ---------------------- | --------------------------------- | --------------------------------------- | ------------------------------------------------------------------ |
| Dashboard              | [desktop](dashboard.png)          | [mobile](mobile-dashboard.png)          | Actual persisted counts and recent outcomes                        |
| Workflow configuration | [desktop](workflow-creation.png)  | [mobile](mobile-workflow-creation.png)  | Approval gate, timeout, attempt policy                             |
| Execution history      | [desktop](execution-history.png)  | [mobile](mobile-execution-history.png)  | Saved run states and identities                                    |
| Waiting approval       | [desktop](approval.png)           | [mobile](mobile-approval.png)           | Zero attempts and no committed output before decision              |
| Successful integration | [desktop](success.png)            | [mobile](mobile-success.png)            | Validated deterministic sandbox ticket output                      |
| Failure                | [desktop](failure.png)            | [mobile](mobile-failure.png)            | HTTP 503 failures, attempt history, recovery control               |
| Recovery               | [desktop](recovery.png)           | [mobile](mobile-recovery.png)           | Same run ID, three total attempts, one recovery, successful output |
| Rejection              | [desktop](approval-rejection.png) | [mobile](mobile-approval-rejection.png) | Rejected state without output                                      |

The failure/recovery images belong to the same execution within each viewport's walkthrough. Native PostgreSQL/browser CI generates its own independent captures as artifacts. Exact PNG hashes, sizes, and dimensions are in `../VERIFICATION.json`. Full recordings and traces stay in CI artifacts, outside source history.
