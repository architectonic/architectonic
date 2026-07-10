# Architectonic

Architectonic is a way of thinking based on systemic reasoning.

It helps humans and software systems make assumptions, boundaries, evidence, authority, incentives, uncertainty, and consequences explicit before acting.

The software in this repository composes that approach into a portable workspace for human-AI collaboration.

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

## Human and AI collaboration

A useful collaboration pattern is:

```text
AI explores possibilities, connections, and alternatives.
Humans identify priorities, constraints, invariants, and acceptable consequences.
```

These are tendencies rather than exclusive roles. Either participant may generate possibilities, test assumptions, identify patterns, or review evidence. The distinction makes missing cognitive work visible.

Semi-autonomous operation does not remove human responsibility. Authority, review gates, escalation paths, and stopping conditions should remain explicit and proportionate to risk.

## Software ensemble

The `architectonic` package is a command-line tool for composing Architectonic packages into a coherent workspace.

```text
constitution      -- composition contract for the ensemble
doctrine          -- purpose, principles, ontology, epistemology, ethics, governance, incentives
identity          -- actors, roles, authority, delegation, incentives, privacy
project           -- operating-unit context, sources, decisions, risks, and continuity
skills            -- reusable procedures, verification, and failure handling
knowledge         -- claims, sources, evidence, uncertainty, and known unknowns
models            -- model capabilities, constraints, evaluations, cost, and routing evidence
agents            -- composed software actors with identity, skills, models, knowledge, and permissions
living-knowledge  -- governed maintenance of changing knowledge corpora
meta              -- audit, upkeep, drift review, and revision policy
```

The ensemble fits together as follows:

```text
doctrine          -> what the system is for and what governs it
identity          -> who participates and what authority they hold
project           -> where a concrete operating unit does its work
skills            -> how recurring procedures are performed and verified
knowledge         -> what claims and evidence are retained
models            -> what computational capabilities are available and under what constraints
agents            -> how actors, procedures, models, knowledge, and permissions are composed
living-knowledge  -> how changing corpora are reviewed, revised, and published
meta              -> how the ensemble is audited, maintained, and revised
constitution      -> how the packages are composed without duplicating their contents
```

`teleology` refers to the study of purpose and ends. Within Architectonic, purpose belongs in `doctrine` alongside the other governing principles.

## Ensemble contract

Each concept has one primary home:

- `doctrine` defines general governing principles rather than project state.
- `identity` defines actor structures rather than storing private profiles.
- `project` defines operating context rather than duplicating general doctrine or skill corpora.
- `skills` defines reusable procedures rather than project status.
- `knowledge` distinguishes sources, claims, synthesis, uncertainty, and gaps.
- `models` records dated, source-backed capability and routing evidence rather than universal rankings.
- `agents` composes other packages rather than redefining them.
- `living-knowledge` defines corpus-maintenance procedures rather than owning the corpus.
- `meta` records maintenance policy and evidence rather than narrating the system again.
- `constitution` composes the packages rather than copying their contents.

An artifact should exist only when it routes work to source truth, records a decision that changes future action, preserves verification evidence, defines an authority boundary, or removes ambiguity that has caused a real mistake.

## Knowledge interoperability

Architectonic favors interfaces that allow knowledge tools to coexist and be replaced:

```text
plain-text canonical sources
stable identifiers
structured and versioned metadata
recoverable provenance
human-readable pages
machine-readable manifests
explicit links or typed relations
reported uncertainty, contradiction, staleness, and gaps
rebuildable lexical, vector, and graph indexes
review gates for publication and destructive changes
```

These principles are compatible with open knowledge formats, wiki-oriented LLM corpora, graph-backed retrieval, schema packs, and hybrid lexical/vector/graph systems. Tool-specific indexes are derived views rather than canonical truth.

## Main commands

```text
npx architectonic init [name]
npx architectonic add constitution
npx architectonic add doctrine
npx architectonic add identity
npx architectonic add project
npx architectonic add skills
npx architectonic add knowledge
npx architectonic add models
npx architectonic add agents
npx architectonic add living-knowledge
npx architectonic add meta
npx architectonic list
npx architectonic doctor
npx architectonic status
npx architectonic diff <package>
npx architectonic update [package...]
npx architectonic remove <package>
```

`npx architectonic init` creates a workspace root and installs the constitution ensemble:

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

The CLI installs canonical source repositories directly and records installed packages in `architectonic.json`. It does not duplicate package contents.

## Bundles

```text
constitution      constitution + doctrine + identity + project + skills + knowledge + models + agents + living-knowledge + meta
knowledge-system  constitution + doctrine + identity + project + skills + knowledge + living-knowledge + meta
agent-system      constitution + doctrine + identity + project + skills + knowledge + models + agents + meta
project-system    constitution + doctrine + identity + project + skills + knowledge + models + agents + meta
```

## Sources

`add` supports two source modes:

```text
--source git   # clone from GitHub or another git base
--source npm   # pack and extract from npm packages
```

The default is `git`.

```text
ARCHITECTONIC_SOURCE_BASE   # override the git source base
ARCHITECTONIC_NPM_BASE      # override the npm package base or local package root
ARCHITECTONIC_ADD_SOURCE    # change the default source mode
```

## Repository freshness

Repository-backed operators should resolve the current default branch and exact commit before reading or changing files:

```text
resolve repository -> fetch current ref/SHA -> read files by path -> act -> record resulting commit SHA
```

Indexed search, cached memory, inferred file lists, and stale snippets are discovery aids rather than repository source truth.

See [`docs/CONNECTOR_FRESHNESS.md`](./docs/CONNECTOR_FRESHNESS.md).

## Safety behavior

If a target directory already exists, `add` stops instead of silently overwriting it.

`update` should fast-forward only clean git worktrees and should not flatten local divergence. `remove` should refuse to delete a dirty worktree unless `--force` is explicit.

## Release verification

A release should be reported as published only after the registry confirms the expected version.

See [`docs/RELEASE.md`](./docs/RELEASE.md) and [`docs/NPM_PUBLISH_VERIFY_SKILL.md`](./docs/NPM_PUBLISH_VERIFY_SKILL.md).