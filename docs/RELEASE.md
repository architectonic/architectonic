# Release — GitHub Actions + npm trusted publishing

Tag pushes publish through npm trusted publishing after one-time package setup.

## Package map

| npm package | GitHub repository | Workflow |
|-------------|-------------------|----------|
| `architectonic` | `architectonic/architectonic` | `publish-npm.yml` |
| `architectonic-constitution` | `architectonic/constitution` | `publish-npm.yml` |
| `architectonic-doctrine` | `architectonic/doctrine` | `publish-npm.yml` |
| `architectonic-identity` | `architectonic/identity` | `publish-npm.yml` |
| `architectonic-project` | `architectonic/project` | `publish-npm.yml` |
| `architectonic-skills` | `architectonic/skills` | `publish-npm.yml` |
| `architectonic-knowledge` | `architectonic/knowledge` | `publish-npm.yml` |
| `architectonic-models` | `architectonic/models` | `publish-npm.yml` |
| `architectonic-agents` | `architectonic/agents` | `publish-npm.yml` |
| `architectonic-living-knowledge` | `architectonic/living-knowledge` | `publish-npm.yml` |
| `architectonic-meta` | `architectonic/meta` | `publish-npm.yml` |

## First publication of a new package

A package must exist on npm before its GitHub Actions trusted publisher can be configured.

From an authenticated local checkout:

```bash
npm whoami
npm pack --dry-run
npm publish --access public
```

The first publication creates the package when the name is available and the authenticated npm account is allowed to publish it.

Then open the package on npm and configure:

1. **Settings** → **Trusted publishing** → **GitHub Actions**.
2. Repository owner: `architectonic`.
3. Repository name: the repository in the package map.
4. Workflow filename: `publish-npm.yml`.
5. Environment: blank unless a repository environment is intentionally used.
6. Save.

The initial packages requiring this bootstrap are:

```text
architectonic-agents@0.1.0
architectonic-models@0.1.0
```

## Normal release loop

1. Fetch the current default branch and confirm it is clean.
2. Run repository validation.
3. Bump `version` in `package.json`.
4. Commit and push the version change.
5. Create and push the matching tag.

```bash
VERSION="$(node -p "require('./package.json').version")"
git tag "v$VERSION"
git push origin main
git push origin "v$VERSION"
```

The workflow checks that the tag matches `package.json`, publishes through OIDC, and verifies the version shown by the npm registry.

## Current CLI release

The CLI package is prepared as:

```text
architectonic@0.0.11
```

Before tagging it, run:

```bash
npm test
npm pack --dry-run
```

## Layer sources

Git-sourced installs pull directly from GitHub and do not require an npm release. npm publication is required for `--source npm`, reproducible semver installation, and registry-based distribution.

## Updating installed workspaces

```bash
npx architectonic update
npx architectonic update skills
npx architectonic update --dry-run
```

Dirty git worktrees are skipped. npm-sourced layers are not overwritten automatically.
