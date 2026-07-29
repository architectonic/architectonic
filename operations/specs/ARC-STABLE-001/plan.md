# ARC-STABLE-001 Plan

## Architecture

Keep the system file-native. Add one release-family manifest and validator to the existing CLI/package workflow. Do not add a daemon, database, or remote coordination service.

The family validator consumes:

- the family manifest;
- the current CLI source/package;
- packed layer artifacts or exact Git checkouts;
- protocol/profile definitions;
- package protocol files;
- generated workspace manifest and organization scaffold;
- Rail and package self-check outputs.

## Sequence

1. Inventory every maintained public package and currently published version.
2. Record source commits, package metadata, protocol files, schemas, templates, dependencies, tests, and public registry state.
3. Select one candidate family without changing versions merely for visual consistency.
4. Define the family manifest schema and deterministic validator.
5. Make Git/npm planning resolve exact revision/version/integrity from the manifest.
6. Build a clean install matrix for standalone layers, profiles, and custom compositions.
7. Add supported prior-family migration and unsupported downgrade fixtures.
8. Run package-local, CLI, packed-artifact, Rail, agent/skill binding, and cross-platform checks.
9. Adopt the candidate into a disposable workspace and ABKB.
10. Run security, architecture, and ponytail review.
11. Publish only after the same manifest points to immutable public artifacts and exact evidence.

## Ownership

- family selection and architecture: architect;
- implementation: coder;
- package-local checks: package maintainers;
- security/provenance review: security-reviewer;
- ABKB adoption: orchestrator;
- publication: human operator.

## Compatibility policy

- Exact family versions are supported together.
- A package may remain independently versioned.
- Protocol minor compatibility remains a package check, not a substitute for family compatibility.
- A combination not listed as supported is experimental/unverified.
- Downgrade is allowed only when the manifest provides an explicit data/template compatibility path.

## Migration and rollback

- All mutation begins from a reviewed immutable plan.
- Package and target hashes are rechecked at apply.
- Existing instance-owned files remain preserved.
- Package-owned replacements use crash-recoverable transactions.
- Forward-only schema changes block unsupported rollback before mutation.
- The previous family remains available as a complete artifact set while the new family is accepted.

## Verification

- deterministic schema/validator unit tests;
- exact Git and npm artifact resolution tests;
- packed-artifact matrix;
- Windows and POSIX CLI tests;
- supported upgrade and blocked downgrade fixtures;
- local-modification conflict fixtures;
- Rail/agents/skills/schema integration;
- ABKB adoption and private-data exclusion;
- registry/source hash parity;
- restore/rollback drill.

## Stop lines

- no publication from a dirty or unreviewed source;
- no mutable head/latest tag as final family identity;
- no private ABKB content in public packages;
- no new layer while the family baseline is open.