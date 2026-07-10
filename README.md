# Architectonic

Architectonic is a living discipline for improving judgment across humans and AI.

It exists to discover, test, refine, preserve, and transmit durable distinctions that remain useful after any individual person, model, runtime, repository, or implementation is gone.

The software in this repository is one implementation of Architectonic. It is not Architectonic itself.

```text
Architectonic discipline
→ epistemology
→ cognition and metacognition
→ doctrine
→ organizations and operating systems
→ replaceable software implementations
```

The governing objective is not to maximize intelligence, output, or automation in isolation. It is to improve the quality of judgment: what is believed, why it is believed, what kind of cognition produced a conclusion, what remains missing, and what action is justified under uncertainty, incentives, constraints, and consequences.

## Durable distinctions

Architectonic accumulates cognition rather than information.

A distinction deserves to survive when it repeatedly improves future judgment, removes ambiguity, exposes a failure mode, defines an authority boundary, or changes action for the better.

Examples include:

- intelligence is not cleverness, erudition, or wisdom;
- evidence is not inference;
- explanation is not proof;
- a passing test is not a working system;
- memory is not knowledge;
- generation is not judgment;
- tools and implementations are temporary;
- durable distinctions should survive their creators.

The system must allow distinctions to be challenged, revised, superseded, combined, or retired. Survival is earned through continued explanatory and operational value, not through age, authority, repetition, or attachment to a founder.

## Human and AI collaboration

The partnership is intentionally asymmetric.

```text
AI expands the search space:
possibilities, connections, analogies, alternatives, synthesis

Humans search for invariants:
what survives, what is fundamental, what is proportionate, what should govern action
```

Neither role is sufficient alone.

Generation without judgment produces plausible noise. Judgment without exploration misses possibilities. Architectonic exists to make their interaction cumulative so that good distinctions survive individual conversations and become available to future humans and future AI.

## Substrate independence

Architectonic must survive replacement of every current implementation.

It is not identical to:

- this CLI;
- npm or `npx`;
- Workframe;
- ABKB;
- Hermes;
- Codex, Cursor, Claude, or any model/runtime;
- any current repository structure;
- any individual human, including its founder.

Those are present substrates. They may embody the discipline well or badly, and they may be replaced.

The success criterion is that the quality of reasoning and judgment continues to improve because durable distinctions have become institutional rather than remaining dependent on one biological brain or one model generation.

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
