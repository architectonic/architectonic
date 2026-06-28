# architectonic

`architectonic` is a command-line tool for composing Architectonic constitution layers.

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

Optional package:

```text
living-knowledge  -- campaign-based maintenance pattern for a knowledge corpus
```

`teleology` is deprecated as a layer name and resolves to `doctrine`.

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
npx architectonic update
npx architectonic remove <layer>
```

`npx architectonic init` creates a workspace root and installs the `constitution` bundle.

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
git layers: only fast-forward clean git worktrees
npm layers: report newer packages but do not overwrite local forks
```

If a user has modified an installed instance, `update` should skip it rather than flatten their divergence.

`remove` deletes a recorded layer and updates the manifest. If the layer is a dirty git worktree, it refuses unless `--force` is explicit.

## Run vs install

```text
npx architectonic ...        # run immediately
npm install architectonic    # install as a dependency
npm install -g architectonic # install globally, then run `architectonic ...`
```
