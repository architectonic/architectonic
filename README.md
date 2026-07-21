# Architectonic

> **Status: experimental, pre-1.0.** Architectonic is under active use, but public comparative benchmarks and independent replications remain incomplete. Evaluate it through its contracts, conformance checks, examples, raw evidence, and stated limitations—not through stars, forks, or unsupported claims.

Architectonic is an **agent-readable operating protocol for human–AI organizations**.

It gives agents a stable, inspectable map of:

- what must remain true;
- why the organization and its projects exist;
- who may decide, delegate, approve, or stop;
- where source truth and current project context live;
- what is known, uncertain, contradicted, or missing;
- how recurring work is performed and verified;
- which agents and computational capabilities may be used;
- how the system is audited and revised.

Architectonic does not make an agent inherently correct. It makes organizational assumptions, authority, evidence, unknowns, procedures, and maintenance easier to locate and challenge before action.

## Start

```bash
npx architectonic@latest init my-organization --source npm
cd my-organization
npx architectonic verify
npx architectonic map
```

`verify` checks the declared protocol, package identity, canonical entries, and required layers. `map` shows the smallest canonical files an agent should inspect before broad repository search.

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

The CLI earns its place when you need the same structure to be reproducibly installed, mapped, semantically verified, versioned, compared, safely upgraded, and inspected across multiple workspaces. The files remain readable without the CLI.

## Commands

```bash
npx architectonic init [name] --preset full
npx architectonic add <layer|profile>
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
