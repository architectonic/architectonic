# ARC-CLI-001 Specification

## User story

As Workframe or another trusted caller, I need a stable noninteractive Architectonic contract for inspection, composition planning, validation, and exact application so that conversational product UX does not duplicate or bypass package ownership logic.

## Responsibility boundary

### Architectonic CLI

- inspect current Architectonic state;
- resolve layer/profile composition;
- validate manifest, packages, protocol, family, and Rail bindings;
- produce dry-run plans for init, add, update, upgrade, remove, and explicit adoption;
- apply one immutable reviewed plan;
- produce graph/map/status JSON;
- preserve user-owned and non-Architectonic files;
- manage portable agent, skill, and Rail templates.

### Workframe CLI/product

- ask who the user/entity is and what outcome matters;
- discover runtimes/providers and request consent;
- draft a constitutional reflection;
- recommend Workframe/Architectonic use;
- obtain deployment and external-action approvals;
- invoke the public Architectonic contract;
- own collaborative workspace deployment and UX.

Architectonic does not own provider billing, model verification, Workframe users/rooms/files, conversational identity, or product deployment. Workframe does not clone/pack/compose/update Architectonic packages through private logic.

## Required command contract

Exact names may change, but the public surface must support:

- `inspect` — read-only current state;
- `resolve` or `recommend` — deterministic composition result;
- `plan` — immutable mutation plan;
- `apply` — apply exactly one plan;
- `validate` — package/family/manifest/Rail validation;
- `map` or `graph` — derived safe views.

Every command has stable JSON schema, exit codes, version, and no prose mixed into JSON output.

## Plan requirements

A plan contains:

- schema and CLI/family version;
- target absolute/real path and install identity;
- current manifest hash and relevant file/package facts;
- requested outcome/profile/layers;
- exact source artifacts and hashes;
- ordered actions: create, replace, remove, preserve, conflict, external prerequisite;
- ownership for every affected path;
- destructive/data-loss summary;
- required authority and human gates;
- migrations, rollback, recovery, and verification;
- unresolved conflicts/unknowns;
- created/expiry timestamps;
- canonical plan hash.

No secrets or provider credentials enter the plan.

## Apply requirements

- validate plan schema/version/hash;
- resolve the same target and source identities;
- fail when any material fact changed;
- acquire one local transaction/lock for the target;
- execute only listed actions;
- persist phase/recovery evidence;
- run listed verification;
- emit exact result and remaining recovery state;
- never infer consent from plan existence alone.

## Scenarios

### Workframe dry-run

Given a user completes a conversational draft, when Workframe requests an Architectonic plan, then the result is deterministic, non-mutating, and contains no provider credentials.

### Changed target

Given the user reviews a plan and another process edits the target, when apply starts, then it fails before mutation.

### Existing system

Given a repository contains another agent framework or user files, when Architectonic plans initialization, then those paths are preserved or named as conflicts; they are never silently adopted or overwritten.

### Partial prior install

Given a failed or old Architectonic installation, when inspected, then the CLI reports exact recover/adopt/remove choices rather than treating it as clean.

### Selective rejection

Given a multi-action plan contains one action the user rejects, Workframe requests a new plan. Apply never mutates an edited/reduced plan whose hash is invalid.

## Non-goals

- conversational NLP inside Architectonic;
- Workframe deployment;
- remote daemon/API;
- implicit apply after recommendation;
- hidden force mode;
- automatic adoption of existing files;
- autonomous organization operation.

## Success criteria

- Workframe integration uses only the versioned public JSON/plan contract.
- All read-only commands are mutation-free and secret-free.
- Apply is exact, transaction-bound, recoverable, and invalidates on drift.
- Existing systems remain outside managed authority.
- Windows/POSIX, packed-artifact, concurrent, stale-plan, and interrupted-apply fixtures pass.
- CLI help, README, schemas, tests, and Workframe caller documentation agree.