# ARC-CLI-001 Tasks

## Phase 1 — contract inventory

1. List every current CLI command, option, stdout/stderr shape, exit code, mutation, external command, and managed path.
2. Identify hidden mutations in doctor/verify/onboard/map/graph/status/diff.
3. Record Workframe's minimum caller needs for the first integration.
4. Freeze the responsibility boundary in README/help and this specification.

## Phase 2 — JSON schemas

1. Define versioned schemas for inspection snapshot, plan, apply receipt, validation result, and error result.
2. Define canonical JSON serialization and plan hashing.
3. Define exit-code table.
4. Add schema fixtures and backward-compatibility policy.
5. Prove JSON mode never mixes prose on stdout.

## Phase 3 — read-only inspection

1. Extract current inspection facts from presentation code.
2. Include target identity, manifest/family/package/Rail facts, ownership, conflicts, missing, and unknown state.
3. Remove secret-rich values and redact source credentials.
4. Add mutation detector fixtures.
5. Verify Windows/POSIX path normalization.

## Phase 4 — first plan slice

1. Select initialization or add as the first planned mutation.
2. Resolve exact family/source artifacts.
3. Enumerate every path action and external prerequisite.
4. Include authority, stop lines, rollback, recovery, and verification.
5. Hash and persist the plan only when the caller requests it.
6. Test target/source drift and edited plan rejection.

## Phase 5 — first apply transaction

1. Revalidate plan/target/source facts.
2. Acquire target lock.
3. Persist transaction record.
4. Execute only listed actions.
5. Add process-kill hooks at every action boundary.
6. Resume or roll back deterministically.
7. Emit final receipt and exact unverified boundary.

## Phase 6 — Workframe integration

1. Pack/install the Architectonic CLI as an external artifact.
2. Make a Workframe fixture call inspect/plan without private imports.
3. Prove no provider credentials or conversational transcript enter the plan.
4. Prove Workframe cannot alter the plan and retain its hash.
5. Prove rejected/stale plan causes no mutation.

## Phase 7 — incremental migration

1. Wrap current interactive init/add around the public plan/apply contract.
2. Add update, upgrade, remove, and explicit adoption one at a time.
3. Preserve compatibility only where it does not bypass review/transaction rules.
4. Deprecate broad `--force` paths after equivalent exact plan authority exists.

## Completion evidence

- responsibility-boundary document;
- JSON schemas and fixtures;
- command/exit-code inventory;
- packed-CLI Workframe caller test;
- stale/edited/concurrent/interrupted apply results;
- cross-platform results;
- security, architecture, and ponytail reviews;
- ledger evidence and remaining deferred operations.