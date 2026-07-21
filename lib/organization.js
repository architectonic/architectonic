import fs from "node:fs";
import path from "node:path";
import {
  LAYERS, exists, finishJson, icon, load, parseDirArg, println, rel, style,
} from "./runtime.js";

const COMMON_FRONTMATTER = (type, title) => `---\ntype: ${type}\ntitle: ${title}\nstatus: needs-interview\nsource_status: uninstantiated\n---\n\n`;

const TEMPLATES = {
  constitution: COMMON_FRONTMATTER("Organization Constitution", "Organization Constitution") + `# Organization Constitution

This file is owned by this organization. Do not copy template language into policy without an explicit human decision.

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

Record the organization's purpose and decision rules from sources or explicit authorized answers.

## Purpose

- Unknown until confirmed.

## Evidence and uncertainty

- What counts as sufficient evidence: unknown until confirmed.
- How assumptions and known unknowns are recorded: unknown until confirmed.

## Decision and escalation rules

- Unknown until confirmed.
`,
  identity: COMMON_FRONTMATTER("Actors and Authority", "Actors and Authority") + `# Actors and Authority

Record only collaboration-relevant facts that are explicit, necessary, scoped, and safe to store.

## Humans and organizations

| Actor | Role | Can decide | Can approve | Can stop | Privacy boundary |
| --- | --- | --- | --- | --- | --- |

## Delegated agents

| Agent | Role | Authority | Must escalate | Forbidden |
| --- | --- | --- | --- | --- |

## Unknowns

- No actor or authority claim should be inferred from access, confidence, status, or communication style.
`,
  project: COMMON_FRONTMATTER("Project Index", "Project Index") + `# Project Index

A project is a bounded operating unit, not merely a repository.

| Project | Purpose | Owner | Canonical sources | Status | Open questions |
| --- | --- | --- | --- | --- | --- |

## Project intake rule

Before creating project-native facts, inspect current source artifacts and ask only the questions those sources cannot answer.
`,
  skills: COMMON_FRONTMATTER("Skill Policy", "Skill Policy") + `# Skill Policy

| Skill | Trigger | Source | Risk | Verification | Approved by |
| --- | --- | --- | --- | --- | --- |

Use reviewed procedures when they prevent recurring inconsistency. Inclusion in an external catalog is not approval.
`,
  knowledge: COMMON_FRONTMATTER("Knowledge Index", "Knowledge Index") + `# Knowledge Index

| Knowledge set | Purpose | Canonical sources | Maintainer | Freshness | Known gaps |
| --- | --- | --- | --- | --- | --- |

A source is not a claim. A claim without evidence remains a claim. Unknowns stay explicit.
`,
  models: COMMON_FRONTMATTER("Model Policy", "Model Policy") + `# Model Policy

| Task class | Capability required | Primary | Fallback | Review gate | Cost or latency boundary |
| --- | --- | --- | --- | --- | --- |

Model selection is dated implementation policy, not organizational identity or proof of correctness.
`,
  agents: COMMON_FRONTMATTER("Agent Index", "Agent Index") + `# Agent Index

| Agent | Purpose | Human owner | Skills | Knowledge | Model policy | Authority | Review gates |
| --- | --- | --- | --- | --- | --- | --- | --- |

An installed agent has no runtime authority merely because its files exist. Authority must be delegated explicitly.
`,
  "living-knowledge": COMMON_FRONTMATTER("Living Knowledge Policy", "Living Knowledge Policy") + `# Living Knowledge Policy

| Knowledge set | Why it changes | Review cadence | Publication gate | Destructive-change gate | Stop condition |
| --- | --- | --- | --- | --- | --- |

Automated discovery may propose changes. Publication and destructive changes remain governed.
`,
  meta: COMMON_FRONTMATTER("Organization Maintenance", "Organization Maintenance") + `# Organization Maintenance

## Review cadence

- Unknown until confirmed.

## Known weaknesses and recurring failures

- None recorded yet.

## Revision and retirement rule

- Unknown until confirmed.

Meta work may repair the system, but it does not grant authority to rewrite purpose, permissions, or completed history.
`,
};

const ORGANIZATION_README = `# Organization-owned operating knowledge

This directory contains the local, editable instance of the organization. The sibling layer directories installed by Architectonic contain upstream contracts, schemas, examples, and procedures.

~~~text
organization/*   local facts, decisions, authority, projects, and policy
constitution/*   upstream constitution package
project/*        upstream project package
skills/*         upstream skill package
...
~~~

Do not store organization facts by editing installed package directories. Use the local files here so upstream packages remain safely upgradeable.
`;

const ONBOARDING = `# Document-guided organization bootstrap

Use this when the organization is new, incomplete, or internally inconsistent.

The objective is not to administer a generic questionnaire. **Inspect documents and source artifacts first, identify the material gaps that block responsible action, then ask the human targeted questions tied to those gaps.** Record each confirmed answer in its primary file.

## Operating loop

~~~text
inspect existing documents and sources
-> map claims, authority, assumptions, and unknowns
-> select the highest-value unresolved question
-> ask the human with the relevant document and consequence visible
-> record the explicit answer, source, date, scope, and authority
-> preserve remaining unknowns
-> verify the updated organization map
-> stop when enough is known for the current work
~~~

## Interview discipline

1. Do not ask for information already recoverable from current sources.
2. Do not invent answers to make templates look complete.
3. Tie each question to a file, decision, risk, or action it will change.
4. Distinguish an explicit human decision from an empirical claim.
5. Ask who may decide, approve, delegate, override, and stop whenever authority matters.
6. Keep private biography and temporary communication context out of durable actor records.
7. Prefer a small, usable organization over a complete-looking bureaucracy.
8. Stop interviewing when the current task is sufficiently grounded; preserve the rest in organization/open-questions.md.

## Minimum viable first pass

- **Constitution:** What must remain true? Who is the human authority root? What may agents never do without approval? How can the rules change?
- **Doctrine:** What is the organization trying to make true? What evidence is required? How are risk, uncertainty, disagreement, and escalation handled?
- **Actors:** Who participates? What is each actor responsible for? What may each decide, approve, delegate, access, spend, mutate, or stop?
- **Projects:** What concrete work exists now? Which sources are authoritative? What does success mean? Which questions are still open?
- **Agents:** Which software actors are needed? What skills, knowledge, model policy, permissions, evaluations, and upkeep does each require?
- **Knowledge:** Which corpora exist? Which sources support them? Which claims are uncertain, stale, contradicted, or missing?
- **Skills:** Which recurring procedures need explicit inputs, verification, and failure handling?
- **Meta:** How will failures, drift, stale knowledge, obsolete procedures, and amendments be reviewed?

Run architectonic onboard to see the local document map and architectonic verify to check structural conformance.
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

function writeIfMissing(root, relative, content, created) {
  const target = path.join(root, relative);
  if (exists(target)) return;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content.endsWith("\n") ? content : `${content}\n`, "utf8");
  created.push(relative.replace(/\\/g, "/"));
}

export function ensureOrganizationScaffold(root, layers) {
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
  const created = parsed.fix ? ensureOrganizationScaffold(parsed.dir, layers) : [];
  const rows = layers.map((layer) => {
    const localEntry = LAYERS[layer]?.localEntry || null;
    const absolute = localEntry ? path.join(parsed.dir, localEntry) : null;
    return {
      layer,
      local_entry: localEntry ? rel(parsed.dir, absolute) : null,
      status: absolute ? documentStatus(absolute) : "undefined",
    };
  });
  const missing = rows.filter((row) => row.status === "missing" || row.status === "undefined");
  const ok = missing.length === 0 && exists(path.join(parsed.dir, "ONBOARDING.md"));
  if (parsed.json) return finishJson({ command: "onboard", root: parsed.dir, ok, created, guide: "./ONBOARDING.md", rows }, ok);

  println(`${style.bold("architectonic onboard")} ${style.dim(`root: ${parsed.dir}`)}`);
  println();
  println(`  ${style.bold("Guide")}  ./ONBOARDING.md`);
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
    println(`${icon("fail")} Local organization scaffold is incomplete. Run architectonic onboard --fix.`);
    process.exitCode = 1;
  }
}

function layerLabel(layer) {
  return `${layer}${" ".repeat(Math.max(1, 18 - layer.length))}`;
}
