# Connector Freshness Doctrine

Autonomous repository operators must treat connector state as explicit evidence, not as ambient memory.

This doctrine prevents a common failure mode: an operator uses indexed search, cached snippets, or stale repo assumptions and concludes that the current repository state is missing, empty, or different from the actual latest commit.

## Required Protocol

Every repository-writing operator must begin with this protocol:

```text
1. Resolve the repository through the connector.
2. Fetch repository metadata.
3. Identify the exact ref or commit SHA being inspected.
4. Fetch every required file directly by path from that ref or SHA.
5. Record the inspected ref/SHA in the daily ledger, report, or run record.
6. Perform one bounded role pass.
7. Commit changes, if any.
8. Record the resulting commit SHA.
9. Do not assume a later read sees the new commit unless it is fetched directly.
```

## Source-of-Truth Rule

The following are not sufficient as source of truth for repository state:

- indexed code search;
- commit search snippets;
- cached conversation memory;
- inferred file lists;
- stale tool output;
- local assumptions about branch contents;
- previous run summaries.

They may help locate candidates, but the operator must still fetch files directly by path before acting.

## Failure Rule

If direct repository or file fetching fails:

```text
try latest known SHA from ledger/log
if that fails, record connector_blocked
stop cleanly
```

Do not continue by guessing. Do not create replacement scaffolds because a fetch failed. Do not treat an empty search result as proof of an empty repository.

## Write Rule

Before writing, the operator must know which file SHA or repository ref it inspected.

After writing, the operator must record the resulting commit SHA and changed paths.

If a follow-up write depends on the just-created commit, it must fetch from the new commit or file SHA rather than assuming default-branch freshness.

## Operator Prompt Snippet

Use this snippet in recurring GitHub-backed operators:

```text
MANDATORY CONNECTOR/FRESHNESS PROTOCOL:
- Use the GitHub connector for all repository reads and writes.
- Do not rely on indexed search, cached memory, inferred file lists, or stale snippets as source of truth.
- Start by resolving the target repository through the GitHub connector.
- Fetch required files directly by path from the inspected ref or commit SHA before making decisions.
- Record the inspected ref/commit SHA in today's status/report.
- If direct fetch fails, try the latest known commit SHA from today's ledger/log. If that also fails, record connector_blocked and stop cleanly.
- After writing, record the resulting commit SHA. Do not assume later reads see the new commit unless fetched directly.
```

## Rationale

The operator loop must be reproducible. A future reviewer should be able to answer:

```text
Which repo state did the operator inspect?
Which files did it read?
Which role did it select?
Which queue item did it consume?
Which commit did it produce?
```

Without inspected/ref SHA, the run is not fully auditable.
