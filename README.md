# architectonic

`architectonic` is a command-line tool for composing Architectonic constitution layers into a coherent human-agent operating system.

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
