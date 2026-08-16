# Architectonic Stability Lock Audit

**Date:** 2026-07-29  
**Scope:** public package family, file-native CLI, installation, verification, update/upgrade/remove, agent instantiation, and Workframe boundary  
**Posture:** source-first architecture review, package-supply-chain review, destructive-operation wargame, ponytail simplification  
**Authority:** `operations/ledger.json` remains the canonical work ledger

## Executive verdict

Architectonic has become a credible public protocol and package family rather than a loose collection of philosophy documents.

The current CLI already provides:

- deterministic profile/layer recommendation;
- standalone and composed initialization;
- Git and npm package installation;
- managed-path containment;
- local organization-owned scaffold;
- one canonical Rail binding;
- semantic package/protocol verification;
- source map and derived graph views;
- update, upgrade, remove, and installed-agent creation;
- packed-artifact and integration tests.

The correct next step is not another layer, ontology, or meta-service. It is to lock one compatible package family and make every mutation recoverable, explicit, and independently verifiable.

The strongest current boundary is managed-path containment. The weakest current boundaries are:

1. no single compatible package-family manifest;
2. failed initialization can strand a partial workspace;
3. `doctor/verify --fix` can silently redefine the package integrity baseline from the current tree;
4. npm upgrade deletes a fixed adjacent backup path without proving ownership and has no crash transaction;
5. Git installs follow unpinned repository heads by default;
6. Workframe and Architectonic CLI responsibilities can overlap;
7. installed-agent output and generator execution need an explicit authority/containment contract.

## North star

A public system for building systems: composable constitutional, identity, project, agent, skill, knowledge, model, Rail, and interface layers that can be inspected, installed, upgraded, and adopted without taking ownership of unrelated user state.

## Current weekly outcome

1. Review/merge the narrow failed-init rollback under `ARC-STAB-002` after exact-head tests.
2. Stop `doctor/verify --fix` from silently adopting modified package contracts under `ARC-STAB-003`.
3. Define one machine-readable compatible package-family baseline under `ARC-STABLE-001`.
4. Define the minimal noninteractive Workframe/Architectonic CLI contract under `ARC-CLI-001`.
5. Specify crash-safe npm upgrade/recovery under `ARC-STAB-004`.
6. Do not add a new public layer or publish a family stability claim until these foundations pass.

## Product boundary

### Architectonic owns

- public package/layer definitions and composition rules;
- a file-native workspace manifest;
- deterministic inspect, recommend, plan, validate, graph, update, upgrade, remove, and agent-instantiation contracts;
- package provenance, compatibility, integrity, and managed-path boundaries;
- local organization-owned templates and one canonical Rail binding;
- runtime-neutral JSON interfaces for callers such as Workframe.

### ABKB owns

- private operator identity and portfolio state;
- current cross-project goals;
- real project relationships and private evidence;
- promotion/adoption decisions between instance and public template;
- no public package task state.

### Workframe owns

- product onboarding and conversational user experience;
- runtime/provider capability selection and consent;
- workspace deployment;
- collaborative users, agents, projects, files, and messaging;
- later reviewed invocation of Architectonic's noninteractive plan/apply contract;
- no duplicate package-composition logic.

### Human operator owns

- package publication;
- public family promotion;
- destructive remove/upgrade/adoption decisions;
- acceptance of changed local generated files;
- public/private promotion from ABKB;
- explicit application of a reviewed plan.

## SWOT

### Strengths

- Small Node CLI with no framework-heavy runtime.
- Layer and profile definitions are declarative JSON.
- Standalone layers and composed profiles are clearly differentiated.
- Managed paths reject traversal, absolute escape, workspace root, and symlink escape.
- Installed package integrity is recorded.
- Git sources record resolved SHA; npm sources record resolved version.
- Semantic verification checks package name, protocol layer/minor version, package version, and canonical entry.
- Local organization-owned files are separated from installed package contracts.
- Rail has one canonical ledger path instead of generating competing queues.
- Graph is explicitly derived and replaceable.
- `update` refuses dirty Git layers and uses fast-forward-only pull.
- `upgrade` refuses local integrity drift.
- `remove` checks operational dependents and refuses modified layers unless forced.
- npm upgrade stages before replacing the current layer.
- Agent creation delegates to the installed agents package rather than duplicating generator logic.
- Tests already cover real Git fixtures, npm packing, Rail integration, and path containment.
- The CLI and package family are public and can be independently inspected.

### Weaknesses

- Package compatibility is implicit across individually versioned repositories.
- Default Git installation clones mutable branch heads without a reviewed family pin.
- npm installation resolves registry state at invocation time unless an exact version is embedded externally.
- Initialization mutates root files before the complete layer set/scaffold succeeds.
- `installResolved()` rolls back added layers but not root README/AGENTS/manifest/scaffold created by the wider init transaction.
- `doctor/verify --fix` rewrites package identity/integrity/revision metadata from the unverified current directory.
- `upgradeNpmLayer()` deletes a fixed sibling backup path before proving it belongs to Architectonic.
- Upgrade has no durable transaction journal across process death or manifest-write failure.
- `add` can leave a partially changed workspace if organization scaffolding or manifest write fails after layer installation.
- `remove --force` can discard local package changes; the force authority is a Boolean flag rather than a reviewed plan hash.
- `agent create --output` accepts an arbitrary resolved output directory outside the workspace and executes an installed Python generator.
- Source-base environment overrides can redirect Git/npm installation to arbitrary repositories/packages, useful for tests but high authority in production.
- `verify` checks current protocol minor compatibility but not one family compatibility matrix.
- The CLI version, protocol version, package versions, and generated scaffold version are not bound to one release artifact.
- There is no first-class dry-run plan hash followed by exact apply for init/add/update/upgrade/remove/adopt.

### Opportunities

- One family manifest can make Architectonic a dependable substrate for Workframe and external users.
- A noninteractive plan/apply JSON contract can preserve conversational UX without duplicating package logic.
- Crash-safe transactions can make the CLI unusually trustworthy for a pre-1.0 composition tool.
- Explicit package provenance and controlled adoption can turn ABKB experiments into reviewable public releases.
- A compatibility validator can test registry-equivalent packed artifacts and current public package state.
- Existing path-containment and Rail discipline can become release gates across the whole package family.
- Agent and skill packages can share one portable binding contract without adding a service.

### Threats

- Mutable Git/npm sources produce different workspaces from the same command at different times.
- A compromised environment variable or package source can execute arbitrary package/generator code.
- Partial init/add/upgrade/remove can strand users or lose local state.
- Integrity repair can bless tampering and erase the warning.
- Package family drift can produce semantically incompatible compositions that individually verify.
- Workframe may duplicate or fork composition logic.
- A broad force/adoption path can overwrite non-Architectonic project files.
- Agent generator output outside the workspace can mutate arbitrary user paths.
- Public package publication from a dirty/unreviewed source can create unreproducible releases.
- Growing more layers before stabilizing the current family recreates architectural sprawl.

# P0 findings

## ARC-STAB-002 — failed initialization rollback

Issue: https://github.com/architectonic/architectonic/issues/6  
Immediate PR: https://github.com/architectonic/architectonic/pull/7

### Source finding

`init()` creates the target plus root `README.md` and `AGENTS.md` before installing the complete layer set. A later clone/pack/tar/manifest/scaffold failure can leave a partial non-empty target that the next init refuses to reuse.

### Required transaction boundary

- snapshot target existence/initial entries;
- create root and package/scaffold content;
- on failure remove only entries created by this invocation;
- remove newly created empty target;
- preserve a pre-existing empty target;
- surface original and cleanup failure separately;
- permit immediate retry after the external fault is fixed.

The immediate PR implements this boundary and adds deterministic failure/retry tests. It remains draft until exact-head test, packed-artifact, Windows, POSIX, cleanup-failure, and independent path review pass.

### Edge cases

- first versus later layer failure;
- Git versus npm source;
- tar missing or extraction partial;
- manifest write denied;
- organization scaffold failure after manifest write;
- target created concurrently by another process;
- target path becomes a symlink/junction during initialization;
- read-only/locked generated file prevents cleanup;
- filesystem case-folding collisions;
- spaces and non-ASCII;
- abrupt process death rather than caught exception;
- nested target under an existing repository;
- cleanup logs accidentally include secret source URLs.

Caught-error rollback does not solve abrupt process death; the family stability plan should later define a transaction marker for all root mutations.

## ARC-STAB-003 — integrity repair must not adopt the inspected tree

Issue: https://github.com/architectonic/architectonic/issues/8

### Source finding

When `parsed.fix` is set, `runInspection()` rewrites each layer's path, package name, directory integrity, Git SHA, or npm version from current files. `doctor --fix` uses the non-semantic path, so current tampered/replaced contents can become the new baseline without protocol verification.

An integrity checker cannot establish trust by accepting the state it is checking.

### Required separation

- inspect/verify: read-only facts;
- repair: only deterministic organization-owned or derived metadata from an independently trusted source;
- adopt/re-pin: explicit dry-run diff/provenance/hash and reviewed apply;
- update/upgrade: exact source transition with rollback.

### Edge cases

- modified contract file then `doctor --fix`;
- package name changed to another package;
- `.git` removed or remote changed;
- dirty Git tree at a different commit;
- npm package files replaced but version retained;
- protocol file missing/mismatched;
- symlink inside package tree changes hashed content boundary;
- generated cache ignored by integrity hash hides a meaningful change;
- `--fix --json` used by an automated agent that treats exit zero as trust;
- manifest itself edited to point to another contained directory;
- local source fixture versus production registry source.

### Stop line

No stability or package-integrity claim while repair can redefine the baseline from unverified current contents.

## ARC-STABLE-001 — compatible public package-family baseline

Issue: https://github.com/architectonic/architectonic/issues/4

### Required family manifest

Name:

- family release identifier;
- CLI version and source commit;
- protocol/schema versions;
- exact package versions and integrity hashes;
- dependency/companion/operational requirements;
- minimum Node/Git/npm/tar/Python requirements;
- composition defaults;
- supported update/upgrade/downgrade paths;
- known incompatible versions;
- package publication and packed-artifact status;
- ABKB adoption result;
- release/native evidence commands;
- rollback boundary.

Packages may retain independent SemVer. The compatible set must be unambiguous.

### Acceptance matrix

- clean Git-source install from exact pins;
- clean npm packed/registry-equivalent install from exact versions;
- each standalone layer;
- each named profile;
- representative custom compositions;
- update from the prior supported family;
- local modifications and conflict report;
- missing/incorrect package/protocol/version;
- Windows/POSIX path and npm shim behavior;
- Rail canonical ledger validation;
- installed agent/skill binding validation;
- ABKB adopt-back without private state leakage;
- rollback/downgrade refusal where unsupported.

### Unknowns

- Which current package versions form the intended first family?
- Are Git installs a developer mode only, or a supported end-user source?
- Which package artifacts are already published and immutable?
- Which schemas need family-level compatibility rather than protocol minor matching?
- Does the CLI require Python only for agent creation or as a family prerequisite?
- What is the support policy for local modifications to installed package files?

### Stop line

No new package family/layer and no “stable Architectonic” claim until one exact family passes.

## ARC-CLI-001 — Workframe/Architectonic CLI boundary

Issue: https://github.com/architectonic/architectonic/issues/5

### Minimal public contract

Architectonic should expose deterministic machine-readable operations equivalent to:

- inspect target;
- recommend/resolve composition;
- plan init/add/update/upgrade/remove/adopt;
- validate target;
- graph/map target;
- apply one immutable approved plan.

Exact command names remain a design decision.

### Plan contract

A plan should name:

- target real path and install identity;
- current manifest and package hashes;
- desired family/profile/layers;
- exact source artifacts and hashes;
- every create/replace/remove/preserve/conflict action;
- package-owned versus instance-owned files;
- required external commands;
- authority, destructive effects, and human gates;
- migration/rollback/recovery steps;
- plan hash and expiration/freshness facts.

Apply must fail if target/source facts differ from the reviewed plan.

### Workframe boundary

Workframe may gather user/entity/objective/provider/runtime information and request an Architectonic plan. It must not clone, pack, compose, validate, upgrade, or remove packages through private duplicate logic.

Architectonic must not own Workframe deployment, provider billing selection, collaborative users, or conversational user identity.

### Edge cases

- target changes between plan and apply;
- package registry/Git head changes;
- plan copied to another directory/machine;
- Workframe asks for a layer unsupported by the selected family;
- existing non-Architectonic agent framework/files;
- partially installed prior Architectonic;
- caller asks to adopt existing files;
- caller lacks Git/npm/tar/Python;
- plan contains absolute paths or secrets;
- concurrent apply;
- interrupted apply and resume/rollback;
- user rejects one action in a multi-layer plan.

### Stop line

No merged conversational/package CLI and no giant autonomous-organization installer.

# P1 finding

## ARC-STAB-004 — npm upgrade backup/recovery transaction

Issue: https://github.com/architectonic/architectonic/issues/9

### Source finding

The npm upgrade path uses a fixed sibling `${currentDir}.architectonic-backup`, recursively deletes it, then renames the current layer and replacement. That path is not proven owned, and process death between phases has no durable recovery state.

### Required transaction

- contained unique or ownership-proven staging and backup paths;
- transaction record before rename;
- old/new integrity and version;
- phase transitions around each rename and manifest write;
- detect/resume/rollback incomplete transaction;
- no deletion of unowned pre-existing path;
- verify new package before cleanup;
- retain old layer until durable commit.

### Edge cases

- pre-existing user directory at fixed backup path;
- stale prior Architectonic recovery artifact;
- process death after each phase;
- manifest write failure;
- locked files on Windows;
- antivirus/backup scan;
- disk full during extraction/rename;
- cross-device rename if staging path changes;
- package path case change;
- registry version same but content changed;
- rollback package incompatible with current scaffold/schema.

## Add transaction and rollback

`add` currently delegates layer rollback inside `installResolved()`, but manifest/scaffold/root changes across the whole command should receive the same explicit transaction treatment as init/upgrade. Test failure after layer installation but during manifest or organization scaffold.

## Remove and force authority

`remove` correctly checks dependents and integrity, but `--force` is a broad destructive Boolean. Long-term plan/apply should bind force to exact layer/path/current integrity and reviewed data-loss summary.

Questions:

- Should package-local modifications ever be preserved/extracted before remove?
- Should local organization-owned files remain after layer removal? Current behavior should be explicit.
- How are profiles invalidated and later restored?
- What if Rail is removed while the canonical ledger remains?

## Agent instantiation authority

`agent create` runs an installed Python generator and accepts an arbitrary output path.

Required review:

- output containment or explicit external-target approval;
- spec path/provenance and schema validation before process execution;
- exact installed agents package version/hash;
- minimal environment and working directory;
- timeout/cancellation and child termination;
- no secret-rich inherited environment;
- no symlink/junction escape;
- dry-run file plan;
- generator output verification and rollback.

Do not assume installed package code is safe merely because the manifest points to it.

## Source overrides and supply chain

`ARCHITECTONIC_SOURCE_BASE` and `ARCHITECTONIC_NPM_BASE` are useful test/development mechanisms but can redirect package acquisition.

Define:

- supported production source policy;
- exact pins/versions;
- allowed host/namespace or explicit high-risk override;
- package integrity/signature/provenance evidence;
- whether Git source is allowed for ordinary users;
- environment-variable visibility in doctor/plan without leaking credentials;
- behavior when source URL contains embedded credentials;
- npm lifecycle script exposure during `npm pack`/install flow;
- tar archive path/symlink safety.

The CLI currently uses `npm pack` plus `tar` rather than running package installation scripts, which reduces but does not eliminate archive/supply-chain risk.

## Protocol and compatibility

Protocol minor equality is useful but insufficient for all cross-package semantics. Family tests should cover:

- generated file schemas;
- Rail schema/validator;
- agents/skills binding schema;
- model/knowledge references;
- profile feature expectations;
- local entry templates;
- CLI command/JSON output schemas.

# P2 findings

- Simplify aliases/profiles only from usage evidence; do not rename broad public concepts during the stability campaign.
- Keep Graph derived and optional.
- Do not add a service/database to coordinate file-native packages.
- Performance optimization is low priority relative to transaction/recovery correctness.
- Package documentation can be consolidated after the family manifest identifies the authoritative entry points.
- Promote private ABKB structures only after repeated evidence and explicit public generalization review.

# P3 / deferred

- marketplace/registry service;
- remote package daemon;
- automatic adoption of arbitrary existing repositories;
- broad autonomous organization creation;
- additional knowledge/identity/doctrine layers;
- hosted graph/vector database;
- multi-runtime Workframe deployment logic inside Architectonic;
- unreviewed self-updating package family.

# White-hat threat model

## Assets

- user workspace and unrelated files;
- Architectonic manifest and package trust baseline;
- installed package contracts;
- local organization-owned knowledge;
- canonical Rail ledger;
- package source/provenance;
- agent specs and generated output;
- public npm/Git releases;
- ABKB private/public promotion boundary.

## Attack and failure surfaces

- target paths and managed manifest paths;
- Git clone/pull and remotes;
- npm pack and tar archive extraction;
- source-base environment overrides;
- manifest read/write and integrity repair;
- initialization/add/upgrade/remove transactions;
- symlinks/junctions/case-folding;
- installed Python agent generator;
- package protocol files and templates;
- CI/publish workflow and packed artifacts;
- caller integrations such as Workframe.

## Abuse/failure cases

- malicious package archive writes outside destination via symlink/path tricks;
- mutable Git head changes between review and install;
- source override points to lookalike package;
- local tampering is blessed by doctor fix;
- failed install leaves partial authority files;
- upgrade deletes unowned backup path;
- force remove destroys local edits;
- manifest path is contained but points to the wrong package;
- package protocol declares a compatible minor but incompatible schema;
- agent spec/generator writes outside workspace or inherits secrets;
- plan reviewed for one target is applied to another;
- package published from dirty/unreviewed source;
- ABKB private data copied into public package templates.

# Blue-team controls

- one family compatibility manifest with exact artifacts;
- immutable dry-run plan and exact apply;
- transaction journals for every multi-step mutation;
- rollback/resume and crash injection;
- read-only integrity verification and separate explicit adoption;
- source allow/pin/provenance policy;
- archive extraction containment and post-extract verification;
- package-owned versus instance-owned file inventory;
- minimal child environment/timeout/output plan for agent generator;
- exact packed-artifact CI and public registry verification;
- ABKB adoption/promotion evidence;
- one canonical Rail and no synchronization service.

# Wargames

## Wargame 1 — failed init/add

Fail every external and file-write boundary. Success: old workspace state is exact, created state is removed or recoverable, retry works, original error preserved.

## Wargame 2 — tamper and repair

Modify package files, package name, protocol, Git metadata, and manifest path, then run every doctor/verify/fix combination. Success: trust baseline is never silently rewritten.

## Wargame 3 — malicious/mutable source

Change Git head or npm package between plan and apply; redirect source base; provide malformed archive/protocol. Success: exact source mismatch blocks mutation.

## Wargame 4 — upgrade crash

Kill after stage, backup rename, replacement rename, manifest write, and cleanup. Success: deterministic resume/rollback with no unowned deletion.

## Wargame 5 — remove with dependents/local edits

Attempt normal/force remove under dependency, local-change, missing-path, symlink, and stale-manifest states. Success: only exact reviewed owned path is removed and consequences are explicit.

## Wargame 6 — hostile agent spec/generator

Use spec/output traversal, symlink, infinite child, huge output, malicious package generator, and secret-rich environment. Success: plan/containment/minimal authority/cancellation hold.

## Wargame 7 — Workframe caller drift

Review an Architectonic plan, mutate target or package family, then ask Workframe to apply. Success: plan invalidates and no partial mutation occurs.

## Wargame 8 — private/public contamination

Attempt to promote ABKB project/identity/secrets/current ledger into public packages. Success: promotion review extracts only generalized reusable structure and records provenance.

# Ledger consolidation

The canonical ledger should contain:

1. historical managed-path containment as done;
2. `ARC-STAB-002` in review while PR #7 remains unverified;
3. `ARC-STAB-003` ready P0;
4. `ARC-STABLE-001` backlog P0 depending on the two immediate stability foundations;
5. `ARC-CLI-001` ready P1 for specification/boundary work without package mutation;
6. `ARC-STAB-004` backlog P1 behind the baseline/integrity contract.

No package/layer expansion item should be ready during the stability lock.

GitHub issues/PRs mirror implementation. The ledger owns status and evidence.

# Recommended execution order

1. Exact-head review/test/merge of `ARC-STAB-002`.
2. Implement `ARC-STAB-003` read-only integrity/explicit adoption boundary.
3. Inventory all current public package versions and build `ARC-STABLE-001` manifest/tests.
4. Complete `ARC-CLI-001` spec and JSON plan/apply boundary with Workframe maintainers.
5. Implement `ARC-STAB-004` crash-safe npm upgrade transaction; generalize transaction machinery to add/remove only where proven useful.
6. Lock one family release candidate and adopt it into a disposable workspace and ABKB.
7. Publish only after exact packed/registry/source hashes and independent review.

# Questions for the operator

1. Which current package versions should form the first stable family candidate?
2. Is Git-source installation a supported end-user mode or a developer/test mode?
3. Should ordinary users edit installed package contracts, or only local organization-owned files?
4. Which local modifications should an explicit adoption flow support?
5. May `agent create` write outside the workspace, and under what approval?
6. Which Architectonic operations must Workframe call in the first CLI release?
7. Should apply be allowed interactively without a persisted plan hash?
8. Which downgrade/rollback paths must the first family support?
9. Which private ABKB improvements are ready for public promotion now?
10. Is the first public stability target pre-1.0 experimental-stable or a SemVer 1.0 contract?

# Stop line

Do not add a new layer, publish a stable-family claim, merge Architectonic and Workframe CLI responsibilities, or silently adopt/overwrite user state until the relevant P0 transaction, integrity, and compatibility contracts pass.