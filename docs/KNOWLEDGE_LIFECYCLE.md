# Knowledge Lifecycle

## Memory, source, claim, and knowledge

```text
memory       trace or observation that may help recovery
source       recoverable artifact from which a claim may be assessed
claim        statement that may be true, false, uncertain, scoped, or contradicted
knowledge    governed corpus of claims, sources, evidence, uncertainty, and known unknowns
```

A transcript is not automatically knowledge. A generated summary is not automatically evidence. Retrieval relevance is not truth.

## Ordinary knowledge

Use `knowledge` when:

- updates happen through deliberate human or agent curation;
- source changes are occasional rather than continuous;
- a maintainer can review changes as part of normal work;
- stale material can be noticed and repaired without a recurring source-watch process.

Typical examples:

- project architecture;
- decisions and rationale;
- research notes for a bounded investigation;
- an internal glossary;
- a stable personal or organizational corpus.

## Living knowledge

Add `living-knowledge` when correctness decays on an external clock.

Typical examples:

- tax or building codes;
- market and provider catalogs;
- security advisories;
- rapidly changing product documentation;
- regulatory filings;
- inventories whose source systems change independently.

A living corpus requires:

```text
watch boundary       which sources may trigger review
freshness rule       when a claim becomes suspect or stale
comparison method    how candidate changes are detected
review standard      what evidence is sufficient
publication gate     who or what may update canonical material
destructive gate     who may retire, merge, or replace claims
budget               how much recurring work is justified
stop condition       when the maintenance cycle ends or pauses
```

Without those controls, “living” becomes uncontrolled mutation or endless research.

## Source-first compiled wiki

The `llm-wiki` profile adds a source-first working shape:

```text
sources/      immutable or recoverable source records
schema.md     local vocabulary, types, and adoption notes
wiki/         compiled, cross-referenced synthesis
inventory/    operational queues and state, not evidence
datasets/     external dataset manifests and query recipes
outputs/      derived reports, plans, or renderers
sessions/     operational checkpoints and feedback candidates
.archive/     preserved but quiet material
log.md        accepted corpus changes and reviewers
```

Compile once and query many times. Preserve source trails. Keep operational inventory separate from factual claims.

## Evaluation

Retrieval and synthesis should be evaluated against task-specific questions:

- Did the system locate the canonical source?
- Did it distinguish source, claim, and inference?
- Did it expose contradiction and uncertainty?
- Did it answer within the source’s scope and date?
- Did it preserve a recoverable citation path?
- Did a stale source cause a false conclusion?

A large corpus is not automatically a useful corpus.
