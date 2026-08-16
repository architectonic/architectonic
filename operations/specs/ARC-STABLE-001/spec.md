# ARC-STABLE-001 Specification

## User story

As an Architectonic user or downstream caller, I need one exact compatible public package family so that the same installation command produces a reproducible, verifiable workspace rather than a time-dependent mix of individually valid packages.

## Problem

The CLI, protocol, layers, profiles, templates, Rail, agents, skills, knowledge, models, and design-system packages evolve independently. Current verification checks local package and protocol facts, but there is no family-level artifact that names one supported combination, upgrade path, evidence set, and rollback boundary.

## Required outcomes

1. A machine-readable family manifest names exact package artifacts and compatibility.
2. Git and npm source modes resolve exact reviewed revisions or versions.
3. Standalone layers, named profiles, and representative custom compositions are tested from packed/registry-equivalent artifacts.
4. Upgrade and downgrade boundaries are explicit.
5. ABKB adopts the candidate family without private-state leakage.
6. Package publication and public stability claims require the same evidence.

## Family manifest

The manifest must include:

- family release identifier and status;
- CLI version, source commit, and integrity;
- protocol and manifest schema versions;
- each package name, version, source commit, packed integrity, layer, canonical entry, and required companions;
- minimum Node, Git, npm, tar, and optional Python requirements;
- profile-to-layer composition and feature expectations;
- generated organization and Rail schema/template versions;
- supported prior family versions and migration path;
- explicitly unsupported combinations and downgrades;
- verification commands and expected evidence types;
- publication state and registry coordinates;
- ABKB adoption source/evidence;
- rollback and recovery boundary.

## Scenarios

### Clean install

Given a clean target and the family manifest, when a standalone layer or named profile is installed from Git or npm, then the exact recorded artifacts are used and the resulting manifest verifies.

### Source drift

Given a Git head or npm package changes after planning, when apply begins, then the source mismatch blocks mutation.

### Local modification

Given an installed package was modified locally, when update/upgrade is planned, then the plan reports preserve/conflict/adopt choices and does not overwrite or silently bless the change.

### Upgrade

Given a supported prior family, when upgrade is planned and applied, then every migration, replacement, preserve action, recovery path, and final family identity is exact and verified.

### ABKB adoption

Given the public candidate family passes, when ABKB adopts it, then private project identity, goals, ledgers, secrets, and evidence remain instance-owned.

## Non-goals

- one shared SemVer for every repository;
- a hosted registry service;
- automatic publication;
- automatic adoption of arbitrary existing files;
- a new layer or ontology;
- Workframe product onboarding.

## Success criteria

- Every candidate package can be rebuilt/packed from the named source revision.
- A clean matrix passes on Windows and POSIX.
- The same family result is produced from reviewed Git and npm artifacts.
- Unsupported or stale combinations fail before mutation.
- Rollback/recovery is exercised.
- ABKB adopts and verifies the family.
- Independent security and ponytail review accept the baseline.