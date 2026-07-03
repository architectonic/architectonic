# NPM Publish and Verify Skill

Use this workflow when changing an npm-published Architectonic package.

This is an operator skill, not a permanent background loop. It exists to prevent false release claims, stale-repository mistakes, and unverified npm publication status.

## Scope

Applies to npm-published Architectonic repositories, including:

- `architectonic/architectonic` -> `architectonic`
- `architectonic/doctrine` -> `architectonic-doctrine`
- `architectonic/constitution` -> `architectonic-constitution`
- `architectonic/identity` -> `architectonic-identity`
- `architectonic/project` -> `architectonic-project`
- `architectonic/skills` -> `architectonic-skills`
- `architectonic/knowledge` -> `architectonic-knowledge`
- `architectonic/meta` -> `architectonic-meta`
- `architectonic/living-knowledge` -> `architectonic-living-knowledge`

## Hard Rules

1. Do not claim a package was published until npm registry state has been checked.
2. Do not infer the latest repository version from memory, indexed search, or previous chat state.
3. Resolve the repository through GitHub first.
4. Fetch `package.json` directly from the inspected ref.
5. Compare repo version against npm registry version before deciding whether to bump.
6. Only bump when there is a real package change that should produce a new npm version.
7. After a release, verify with `npm view <package> version` or the workflow's `Verify registry` step.
8. Report the inspected commit, resulting commit, tag, package name, expected version, and observed npm version.

## Decision Procedure

```text
resolve repo through GitHub
fetch package.json directly by path
read current package name and version
check npm registry version

if repo version == npm version and no package change is needed:
  do not bump
  report that registry and repo agree

if a package change is needed:
  patch the package
  bump package.json using semver
  commit and push
  tag v<package.json version>
  push the tag
  wait for GitHub Actions publish workflow to run
  verify npm registry version
```

## Commands

```bash
npm view <package-name> version
npm version patch --no-git-tag-version
git add package.json <changed-files>
git commit -m "Release <package-name> v<version>"
git tag v<version>
git push origin main
git push origin v<version>
npm view <package-name> version
```

Use `minor` or `major` instead of `patch` only when the package change warrants it.

## GitHub Actions Expectations

The publish workflow should:

- run on version tag pushes;
- check that the tag matches `package.json`;
- run a smoke test;
- install an npm version that supports trusted publishing;
- check whether the package version is already published;
- publish only if the registry does not already contain that version;
- verify the registry after publishing.

## Report Template

```text
Package: <package-name>
Repo: <owner/repo>
Inspected commit/ref: <sha-or-ref>
Repo version before: <version>
NPM version before: <version-or-none>
Changed files: <paths>
Bump: none|patch|minor|major
Result commit: <sha>
Tag: v<version>|none
NPM version after: <version>
Workflow: <passed|skipped|failed|not-run>
Conclusion: <published|already-current|blocked>
```

## Failure Handling

If GitHub cannot be fetched directly, stop and report `github_fetch_blocked`.

If npm cannot be queried, stop and report `npm_verify_blocked`.

If the workflow publishes but registry verification does not show the expected version, report `publish_unverified`; do not claim success.
