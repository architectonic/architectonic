# architectonic

`architectonic` is a command-line tool for composing the core layers of an agentic system.

Those layers currently include:

```text
teleology  -- purpose, principles, doctrine, governance
identity   -- actors, roles, authority, boundaries
project    -- operating context for a concrete initiative
skills     -- reusable procedures and capabilities
```

The initial placeholder releases were intentionally minimal. Starting in
`0.0.5`, `architectonic` can initialize a workspace, add layers, inspect the
local manifest, repair light manifest drift, update safely, and remove layers
without trampling local forks.

Starting in `0.0.6`, it can also inspect drift with `status` and `diff`.

## Command shape

The primary interaction model is:

```text
architectonic add teleology
architectonic add identity
architectonic add project
architectonic add skills
architectonic add teleology identity skills
architectonic init
architectonic doctor
architectonic status
architectonic diff
architectonic list
architectonic update
architectonic remove
```

`add` is explicit and leaves room for future verbs such as `doctor`, `list`,
`update`, and `remove`.

## Current behavior

The primary implemented command is:

```text
npx architectonic add teleology
npx architectonic add identity
npx architectonic add project
npx architectonic add skills
npx architectonic add teleology identity skills
npx architectonic add skills --dir ./vendor
npx architectonic add teleology --source npm
npx architectonic init MyWorkspace
npx architectonic init --preset company
npx architectonic list
npx architectonic doctor
npx architectonic doctor --fix
npx architectonic status
npx architectonic diff teleology
npx architectonic update
npx architectonic update --dry-run
npx architectonic remove skills
```

`add` installs from the Architectonic GitHub organization into the current
directory by default:

```text
./teleology
./identity
./project
./skills
./architectonic.json
```

`architectonic.json` records what was installed and where it landed.

If a target directory already exists, the command stops instead of silently
overwriting it.

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

`list` reads `architectonic.json` and shows installed layers.

`doctor` verifies that each recorded layer still exists and that the installed
package metadata matches the expected layer. `doctor --fix` repairs light
manifest drift such as stale package names or recoverable default paths.

`status` gives a read-only summary of each layer:

```text
git layers: branch, dirty/clean, ahead/behind upstream
npm layers: installed version vs published version
```

`diff <layer>` drills into one layer:

```text
git layers: local status lines plus ahead/behind numbers
npm layers: installed version vs published version
```

`init` creates a workspace root, installs a preset, and seeds a top-level
`README.md` and `AGENTS.md`.

Supported presets:

```text
solo     # teleology + identity + project + skills
company  # teleology + project + skills
project  # project + skills
agent    # identity + skills
```

`update` is conservative by design:

```text
git layers: only fast-forward clean git worktrees
npm layers: report newer packages but do not overwrite local forks
```

If a user has modified an installed instance, `update` should skip it rather
than flatten their divergence.

`remove` deletes a recorded layer and updates the manifest. If the layer is a
dirty git worktree, it refuses unless `--force` is explicit.

## Run vs install

```text
npx architectonic ...        # run immediately
npm install architectonic    # install as a dependency
npm install -g architectonic # install globally, then run `architectonic ...`
```
