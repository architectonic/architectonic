# Agent instructions

This repository defines the Architectonic CLI.

## Read order

1. Read `README.md` and `CHANGELOG.md`.
2. Read `operations/ledger.json` for durable current work.
3. Read the source and tests affected by the selected item.
4. Read `docs/audits/` when changing managed paths, installation, update, upgrade, removal, hashing, or verification.

## Rail contract

- `operations/ledger.json` is the only current-work authority.
- Backlog, ready queue, and now are views over that ledger, not authored files.
- Small work completed and verified in one session does not require a new item.
- Source code, tests, packed artifacts, and runtime evidence remain implementation truth.
- Do not release over an unresolved P0 or explicit release stop line.
