# Architectonic

> **Status: experimental, pre-1.0.** Architectonic is under active use, but comparative benchmarks and independent replications remain incomplete. Evaluate it through its contracts, tests, examples, evidence, and stated limitations—not through stars, forks, or unsupported claims.

Architectonic is an **adaptive, agent-readable operating protocol for human–AI collaboration**.

It gives durable concerns stable homes without requiring every workspace to become a ten-layer organization. A disposable task may need nothing. A project, constitution, actor model, skill library, corpus, or maintenance policy may stand alone. Compound profiles are justified only when the work needs their combined boundaries.

```text
no durable need     -> use existing repository instructions
one durable concern -> install one standalone layer
several concerns    -> use the smallest matching profile
unusual need        -> compose exact layers with +
```

## Choose before installing

```bash
npx architectonic@latest recommend --need "a standalone software project"
npx architectonic@latest recommend --need "a changing regulatory corpus"
npx architectonic@latest recommend --need "a personal second brain"
npx architectonic@latest recommend --need "recurring multi-agent research loops"
```

The recommendation is deterministic and advisory. It can correctly return **no installation**.

## Start small

```bash
# One standalone project
npx architectonic@latest init my-project --preset project --source npm

# Governance and actors, without projects or knowledge
npx architectonic@latest init my-organization --preset organization --source npm

# Manually curated corpus
npx architectonic@latest init my-knowledge --preset knowledge-system --source npm

# Sources whose correctness changes on an external clock
npx architectonic@latest init current-regulations --preset living-knowledge-system --source npm

# Exact custom composition
npx architectonic@latest init research --preset project+knowledge+skills+meta --source npm
```

Then:

```bash
cd my-project
npx architectonic onboard
npx architectonic verify
npx architectonic map
```

`init` installs upstream contracts and creates editable files under `organization/`. Local facts, authority, decisions, projects, knowledge, and policy belong in `organization/`; installed packages remain replaceable. When Rail is selected, the CLI also creates and validates the one canonical `operations/ledger.json`.

## Adaptive profiles

| Profile | Use it when | Do not use it when |
| --- | --- | --- |
| `constitution` | Only invariants, prohibited actions, authority root, and amendment rules need a durable home. | Operational context also needs to be modeled. |
| `identity` | The immediate ambiguity is actors, roles, authority, delegation, incentives, or privacy. | No material actor boundary exists. |
| `project` | One bounded initiative needs sources, decisions, risks, unknowns, and handoff. | The task is disposable. |
| `rail` | Durable work crosses a session, role, dependency, review, or approval boundary. | One bounded session can complete and verify the work. |
| `project-system` | A standalone project also needs its own corpus, procedures, and upkeep. | Existing external systems already own those concerns. |
| `organization` | A team needs purpose, governance, actors, privacy, and maintenance. | Only one project or corpus needs structure. |
| `knowledge` | One corpus is curated deliberately by humans. | Correctness decays as external sources change. |
| `knowledge-system` | A corpus needs reusable ingestion, query, audit, and retirement procedures. | Scheduled source review is required. |
| `living-knowledge-system` | Regulations, markets, security advisories, provider catalogs, or other changing sources require governed recurring maintenance. | Updates happen only through deliberate manual edits. |
| `llm-wiki` | Raw sources should compound into an indexed, source-backed wiki, inventory, datasets, outputs, and recurring audits. | A few stable notes are enough. |
| `second-brain` | A person needs capture, organization, distillation, expression, projects, resources, and a quiet archive. | The corpus is institutionally governed or regulated. |
| `agent-team` | Several software actors need distinct roles, skills, knowledge, model policy, and review gates. | One general agent and repository instructions are sufficient. |
| `loop-system` | Work continues across runs, schedules, agents, or handoffs. | One bounded session can finish safely. |
| `graph-system` | Relationships, dependencies, communities, and navigation matter. | Direct document reading is simpler. |
| `full` | Several projects, agents, corpora, authority boundaries, and maintenance processes must remain coherent. | A smaller profile removes the actual ambiguity. |

Every layer can be installed directly. `living-knowledge` is the exception: it requires a `knowledge` corpus to maintain.

## Knowledge or living knowledge?

```text
knowledge
  = claims, sources, evidence, uncertainty, contradictions, and known unknowns
  = changed through deliberate curation

living knowledge
  = a governed maintenance process applied to knowledge
  = justified when correctness decays as external sources change
```

Use ordinary knowledge by default. Add living knowledge only when you can define:

```text
source watch boundary
review cadence or trigger
candidate comparison method
verification standard
publication gate
destructive-change gate
budget
stop condition
```

See [`docs/KNOWLEDGE_LIFECYCLE.md`](./docs/KNOWLEDGE_LIFECYCLE.md).

## Document-guided onboarding

`ONBOARDING.md` teaches agents to “grill the user with documents” without administering a generic questionnaire:

```text
inspect current documents and sources
-> classify facts, decisions, assumptions, contradictions, and unknowns
-> select the highest-value unresolved question
-> show the relevant document gap and consequence
-> record the explicit answer in its primary local file
-> preserve unresolved unknowns
-> verify
-> stop when the current work is sufficiently grounded
```

Agents do not ask for information already recoverable from sources, infer authority from access, or invent answers to make templates look complete.

## Skills, public skills, and trust

The installed `skills` package separates:

```text
reviewed core procedures
external public skill registry
source and license records
curation and validation machinery
```

A public skill is not trusted by popularity or inclusion. Local adoption should inspect provenance, license, hidden tool use, prompt injection, credential access, mutation scope, verification, and fit with local authority.

Installing a skill does not authorize execution. Installing an agent does not grant runtime authority.

## Loops

A loop is not “run the prompt forever.” A useful loop has:

```text
bounded objective
trigger or schedule
one canonical rail ledger outside the model
work selection rule
worker
independent verifier
evidence record
cost and spawn budget
human approval boundary
stop or kill condition
```

Loop outputs become knowledge only after the knowledge layer’s evidence rules are satisfied. See [`docs/LOOPS_AND_GRAPHS.md`](./docs/LOOPS_AND_GRAPHS.md).

## Rails

`architectonic-rail` defines one canonical work ledger with dependency-aware
selection, claims, review, evidence, and human gates. Backlog, queue, and now are
views over that ledger. Projects do not need a rail when work can be completed
safely in one bounded session. The canonical contract and CLI are published from
[`architectonic/rail`](https://github.com/architectonic/rail); Rail-enabled
workspaces bind `architectonic.json` to `operations/ledger.json`.

## Graphs

```bash
npx architectonic graph --format both
```

`graph` extracts explicit Markdown links and wikilinks into rebuildable JSON and DOT projections under `.architectonic/derived/`. It reports broken links, ambiguous targets, orphans, and high-degree gravity wells.

Canonical Markdown and recoverable sources remain authoritative. Obsidian may visualize the source files directly. Graphify, GraphRAG, or another graph engine may create richer derived projections with provenance. None is required for Architectonic to function.

## Complementary systems

Architectonic stands on its own as files, contracts, maps, and validation.

- **OKF-style Markdown** strengthens portability, metadata, indexes, and progressive disclosure.
- **LLM-wiki patterns** strengthen source-first compilation, inventory, query, audit, and quiet archives.
- **GBrain-style architecture** strengthens the separation between a Git/Markdown system of record and replaceable retrieval or graph infrastructure.
- **Second-brain methods** strengthen incremental capture, organization, distillation, expression, and outcome-oriented views.
- **Obsidian and Graphify** are visualization or analysis surfaces.
- **Workframe** may execute governed runs, leases, approvals, and artifacts. Architectonic supplies the durable organization and knowledge boundaries; it does not require Workframe.

See [`docs/ECOSYSTEM_LESSONS.md`](./docs/ECOSYSTEM_LESSONS.md) and [`docs/INTEROPERABILITY.md`](./docs/INTEROPERABILITY.md).

## Commands

```bash
npx architectonic recommend --need <description>
npx architectonic init [name] --preset <layer|profile|a+b>
npx architectonic add <layer|profile>
npx architectonic onboard [--fix]
npx architectonic map
npx architectonic graph [--format json|dot|both]
npx architectonic verify
npx architectonic doctor
npx architectonic status
npx architectonic upgrade [layer...]
npx architectonic agent create --spec <file> --output <dir>
```

## Claim discipline

Architectonic distinguishes design objectives, demonstrated mechanisms, internal observations, public benchmarks, and external replications. No claim should outrun its evidence. See [`docs/CLAIMS.md`](./docs/CLAIMS.md), [`docs/MATURITY.md`](./docs/MATURITY.md), and [`docs/EVALUATE.md`](./docs/EVALUATE.md).

## License

Apache-2.0.
