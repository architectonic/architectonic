# ARC-STABLE-001 Tasks

## Phase 0 — unblock trust foundations

1. Merge `ARC-STAB-002` only after exact-head rollback tests.
2. Complete `ARC-STAB-003` so verification cannot adopt the inspected tree.
3. Inventory incomplete upgrade transactions and the `ARC-STAB-004` recovery boundary.

## Phase 1 — inventory

1. List every maintained public package repository.
2. Record current source commit, package version, registry version, packed hash, protocol/schema, canonical entry, companions, runtime requirements, and test command.
3. Record which packages the CLI composes directly.
4. Record which versions ABKB currently uses.
5. Reject stale/deprecated package candidates rather than carrying them into the family.

## Phase 2 — manifest and validator

1. Define `architectonic.family.schema.json` or equivalent bounded schema.
2. Create one candidate family manifest.
3. Validate package names, versions, source commits, packed integrity, protocol, layer, entry, companions, profile composition, and schemas.
4. Fail on missing, duplicate, mutable, or unsupported artifacts.
5. Emit human and JSON reports without secrets.

## Phase 3 — exact source planning

1. Make Git plans name exact commit and repository identity.
2. Make npm plans name exact version and packed integrity.
3. Recheck artifact facts at apply.
4. Reject source drift before mutation.
5. Keep test/local override sources visibly experimental and outside a public stability claim.

## Phase 4 — install matrix

1. Test every standalone layer.
2. Test every named profile.
3. Test representative custom compositions.
4. Test organization scaffold and one Rail binding.
5. Test agents/skills/model/knowledge references where installed.
6. Test Git and registry-equivalent npm paths on Windows and POSIX.

## Phase 5 — upgrade and rollback

1. Select the prior supported family.
2. Create exact update/upgrade plan fixtures.
3. Test preserve/conflict/local-modification behavior.
4. Test crash/recovery at mutation boundaries.
5. Test supported rollback and blocked downgrade.
6. Verify final family identity and instance-owned files.

## Phase 6 — adoption and release

1. Install into a disposable external workspace.
2. Adopt into ABKB and verify private-state exclusion.
3. Run architecture, security, ponytail, package, packed-artifact, and public-registry reviews.
4. Record exact evidence in the ledger.
5. Request human publication approval.
6. Publish and verify immutable public artifacts against the family manifest.

## Completion evidence

- family manifest and schema;
- inventory report;
- exact artifact hashes and source commits;
- install/upgrade/rollback matrix results;
- ABKB adoption report;
- independent reviewer conclusions;
- registry/public source verification;
- known limitations and unsupported combinations.