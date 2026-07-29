# ARC-CLI-001 Plan

## Architecture

Extend the existing file-native CLI with versioned JSON schemas and a plan/apply transaction boundary. Keep commands local. Workframe invokes the executable as a subprocess or equivalent public contract; it does not import private implementation modules.

## Components

1. **Inspection snapshot**
   - target real path and install identity;
   - manifest/package/family/Rail facts;
   - owned, instance-owned, conflict, missing, and unknown paths;
   - no mutation.

2. **Plan builder**
   - consumes an inspection snapshot plus requested operation;
   - resolves exact family/source artifacts;
   - produces ordered actions, authority, conflicts, rollback, and verification;
   - canonicalizes and hashes the plan.

3. **Plan validator**
   - validates schema, CLI/family compatibility, hash, target binding, freshness, and source facts.

4. **Apply transaction**
   - re-inspects material facts;
   - acquires target-local lock;
   - persists action phases and recovery state;
   - performs only planned actions;
   - verifies final result;
   - emits machine-readable receipt.

5. **Public JSON contract**
   - stable schemas and exit-code table;
   - stdout contains JSON only in JSON mode;
   - diagnostics go to stderr without secrets.

## Sequence

1. Inventory current command behaviors and hidden mutations.
2. Define responsibility/boundary document and JSON schema versioning.
3. Implement read-only inspection snapshot independent of human-formatted output.
4. Implement one operation first—initialization or add—as plan-only.
5. Add exact plan canonicalization/hash and stale-target tests.
6. Add transaction/recovery apply for the first operation.
7. Migrate update, upgrade, remove, and adoption only after the first contract proves useful.
8. Add Workframe caller fixtures using the packed CLI executable.
9. Reconcile help/README and deprecate direct implicit mutation only under a deliberate compatibility policy.

## Backward compatibility

- Existing commands may remain as interactive wrappers around plan/apply during a transition.
- Wrappers must show and explicitly approve the exact generated plan.
- JSON callers use only documented versioned contracts.
- No hidden auto-apply in noninteractive/CI contexts.

## Authority

- Plan creation: read-only, no special approval.
- Apply: explicit human or durable caller approval bound to target/plan hash.
- Destructive remove/adopt/overwrite: additional named approval in the plan.
- Publication/deployment: outside Architectonic apply authority.

## Recovery

- Target-local transaction record is written before the first mutation.
- Every action has before/after facts and idempotent resume/rollback semantics.
- Concurrent apply fails or waits according to an explicit bounded policy.
- Recovery command reports exact phase; it never guesses from partial directories alone.

## Verification

- JSON schema fixtures;
- canonical plan hash across platforms;
- secret redaction;
- target/source drift;
- concurrent apply;
- abrupt process kill at every phase;
- non-Architectonic file preservation;
- managed-path containment;
- Workframe packed-CLI integration;
- exact exit codes/stdout/stderr;
- Windows and POSIX.

## Stop lines

- no private module imports by Workframe;
- no apply from an edited plan;
- no mutation in inspect/resolve/plan/validate/map/graph;
- no provider credential or user conversational transcript in Architectonic artifacts;
- no giant all-operations rewrite before the first plan/apply slice passes.