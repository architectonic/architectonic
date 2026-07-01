# Release — GitHub Actions + npm trusted publishing

No laptop OTP after one-time setup. Tag push publishes via OIDC.

## One-time npm setup (each package, ~2 min)

On [npmjs.com](https://www.npmjs.com), open the package → **Settings** → **Trusted publishing**:

| npm package | GitHub repo | Workflow file |
|-------------|-------------|---------------|
| `architectonic` | `architectonic/architectonic` | `publish-npm.yml` |
| `architectonic-doctrine` | `architectonic/doctrine` | `publish-npm.yml` |
| `architectonic-constitution` | `architectonic/constitution` | `publish-npm.yml` |
| `architectonic-identity` | `architectonic/identity` | `publish-npm.yml` |
| `architectonic-project` | `architectonic/project` | `publish-npm.yml` |
| `architectonic-skills` | `architectonic/skills` | `publish-npm.yml` |
| `architectonic-knowledge` | `architectonic/knowledge` | `publish-npm.yml` |
| `architectonic-meta` | `architectonic/meta` | `publish-npm.yml` |
| `architectonic-living-knowledge` | `architectonic/living-knowledge` | `publish-npm.yml` |

For each row:

1. **Add GitHub Actions trusted publisher**
2. Repository owner: `architectonic`
3. Repository name: (second column, after `/`)
4. Workflow filename: `publish-npm.yml`
5. Environment: leave blank (any)
6. Save

Optional hardening after first green publish: **Publishing access** → require 2FA, disallow classic tokens.

## Release loop

1. Bump `version` in `package.json` (CLI reads it at runtime — no duplicate constant).
2. Commit and push to `main`.
3. Tag and push:

```bash
git tag v0.0.9
git push origin main
git push origin v0.0.9
```

4. GitHub Actions runs `publish-npm.yml` → `npm publish` via OIDC.
5. Confirm on npm or in the workflow **Verify registry** step.

Manual fallback (OTP): `npm publish --access public` from the repo root.

## Layer packages

Same pattern — one repo, one npm package, one tag per release. Git-sourced installs (`npx architectonic init`, default) pull from GitHub and do **not** need npm publish for content updates. npm publish matters for `--source npm` installs and semver pinning.

## Updating installed workspaces

```bash
npx architectonic update              # all git layers, ff-only if clean
npx architectonic update skills       # one layer
npx architectonic update --dry-run
```

Dirty git worktrees are skipped. Npm-sourced layers report when a newer npm version exists but are not overwritten automatically.
