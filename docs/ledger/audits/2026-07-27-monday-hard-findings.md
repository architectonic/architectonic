# Monday morning hard findings — 2026-07-27

**Verified:** 2026-07-21  
**Source:** `main` at `4fb1cb4e5047fe719588fd25fa844386de6eedaf`

Only source-demonstrable findings are recorded here.

## ARCH-AUD-001 — manifest paths can escape the workspace during destructive operations

**Severity:** P0 — arbitrary filesystem mutation/deletion

The CLI loads `architectonic.json` as mutable workspace input. Several management paths trust `manifest.layers[layer].path` and resolve it without checking that the result remains inside the Architectonic workspace:

- `lib/manage.js:updateGitLayer()` calls Git in `path.resolve(root, item.path)`;
- `lib/manage.js:upgradeNpmLayer()` renames and removes that resolved directory and its backup;
- `lib/manage.js:remove()` calls `fs.rmSync(dir, { recursive: true, force: true })` on that resolved directory.

A malicious or corrupted manifest can set a layer path such as `../../target-directory` or an absolute path. `architectonic remove <layer> --force` can then recursively delete a directory outside the workspace. `update` and `upgrade` can likewise operate outside the managed root.

The current dirty/integrity checks do not establish path containment. `--force` bypasses the local-change refusal but does not add a containment check.

### Required correction

Create one mandatory managed-path resolver and use it before every read or mutation derived from manifest paths:

1. Resolve the workspace root and candidate path.
2. Reject the root itself.
3. Reject any candidate whose relative path is empty, absolute, begins with `..`, or escapes through a symlink.
4. For existing targets, compare canonical `realpath` values.
5. For not-yet-existing targets, canonicalize the nearest existing parent and verify containment before creation.

Apply the boundary to at least:

- `updateGitLayer`;
- `upgradeNpmLayer`;
- `remove`;
- inspection and hashing paths that trust `item.path`;
- any future migration command.

### Required tests

- `../outside` path;
- absolute path;
- symlink inside the workspace pointing outside;
- path resolving to the workspace root;
- valid nested layer path;
- `--force` must not bypass containment;
- malformed manifest must fail before any rename, pull, extraction, hash, or deletion.

## Monday stop line

Do not run `architectonic remove`, `update`, or `upgrade` in an untrusted or externally supplied workspace until ARCH-AUD-001 is fixed. `init`, `map`, and read-only inspection are outside this exact destructive path but should still reject malformed managed paths when the common resolver lands.