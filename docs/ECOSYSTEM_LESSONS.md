# Ecosystem Lessons

Architectonic incorporates patterns from public work without making those projects mandatory dependencies.

## LLM Wiki

Reference: `nvk/llm-wiki` and `llm-wiki.net`.

Adopted lessons:

- preserve raw or recoverable sources;
- compile source-backed synthesis rather than repeatedly rereading everything;
- query an index before broad search;
- use a topic guide or schema to control local vocabulary;
- separate operational inventory from evidence;
- keep large datasets external through manifests and query recipes;
- use session records as operational memory, not topic truth;
- archive material quietly instead of deleting or constantly retrieving it;
- run explicit query, compilation, audit, and output loops.

## Open Knowledge Format

Reference: Google Cloud Platform `knowledge-catalog/okf` and `useokf.com`.

Adopted lessons:

- standard Markdown remains the portable source surface;
- minimal frontmatter provides machine-readable type and status;
- progressive indexes route agents to deeper material;
- logs preserve accepted change without turning every activity into permanent documentation;
- a knowledge format can be graph-adjacent without requiring a graph database.

## GBrain

Reference: `garrytan/gbrain`.

Adopted lessons:

- Git and Markdown can remain the system of record;
- databases, embeddings, and graph indexes are replaceable acceleration layers;
- schema packs and scoped permissions help heterogeneous corpora coexist;
- hybrid lexical, vector, and graph retrieval should be evaluated rather than assumed superior;
- consolidation and evaluation are ongoing maintenance work.

## Second-brain methods

Reference: Forte Labs’ CODE and PARA concepts.

Adopted lessons:

- capture, organize, distill, and express form a useful knowledge lifecycle;
- organize views around active outcomes and responsibilities;
- build incrementally rather than designing a complete taxonomy in advance;
- keep completed and inactive material quiet but recoverable;
- a personal view is not automatically an institutional source of truth.

## Loop engineering

Adopted lessons:

- recurring agents need durable state outside the model;
- triggers, queues, budgets, work ownership, verification, and stop conditions must be explicit;
- parallel agents require isolation and reconciliation boundaries;
- maker/checker patterns reduce but do not eliminate error;
- observability should measure outcomes, cost, failure, and review burden;
- humans retain authority over consequential or irreversible effects.

## Graph engineering

References include Graphify-style extraction pipelines and Microsoft GraphRAG patterns.

Adopted lessons:

- deterministic and inferred relations should be distinguished;
- inferred edges retain provenance, method, confidence, and review state;
- communities and hierarchical summaries can improve global navigation;
- graph-quality work includes broken links, orphans, ambiguity, overloaded nodes, and missing bridges;
- graph output remains a derived projection over canonical sources.

## Agent Skills

References include the public Agent Skills ecosystem from Anthropic, OpenAI, Google, GitHub, and other publishers.

Adopted lessons:

- a skill is a compact procedure with a clear trigger and progressively disclosed detail;
- public discovery and local trust are separate stages;
- provenance, license, risk, hidden tool use, and verification should be inspected before adoption;
- popularity is a discovery signal, not capability or safety evidence;
- skill success is not proof that every output is true.
