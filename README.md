# Architectonic

Architectonic is a way of thinking based on systemic reasoning.

It helps humans and software systems make assumptions, boundaries, evidence, authority, incentives, uncertainty, and consequences explicit before acting.

The software in this repository is one implementation of that approach.

## Principles

- Treat systems as relationships, constraints, feedback loops, and consequences rather than isolated parts.
- Distinguish evidence from inference, memory from knowledge, explanation from proof, and output from results.
- Make authority and responsibility explicit.
- Prefer the smallest structure that performs the work and preserves necessary distinctions.
- Keep claims revisable when evidence or conditions change.
- Inspect how a conclusion was reached, what is missing, and what would change it.
- Preserve useful decisions and distinctions so they can be reused and challenged.
- Keep implementations replaceable.

## Human and AI collaboration

A useful collaboration pattern is:

```text
AI explores possibilities, connections, and alternatives.
Humans identify priorities, constraints, invariants, and acceptable consequences.
```

These are tendencies, not exclusive roles. Either participant may generate possibilities, test assumptions, or identify patterns. The purpose of the distinction is to make missing cognitive work visible.

## Current software implementation

The `architectonic` package is a command-line tool for composing Architectonic layers into a coherent human-agent operating system.

The default scaffold is:

```text
constitution      -- root scaffold / bundle contract
doctrine          -- governing principles, purpose, ethics, ontology, epistemology, governance, incentives
identity          -- actors, roles, authority, incentives, privacy
project           -- operating-unit context
skills            -- reusable procedures and verification
knowledge         -- disclosed knowledge corpus and evidence
meta              -- self-audit, upkeep, drift control, recursive improvement
```

Optional addon:

```text
living-knowledge  -- campaign-based maintenance pattern for a knowledge corpus
```

`teleology` is deprecated as a layer name and resolves to `doctrine`.

The core stack fits together like this:

```text
doctrine          -> what the system is for and what governs it
identity          -> who participates and what authority they hold
project           -> where a specific operating unit does its work
skills            -> how recurring procedures are executed and verified
knowledge         -> what the system knows and can evidence
meta              -> how the system audits, maintains, and improves itself
living-knowledge  -> optional addon for campaign-based corpus maintenance
constitution      -> the scaffold that composes the stack above
```

## Main commands

```text
npx architectonic init [name]
npx architectonic add constitution
npx architectonic add doctrine
npx architectonic add identity
npx architectonic add project
npx architectonic add skills
npx architectonic add knowledge
npx architectonic add meta
npx architectonic add living-knowledge
npx architectonic add teleology        # deprecated alias for doctrine
npx architectonic list
npx architectonic doctor
npx architectonic status
npx architectonic diff <layer>
npx architectonic update [layer...]
npx architectonic remove <layer>
```

`npx architectonic init` creates a workspace root and installs the `constitution` bundle.

That default bundle includes `constitution`, `doctrine`, `identity`, `project`, `skills`, `knowledge`, and `meta`.

`living-knowledge` is intentionally separate so teams can opt into corpus-maintenance campaigns without forcing that structure onto every install.

`npx architectonic add constitution` installs the canonical source repositories directly:

```text
./constitution
./doctrine
./identity
./project
./skills
./knowledge
./meta
./architectonic.json
```

The CLI does not duplicate layer contents. It clones or packs each canonical source package and records the installed layers in `architectonic.json`.

## Bundles

```text
constitution      constitution + doctrine + identity + project + skills + knowledge + meta
knowledge-system  constitution + doctrine + knowledge + meta + living-knowledge
agent             doctrine + identity + skills + meta
project           doctrine + project + skills + knowledge + meta
```

`living-knowledge` is only included when explicitly added or when a bundle such as `knowledge-system` asks for it.

## Sources

`add` supports two source modes:

```text
--source git   # clone from GitHub or another git base
--source npm   # pack and extract from npm packages
```

The default is `git`.

Environment overrides:

```text
ARCHITECTONIC_SOURCE_BASE   # override the git source base
ARCHITECTONIC_NPM_BASE      # override the npm package base or local package root
ARCHITECTONIC_ADD_SOURCE    # change the default source mode
```

## Connector freshness

GitHub-backed autonomous operators must use the Connector Freshness Doctrine in [`docs/CONNECTOR_FRESHNESS.md`](./docs/CONNECTOR_FRESHNESS.md).

Core rule:

```text
resolve repo -> fetch exact ref/SHA -> fetch files directly by path -> act -> record resulting commit SHA
```

Indexed code search, cached memory, inferred file lists, and stale snippets are not sufficient source of truth for repo state.

## Release verification

NPM-published Architectonic packages must use the publish-and-verify operator skill in [`docs/NPM_PUBLISH_VERIFY_SKILL.md`](./docs/NPM_PUBLISH_VERIFY_SKILL.md).

Core rule:

```text
read package.json from GitHub -> check npm registry -> bump only when needed -> publish by tag -> verify npm registry
```

Do not claim a release is live until `npm view <package> version` or the workflow verify step confirms the expected version.

## Safety behavior

If a target directory already exists, `add` stops instead of silently overwriting it.

`update` is conservative by design:

```text
git layers: only fast-forward clean git worktrees; pass layer names to update one layer (`architectonic update skills`)
npm layers: report when a newer npm version exists; does not overwrite local installs
```

If a user has modified an installed instance, `update` should skip it rather than flatten their divergence.

`remove` deletes a recorded layer and updates the manifest. If the layer is a dirty git worktree, it refuses unless `--force` is explicit.

## Run vs install

```text
npx architectonic ...        # run immediately
npm install architectonic    # install as a dependency
npm install -g architectonic # install globally, then run `architectonic ...`
```

Release (GitHub Actions + npm OIDC): see [docs/RELEASE.md](./docs/RELEASE.md).
