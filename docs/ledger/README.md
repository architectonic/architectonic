# Architectonic ledger

Source code and tests remain authoritative.

Before changing `update`, `upgrade`, `remove`, manifest handling, hashing, or managed-path resolution, read:

- `audits/2026-07-27-monday-hard-findings.md`

The open managed-path containment finding is a destructive-operation release gate. Do not close it with documentation alone; closure requires shared containment code and traversal/symlink tests.
