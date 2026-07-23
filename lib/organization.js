import fs from "node:fs";
import path from "node:path";
import {
  LAYERS, exists, finishJson, icon, load, parseDirArg, println, profileFeatures, rel, resolveManagedPath, style, unique,
  writeManifest,
} from "./runtime.js";

const COMMON_FRONTMATTER = (type, title) => `---\ntype: ${type}\ntitle: ${title}\nstatus: needs-interview\nsource_status: uninstantiated\n---\n\n`;

const TEMPLATES = {
  constitution: COMMON_FRONTMATTER("Organization Constitution", "Organization Constitution") + `# Organization Constitution

This file is owned by this organization. Do not convert example language into policy without an explicit authorized decision.

## Purpose and invariants

- Unknown until confirmed.

## Human authority root

- Who can approve, override, pause, or stop agent work: unknown until confirmed.

## Prohibited actions

- Unknown until confirmed.

## Amendment rule

- Unknown until confirmed.
`,
  doctrine: COMMON_FRONTMATTER("Organization Doctrine", "Organization Doctrine") + `# Organization Doctrine

Record purpose and decision rules from recoverable sources or explicit authorized answers.

## Purpose

- Unknown until confirmed.

## Evidence and uncertainty

- What counts as sufficient evidence: unknown until confirmed.
- Assumptions, contradictions, and known unknowns remain explicit.

## Decision, escalation, and stopping rules

- Unknown until confirmed.

## Adaptive structure rule

- Use the smallest layer or profile that changes future action. Add structure only when a demonstrated ambiguity, recurring failure, or maintenance burden justifies it.
`,
  identity: COMMON_FRONTMATTER("Actors and Authority", "Actors and Authority") + `# Actors and Authority

Record only collaboration-relevant facts that are explicit, necessary, scoped, and safe to store.

## Humans and organizations

| Actor | Role | Can decide | Can approve | Can delegate | Can stop | Privacy boundary |
| --- | --- | --- | --- | --- | --- | --- |

## Delegated agents

| Agent | Role | Authority | Must escalate | Forbidden | Human owner |
| --- | --- | --- | --- | --- | --- |

## Unknowns

- No actor, preference, or authority claim should be inferred from access, confidence, status, or communication style.
`,
  project: COMMON_FRONTMATTER("Project Index", "Project Index") + `# Project Index

A project is a standalone bounded operating unit. It does not require a constitution, identity system, or full organization unless those boundaries are materially relevant.

| Project | Purpose | Owner | Canonical sources | Status | Decisions | Open questions |
| --- | --- | --- | --- | --- | --- | --- |

## Project intake rule

Inspect current source artifacts before asking the human. Record project-native facts only from sources, explicit decisions, labeled assumptions, and preserved unknowns.
`,
  skills: COMMON_FRONTMATTER("Skill Policy", "Skill Policy") + `# Skill Policy

| Skill | Trigger | Source and version | License | Risk | Verification | Approved by |
| --- | --- | --- | --- | --- | --- | --- |

## Trust rule

Public availability, popularity, normalization, or inclusion in a catalog is not approval. Vendor a skill only after reviewing provenance, license, hidden tool use, mutation scope, prompt-injection exposure, verification, and fit with local authority.

## Procedure rule

Use a skill when it prevents recurring inconsistency. Keep one-off instructions in the task or project instead of turning every prompt into permanent procedure.
`,
  knowledge: COMMON_FRONTMATTER("Knowledge Index", "Knowledge Index") + `# Knowledge Index

| Knowledge set | Purpose | Canonical sources | Mode | Maintainer | Freshness | Known gaps |
| --- | --- | --- | --- | --- | --- | --- |

## Mode decision

- **Knowledge:** use for a curated corpus whose truth changes when evidence or an authorized human changes it.
- **Living knowledge:** add governed maintenance when correctness decays on an external clock or source feed.

A source is not a claim. A claim without evidence remains a claim. Sessions, retrieval scores, generated summaries, graphs, and outputs are not evidence by themselves.
`,
  models: COMMON_FRONTMATTER("Model and Retrieval Policy", "Model and Retrieval Policy") + `# Model and Retrieval Policy

| Task class | Capability required | Primary | Fallback | Retrieval policy | Review gate | Cost or latency boundary |
| --- | --- | --- | --- | --- | --- | --- | --- |

Model and retrieval selection are dated implementation policies. Vector indexes, graph indexes, rerankers, and provider rankings remain replaceable derived systems whose quality should be evaluated on representative tasks.
`,
  agents: COMMON_FRONTMATTER("Agent Index", "Agent Index") + `# Agent Index

| Agent | Purpose | Human owner | Skills | Knowledge | Model policy | Authority | Review gates | Upkeep |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

An installed agent has no runtime authority merely because its files exist. Authority, tools, credentials, spending, publishing, production mutation, and child-agent spawning must be delegated explicitly.
`,
  rail: COMMON_FRONTMATTER("Work Rail", "Work Rail") + `# Work Rail

The canonical current-work authority is \`operations/ledger.json\`. Backlog, ready queue, and now are views over that ledger, not additional authored files.

| Ledger path | Human owner | Review rule | Approval gates |
| --- | --- | --- | --- |
| \`operations/ledger.json\` | Unknown until confirmed | Unknown until confirmed | Unknown until confirmed |

Agents read the ledger when entering a rail-bound project and update it only when coordination survives the current session. Source artifacts and verification evidence remain implementation truth.
`,
  "living-knowledge": COMMON_FRONTMATTER("Living Knowledge Policy", "Living Knowledge Policy") + `# Living Knowledge Policy

Living knowledge is a maintenance process applied to a knowledge set. It is not a second copy of the corpus.

| Knowledge set | External change driver | Review cadence | Candidate sources | Publication gate | Retirement gate | Stop condition |
| --- | --- | --- | --- | --- | --- | --- | --- |

Use this layer when stale knowledge creates material error and recurring review is justified. Automated discovery may propose changes; publication and destructive changes remain governed.
`,
  meta: COMMON_FRONTMATTER("Organization Maintenance", "Organization Maintenance") + `# Organization Maintenance

## Review cadence

- Unknown until confirmed.

## Known weaknesses and recurring failures

- None recorded yet.

## Evaluation and evidence

- Record whether navigation, retrieval, handoff, loop performance, and error rates actually improve.

## Revision and retirement rule

- Unknown until confirmed.

Meta work may repair the system, but it does not grant authority to rewrite purpose, permissions, or completed history.
`,
};

const ORGANIZATION_README = `# Organization-owned operating knowledge

This directory contains the local, editable instance. Sibling layer directories installed by Architectonic contain upstream contracts, schemas, examples, and procedures.

~~~text
organization/*   local facts, decisions, authority, projects, corpora, and policies
constitution/*   upstream constitution package
project/*        upstream project package
rail/*           upstream work-rail contract and ledger schema
skills/*         upstream skill package
...
~~~

Do not store local truth by editing installed package directories. Retrieval databases, graph projections, Obsidian views, generated indexes, and execution runtimes are optional adapters over these files—not replacements for them.
`;

const ONBOARDING = `# Document-guided adaptive bootstrap

Use this when a human–AI organization, standalone project, actor model, knowledge system, or agent team is new, incomplete, stale, or internally inconsistent.

The objective is not to administer a generic questionnaire. **Inspect documents and source artifacts first, identify material gaps that block responsible action, then ask targeted questions tied to those gaps.** Record confirmed answers in their primary organization-owned files.

## Operating loop

~~~text
inspect existing documents and sources
-> map facts, claims, authority, assumptions, contradictions, and unknowns
-> select the highest-value unresolved question
-> ask the human with the relevant document and consequence visible
-> record the explicit answer, source, date, scope, and authority
-> preserve remaining unknowns
-> verify the updated organization map
-> stop when enough is known for the current work
~~~

## Adaptive composition

1. Run \`architectonic recommend --need "..."\` before installing the full system.
2. A project, constitution, identity model, knowledge corpus, or skill library may stand alone.
3. Use ordinary knowledge when curation is deliberate and human-driven.
4. Add living knowledge when correctness decays as external sources change and recurring review is justified.
5. Add loops only when work must continue across runs; bind every loop to one rail ledger with a verifier, evidence, stop condition, and human gate.
6. Treat graphs as rebuildable projections. Standard Markdown remains canonical and can be viewed in Obsidian or enriched by graph tools.

## Interview discipline

1. Do not ask for information already recoverable from current sources.
2. Do not invent answers to make templates look complete.
3. Tie each question to a file, decision, risk, authority boundary, or action it will change.
4. Distinguish an explicit human decision from an empirical claim.
5. Ask who may decide, approve, delegate, override, and stop whenever authority matters.
6. Keep private biography and temporary communication context out of durable actor records.
7. Prefer a small usable system over complete-looking bureaucracy.
8. Stop interviewing when the current task is sufficiently grounded; preserve the rest in \`organization/open-questions.md\`.
`;

const OPEN_QUESTIONS = `# Open Questions

Record material unknowns that should not be filled by inference.

| Question | Why it matters | Relevant file or source | Owner | Needed by | Status |
| --- | --- | --- | --- | --- | --- |
`;

const DECISIONS = `# Decisions

Record decisions that change future action.

| Date | Decision | Authority | Evidence or reason | Scope | Alternatives | Revisit when |
| --- | --- | --- | --- | --- | --- | --- |
`;

const FEATURE_FILES = {
  graph: {
    "organization/graph-policy.md": `# Graph Projection Policy

Canonical Markdown and recoverable sources remain authoritative. Graphs are derived navigation and analysis surfaces.

- Deterministic links are tagged as extracted.
- Inferred relationships require provenance, confidence, and review status.
- Broken links, ambiguous targets, orphans, and high-degree gravity wells are reported rather than hidden.
- Graph outputs live under \`.architectonic/derived/\` and may be rebuilt or deleted.
- Obsidian may visualize the Markdown directly. Graphify, GraphRAG, or another graph engine may enrich a projection without becoming the source of truth.
`,
  },
  wiki: {
    "organization/knowledge/schema.md": `# Knowledge Schema and Topic Guide

Define local vocabulary, concept types, relationships, source boundaries, naming rules, and adoption notes. Keep the guide human-owned; generated content must conform rather than silently redefining it.
`,
    "organization/knowledge/log.md": `# Knowledge Log

| Date | Change | Source | Reviewer | Result |
| --- | --- | --- | --- | --- |
`,
    "organization/knowledge/sources/README.md": `# Sources

Store immutable or recoverable source records here, or record external source manifests when copying is inappropriate. Source material is not edited into synthesis.
`,
    "organization/knowledge/wiki/index.md": `# Compiled Wiki

Articles synthesize sources into inspectable claims, cross-references, uncertainty, and contradictions. Compile once; query many times. Every article routes back to recoverable sources.
`,
    "organization/knowledge/inventory/index.md": `# Inventory

Track operational state—source candidates, entities, corpora, watch items, open questions, and next actions—without treating inventory rows as evidence.
`,
    "organization/knowledge/datasets/index.md": `# Dataset Manifests

Large, mutable, or operational datasets stay external. Record location, schema, samples, freshness, access rules, and query recipes instead of copying the full dataset into Markdown.
`,
    "organization/knowledge/outputs/index.md": `# Derived Outputs

Reports, plans, presentations, timelines, and other outputs are renderers over the corpus. Preserve their source trail; do not make the output the canonical knowledge layer.
`,
    "organization/knowledge/sessions/README.md": `# Session Memory

Session digests, checkpoints, and feedback candidates are operational memory. Promote only durable, relevant, authorized material into the corpus; do not treat transcripts as topic evidence by default.
`,
    "organization/knowledge/.archive/README.md": `# Quiet Archive

Archived topics remain preserved but are excluded from normal query, graph, compilation, and maintenance paths unless explicitly requested.
`,
  },
  "second-brain": {
    "organization/brain/README.md": `# Personal Second Brain

This is a personal, outcome-oriented knowledge view. It is not an institutional source of truth unless explicitly promoted into governed project or knowledge files.

~~~text
capture -> organize -> distill -> express
~~~

Organize material around active projects, ongoing areas, reusable resources, and a quiet archive. The system may remain partial and evolve incrementally.
`,
    "organization/brain/capture.md": `# Capture Queue

Capture only material likely to support a project, responsibility, decision, learning path, or creative output. Process or delete it; do not let capture become permanent clutter.
`,
    "organization/brain/projects.md": `# Active Projects

| Project | Outcome | Next action | Relevant knowledge | Status |
| --- | --- | --- | --- | --- |
`,
    "organization/brain/areas.md": `# Areas of Responsibility

| Area | Standard to maintain | Review cadence | Current concern |
| --- | --- | --- | --- |
`,
    "organization/brain/resources.md": `# Resources

| Resource | Why it remains useful | Related project or area | Source |
| --- | --- | --- | --- |
`,
    "organization/brain/archive.md": `# Personal Archive

Completed or inactive material remains searchable but quiet by default.
`,
    "organization/brain/expressions.md": `# Expressions and Outputs

| Output | Audience | Sources | Status | Reuse path |
| --- | --- | --- | --- | --- |
`,
  },
  loops: {
    "organization/loops/index.md": `# Agent Loops

| Loop | Goal | Trigger | State | Worker | Verifier | Human gate | Budget | Stop condition |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

A loop is justified only when repeated execution creates more verified value than its cost and review burden.
`,
    "organization/loops/state.md": `# Loop State

Durable state lives outside the model. Each run reads current state, claims bounded work, records evidence, reconciles outcomes, and leaves a verifiable handoff.
`,
    "organization/loops/budgets.md": `# Loop Budgets and Limits

| Loop | Token or cost budget | Spawn limit | Time limit | Mutation boundary | Escalation threshold |
| --- | --- | --- | --- | --- | --- |
`,
    "organization/loops/runs/README.md": `# Loop Run Evidence

Store compact run records: objective, inputs, actions, outputs, verification, cost, failures, decisions, and next state. Routine hidden reasoning is not a durable artifact.
`,
  },
};

function writeIfMissing(root, relative, content, created) {
  const target = path.join(root, relative);
  if (exists(target)) return;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content.endsWith("\n") ? content : `${content}\n`, "utf8");
  created.push(relative.replace(/\\/g, "/"));
}

export function inferOrganizationFeatures(layers, profiles = []) {
  const features = new Set(profileFeatures(profiles));
  const installed = new Set(layers);
  if (installed.has("knowledge")) features.add("graph");
  if (["project", "skills", "agents", "meta"].every((layer) => installed.has(layer))) features.add("loops");
  return [...features];
}

export function organizationRequiredFiles(layers, profiles = []) {
  const required = ["organization/README.md", "organization/open-questions.md", "organization/decisions.md", "ONBOARDING.md"];
  for (const layer of layers) {
    const entry = LAYERS[layer]?.localEntry;
    if (entry) required.push(entry);
  }
  if (layers.includes("rail")) required.push(LAYERS.rail.ledgerPath);
  for (const feature of inferOrganizationFeatures(layers, profiles)) required.push(...Object.keys(FEATURE_FILES[feature] || {}));
  return unique(required);
}

export function ensureOrganizationScaffold(root, layers, profiles = []) {
  const created = [];
  writeIfMissing(root, "organization/README.md", ORGANIZATION_README, created);
  writeIfMissing(root, "organization/open-questions.md", OPEN_QUESTIONS, created);
  writeIfMissing(root, "organization/decisions.md", DECISIONS, created);
  writeIfMissing(root, "ONBOARDING.md", ONBOARDING, created);
  for (const layer of layers) {
    const entry = LAYERS[layer]?.localEntry;
    const template = TEMPLATES[layer];
    if (entry && template) writeIfMissing(root, entry, template, created);
  }
  if (layers.includes("rail")) {
    const manifest = load(root);
    const railDir = resolveManagedPath(root, manifest.layers.rail.path);
    const template = JSON.parse(fs.readFileSync(path.join(railDir, LAYERS.rail.ledgerTemplate), "utf8"));
    template.project = path.basename(path.resolve(root)).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "") || "project";
    template.updated = new Date().toISOString().slice(0, 10);
    writeIfMissing(root, LAYERS.rail.ledgerPath, `${JSON.stringify(template, null, 2)}\n`, created);
  }
  for (const feature of inferOrganizationFeatures(layers, profiles)) {
    for (const [relative, content] of Object.entries(FEATURE_FILES[feature] || {})) writeIfMissing(root, relative, content, created);
  }
  return created;
}

function documentStatus(target) {
  if (!exists(target)) return "missing";
  const content = fs.readFileSync(target, "utf8");
  return content.match(/^status:\s*([^\r\n]+)$/m)?.[1]?.trim() || "unclassified";
}

export function onboard(tokens) {
  const parsed = parseDirArg(tokens);
  const manifest = load(parsed.dir);
  const layers = Object.keys(manifest.layers || {});
  const profiles = manifest.profiles || [];
  if (parsed.fix && layers.includes("rail") && !manifest.rail) {
    manifest.rail = { ledger_path: `./${LAYERS.rail.ledgerPath}` };
    writeManifest(parsed.dir, manifest);
  }
  const created = parsed.fix ? ensureOrganizationScaffold(parsed.dir, layers, profiles) : [];
  const rows = layers.map((layer) => {
    const localEntry = LAYERS[layer]?.localEntry || null;
    const absolute = localEntry ? path.join(parsed.dir, localEntry) : null;
    return {
      layer,
      local_entry: localEntry ? rel(parsed.dir, absolute) : null,
      status: absolute ? documentStatus(absolute) : "undefined",
    };
  });
  const required = organizationRequiredFiles(layers, profiles);
  const missingFiles = required.filter((relative) => !exists(path.join(parsed.dir, relative)));
  const ok = missingFiles.length === 0;
  const features = inferOrganizationFeatures(layers, profiles);
  if (parsed.json) return finishJson({ command: "onboard", root: parsed.dir, ok, profiles, features, created, guide: "./ONBOARDING.md", rows, missing_files: missingFiles }, ok);

  println(`${style.bold("architectonic onboard")} ${style.dim(`root: ${parsed.dir}`)}`);
  println();
  println(`  ${style.bold("Guide")}     ./ONBOARDING.md`);
  println(`  ${style.bold("Profiles")}  ${profiles.length ? profiles.join(", ") : "custom or layer-by-layer"}`);
  if (features.length) println(`  ${style.bold("Features")}  ${features.join(", ")}`);
  println(style.dim("  Inspect sources first; ask the human only where material gaps remain."));
  println();
  for (const row of rows) {
    const marker = row.status === "missing" || row.status === "undefined" ? icon("fail") : row.status === "needs-interview" ? icon("warn") : icon("ok");
    println(`  ${marker} ${layerLabel(row.layer)} ${row.local_entry || "no local entry"} (${row.status})`);
  }
  if (created.length) {
    println();
    println(`${icon("ok")} Created ${created.length} missing organization files.`);
  }
  if (!ok) {
    println();
    for (const file of missingFiles) println(`${icon("fail")} Missing ${file}`);
    println(`${icon("fail")} Local scaffold is incomplete. Run architectonic onboard --fix.`);
    process.exitCode = 1;
  }
}

function layerLabel(layer) { return `${layer}${" ".repeat(Math.max(1, 18 - layer.length))}`; }
