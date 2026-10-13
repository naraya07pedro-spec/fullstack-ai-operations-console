ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_attempt_limit" CHECK ("maxAttempts" BETWEEN 1 AND 5);
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_timeout_limit" CHECK ("timeoutMs" BETWEEN 100 AND 10000);
ALTER TABLE "Run" ADD CONSTRAINT "Run_counters_nonnegative" CHECK ("attemptCount" >= 0 AND "cycleAttempts" >= 0 AND "recoveryCount" BETWEEN 0 AND 3);
ALTER TABLE "Run" ADD CONSTRAINT "Run_lease_state" CHECK (("status" = 'RUNNING' AND "leaseToken" IS NOT NULL AND "leaseUntil" IS NOT NULL) OR ("status" <> 'RUNNING' AND "leaseToken" IS NULL AND "leaseUntil" IS NULL));
ALTER TABLE "Run" ADD CONSTRAINT "Run_success_output" CHECK ("status" <> 'SUCCEEDED' OR "output" IS NOT NULL);
ALTER TABLE "Run" ADD CONSTRAINT "Run_approval_gate" CHECK (NOT COALESCE(("workflowSnapshot"->>'requiresApproval')::boolean, true) OR "status" IN ('WAITING_APPROVAL', 'REJECTED') OR "approvedBy" IS NOT NULL);
