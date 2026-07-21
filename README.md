# Architectonic

> **Status: experimental, pre-1.0.** Architectonic is under active use, but public comparative benchmarks and independent replications remain incomplete. Evaluate it through its contracts, conformance checks, examples, raw evidence, and stated limitations—not through stars, forks, or unsupported claims.

Architectonic is an **agent-readable operating protocol for human–AI organizations**.

It helps an agent establish and maintain an organization by separating:

- organization-owned facts, decisions, authority, projects, and policy;
- upstream contracts, schemas, examples, and reusable procedures;
- sources, claims, assumptions, contradictions, and known unknowns;
- installed agents from runtime authority;
- automated discovery from governed publication and destructive action.

Architectonic does not make an agent inherently correct. It makes organizational assumptions, authority, evidence, unknowns, procedures, and maintenance easier to locate and challenge before action.

## Start

```bash
npx architectonic@latest init my-organization --source npm
cd my-organization
npx architectonic onboard
npx architectonic verify
npx architectonic map
```

`init` installs the selected protocol layers and creates an editable `organization/` instance. Installed package directories remain upstream contracts; local facts and decisions belong under `organization/` so package upgrades do not overwrite the organization.

## Document-guided onboarding

`ONBOARDING.md` gives agents a disciplined way to “grill the user with documents” without administering a generic questionnaire:

```text
inspect current documents and source artifacts
-> expose material gaps, assumptions, and authority questions
-> ask the highest-value targeted question
-> record the explicit answer in its primary organization file
-> preserve unresolved unknowns
-> verify the updated map
-> stop when enough is known for the current work
```

Agents should not ask for information already recoverable from sources, invent answers to complete templates, or infer authority from access. Every question should be tied to a file, decision, risk, or action it will change.

## Build the organization

```text
constitution      what must remain true and how material change is approved
doctrine          purpose, conduct, authority, evidence, incentives, and decision rules
identity          actors, roles, delegation, privacy, and stopping authority
agents            software actors composed from identity, skills, knowledge, models, and permissions
project           bounded operating contexts with sources, decisions, risks, and open questions
knowledge         one or more sourced, revisable corpora
living-knowledge  optional maintenance for corpora that change frequently
skills            reusable procedures with inputs, verification, and failure handling
models            optional capability evidence and routing policy
meta              audit, drift review, failure learning, revision, and retirement
```

Use the whole system or only the layers that remove demonstrated ambiguity. The default `full` profile installs all ten layers. Named partial profiles remain valid and are verified against their own declared requirements.

## Why not copy the principles?

You can. Architectonic is intentionally file-native, runtime-neutral, and replaceable.

The CLI earns its place when you need the same structure to be reproducibly installed, locally instantiated, mapped, semantically verified, versioned, compared, safely upgraded, and inspected across multiple workspaces. The files remain readable without the CLI.

## Commands

```bash
npx architectonic init [name] --preset full
npx architectonic add <layer|profile>
npx architectonic onboard [--fix]
npx architectonic map
npx architectonic verify
npx architectonic doctor
npx architectonic status
npx architectonic upgrade [layer...]
npx architectonic agent create --spec <file> --output <dir>
```

`add constitution` installs only the constitution layer. `init --preset constitution` remains a deprecated compatibility alias for `init --preset full`.

## Claim discipline

Architectonic distinguishes:

```text
design objective       intended effect, not yet measured
mechanism demonstrated inspectable behavior supported by tests
internally observed    observed in active use, not independently reproduced
publicly benchmarked   reproduced from published fixtures, runs, and scoring
externally replicated  independently reproduced under the published protocol
```

No claim should outrun its evidence. See `docs/CLAIMS.md`, `docs/MATURITY.md`, and `docs/EVALUATE.md`.

## License

Apache-2.0.
