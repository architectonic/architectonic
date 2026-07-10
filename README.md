# Architectonic

```bash
npx architectonic@latest init
```

Architectonic is a way of thinking based on systemic reasoning. It helps humans and software systems make assumptions, boundaries, evidence, authority, incentives, uncertainty, and consequences explicit before acting.

The `architectonic` package is the CLI that composes independent layer packages into one portable workspace for human-AI collaboration.

## Principles

- Treat systems as relationships, constraints, feedback loops, and consequences rather than isolated parts.
- Distinguish evidence from inference, memory from knowledge, explanation from proof, and output from results.
- Make authority, responsibility, incentives, and stopping conditions explicit.
- Prefer the smallest structure that performs the work and preserves necessary distinctions.
- Keep claims revisable when evidence or conditions change.
- Preserve useful decisions, procedures, and evidence so they can be reused and challenged.
- Keep implementations replaceable.
- Separate canonical source material from generated indexes, summaries, embeddings, and graph projections.
- Preserve provenance when knowledge, skills, procedures, or model evaluations move between systems.

## Ensemble

Each layer is an independent package with one primary home:

```text
constitution      composition contract for the ensemble
doctrine          purpose, principles, ontology, epistemology, ethics, governance, incentives
identity          actors, roles, authority, delegation, incentives, privacy
project           operating-unit context, sources, decisions, risks, continuity
skills            reusable procedures, verification, failure handling
knowledge         claims, sources, evidence, uncertainty, known unknowns
models            model metadata, evaluations, capability requirements, routing policy
agents            software actors composed from identity, skills, models, knowledge, permissions
living-knowledge  optional: governed maintenance of frequently changing corpora
meta              audit, upkeep, drift review, revision policy
```

```text
doctrine          -> what the system is for and what governs it
identity          -> who participates and what authority they hold
project           -> where a concrete operating unit does its work
skills            -> how recurring procedures are performed and verified
knowledge         -> what claims and evidence are retained
models            -> what computational capabilities exist and under what constraints
agents            -> how actors, procedures, models, knowledge, and permissions are composed
living-knowledge  -> how changing corpora are reviewed, revised, and published
meta              -> how the ensemble is audited, maintained, and revised
constitution      -> how the packages are composed without duplicating their contents
```

`teleology` refers to the study of purpose and ends. Within Architectonic, purpose belongs in `doctrine` alongside the other governing principles.

## Commands

```bash
npx architectonic init [name]              # full ensemble
npx architectonic init [name] --source npm
npx architectonic add <layer>              # one layer
npx architectonic add <layer> --source npm
npx architectonic add constitution         # preset bundle alias
npx architectonic list
npx architectonic doctor
npx architectonic status
npx architectonic diff <layer>
npx architectonic update [layer...]
npx architectonic remove <layer>
```

`init` creates a workspace root and installs the constitution ensemble:

```text
./constitution
./doctrine
./identity
./project
./skills
./knowledge
./models
./agents
./living-knowledge
./meta
./architectonic.json
```

## Bundles

```text
constitution      all ten layers
knowledge-system  constitution, doctrine, knowledge, living-knowledge, meta
agent-system      doctrine, identity, project, skills, knowledge, models, agents, meta
project-system    doctrine, identity, project, skills, knowledge, models, agents, meta
```

## Sources

```text
--source git   clone from GitHub or ARCHITECTONIC_SOURCE_BASE
--source npm   pack from registry or ARCHITECTONIC_NPM_BASE
```

Default is `git`.

## Safety

`add` stops when a target directory already exists. `update` fast-forwards only clean git worktrees. `remove` refuses dirty worktrees unless `--force`.

## Release

A version is published only after the registry confirms it. See [`docs/RELEASE.md`](./docs/RELEASE.md).
