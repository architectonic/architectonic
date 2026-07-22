# Loops and Graphs

Loops and graphs are patterns applied to canonical files. They are not additional sources of truth.

## Loop engineering

A loop converts a recurring objective into bounded, inspectable runs.

```text
trigger
-> read durable state
-> select bounded work
-> claim authority and budget
-> execute with approved tools and skills
-> verify independently
-> record evidence, cost, and failure
-> reconcile canonical state
-> stop, escalate, or schedule the next run
```

Required objects:

- objective and value hypothesis;
- trigger or schedule;
- durable state outside the model;
- queue or work-selection rule;
- worker and verifier roles;
- approved skills and tools;
- token, cost, time, and spawn budgets;
- mutation, privacy, and external-effect boundaries;
- human review and kill authority;
- stop conditions and retirement policy;
- run evidence sufficient to audit outcomes.

Failure modes include infinite loops, verifier theater, token burn, repeated rediscovery, silent state corruption, authority laundering, parallel agents editing the same artifact, and permanent accumulation of low-value reports.

A successful run does not make every generated claim true. Promote outputs into knowledge only through the knowledge layer’s evidence rules.

## Graph engineering

Two graph classes must remain distinct:

```text
knowledge graph      documents, claims, concepts, sources, and relationships
organization graph   projects, roles, authority, and skills
work graph           ledger items, dependencies, claims, reviews, gates, and evidence
```

The built-in `architectonic graph` command produces a knowledge/document projection. The `architectonic-rail` layer defines the canonical work-ledger contract from which a work graph may be projected. Neither projection replaces its sources.

A graph projection helps agents navigate relationships that are difficult to recover from a flat tree.

Architectonic’s built-in projection extracts only explicit links:

```bash
npx architectonic graph --format both
```

Outputs:

```text
.architectonic/derived/graph.json
.architectonic/derived/graph.dot
```

The projection reports:

- broken targets;
- ambiguous wikilinks;
- orphaned documents;
- high-degree gravity wells that may indicate overloaded concepts.

## Extracted and inferred edges

```text
extracted edge  explicit Markdown link, wikilink, or declared relation
inferred edge   model- or algorithm-proposed relation requiring provenance and review
```

The built-in graph uses extracted edges. Graphify, GraphRAG, embeddings, entity extraction, community detection, and similarity search may add inferred edges or summaries. Those additions should retain method, model, date, confidence, source scope, and review status.

## Obsidian

Obsidian can render the Markdown and wikilinks directly. Architectonic does not require an Obsidian vault format beyond ordinary files, and its canonical content should remain understandable without Obsidian.

## Canonical boundary

```text
canonical Markdown and source records
  -> explicit graph projection
  -> optional enriched graph
  -> visual maps, community summaries, search, and navigation
```

Every derived layer should be rebuildable or removable without destroying the organization’s knowledge.
