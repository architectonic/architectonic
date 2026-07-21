# Adaptive Composition

Architectonic is a vocabulary of separable concerns, not a requirement to install every concern.

## Selection ladder

```text
0. Disposable work
   Use current repository instructions. Do not create a durable system.

1. Standalone concern
   Install one layer when one durable distinction changes future action.

2. Named profile
   Use the smallest profile whose boundaries repeatedly matter together.

3. Custom composition
   Compose exact layers with `+` when no named profile matches.

4. Full organization
   Use only when projects, actors, knowledge, agents, and maintenance must remain coherent together.
```

## Standalone examples

```bash
npx architectonic init policy --preset constitution
npx architectonic init actors --preset identity
npx architectonic init product --preset project
npx architectonic init research --preset knowledge
npx architectonic init procedures --preset skills
npx architectonic init audit --preset meta
```

A project is a complete bounded operating unit. It does not require a constitution or identity package unless governance or actor authority is material to that project.

An identity system is useful when actors, authority, delegation, incentives, access, or privacy are the problem. It does not require a project.

A constitution is useful when invariants, prohibited actions, authority roots, and amendment rules are the problem. It does not require operational layers.

## Compound profiles

A profile is an opinionated convenience, not a new source of truth. Its layer list and feature scaffolds are declared in `protocol/profiles.json` and remain inspectable.

```bash
npx architectonic recommend --need "recurring multi-agent project"
npx architectonic init work --preset project+skills+knowledge+agents+meta
```

## Promotion rule

Add a layer only when at least one of these is true:

- the distinction has caused a real mistake;
- the artifact changes future action;
- authority or privacy would otherwise remain ambiguous;
- evidence or provenance must survive a session;
- repeated work needs a verified procedure;
- changing sources require governed maintenance;
- relationships are too dense for reliable flat navigation;
- another agent must resume without reconstructing the system.

Do not install structure because a template exists.
