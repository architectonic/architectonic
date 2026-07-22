import {
  LAYERS, LAYER_NAMES, NEED_RULES, PROFILE_METADATA, PROFILES, REPO_URL, VERSION, padEnd, println,
  profileFeatures, resolveAddPlan, resolvePreset, style,
} from "./runtime.js";

export function selfCheck() {
  const assertions = [];
  const assert = (condition, message) => {
    assertions.push({ ok: Boolean(condition), message });
    if (!condition) throw new Error(`self-check failed: ${message}`);
  };
  assert(resolvePreset("constitution").layers.join(",") === "constitution", "constitution is standalone");
  assert(resolvePreset("identity").layers.join(",") === "identity", "identity is standalone");
  assert(resolvePreset("project").layers.join(",") === "project", "project is standalone");
  assert(resolvePreset("rail").layers.join(",") === "rail", "rail is standalone");
  assert(resolvePreset("knowledge").layers.join(",") === "knowledge", "knowledge is standalone");
  assert(resolvePreset("organization").layers.join(",") === "constitution,doctrine,identity,meta", "organization has exact governance layers");
  assert(resolvePreset("project-system").layers.join(",") === "project,rail,knowledge,skills,meta", "project-system is independent from organization layers");
  assert(resolvePreset("knowledge-system").layers.join(",") === "knowledge,skills,meta", "ordinary knowledge excludes living maintenance");
  assert(resolvePreset("living-knowledge-system").layers.includes("living-knowledge"), "living knowledge is explicit");
  assert(resolvePreset("project+knowledge").layers.join(",") === "project,knowledge", "custom compositions resolve exactly");
  assert(resolveAddPlan(["graph-system"]).features.includes("graph"), "profile features survive add planning");
  assert(new Set(LAYER_NAMES).size === LAYER_NAMES.length, "layer names are unique");
  assert(NEED_RULES.length > 0, "adaptive need rules exist");
  for (const [name, layers] of Object.entries(PROFILES)) {
    assert(layers.length === new Set(layers).size, `${name} has no duplicate layers`);
    assert(layers.every((layer) => LAYERS[layer]), `${name} references known layers`);
    assert(Boolean(PROFILE_METADATA[name]?.summary), `${name} has a summary`);
    assert(Array.isArray(profileFeatures([name])), `${name} features resolve`);
  }
  for (const [name, definition] of Object.entries(LAYERS)) {
    assert(Boolean(definition.packageName), `${name} has a package mapping`);
    assert(Boolean(definition.entry), `${name} has a canonical entry`);
    assert(Boolean(definition.localEntry), `${name} has a local organization entry`);
    assert(typeof definition.standalone === "boolean", `${name} declares standalone status`);
  }
  println(`architectonic self-check passed (${assertions.length} assertions)`);
}

export function welcome() {
  println();
  println(`${style.bold("  architectonic")} ${style.dim(`v${VERSION}`)}`);
  println(style.dim("  Adaptive, agent-readable operating protocol for human–AI collaboration."));
  println(style.yellow("  Experimental · pre-1.0 · start with the smallest justified structure."));
  println();
  println(style.bold("  Choose"));
  println(`    ${style.cyan('npx architectonic recommend --need "standalone project"')}`);
  println(`    ${style.cyan('npx architectonic recommend --need "agent work queue"')}`);
  println(`    ${style.cyan('npx architectonic recommend --need "changing regulatory corpus"')}`);
  println();
  println(style.bold("  Start"));
  println(`    ${style.cyan("npx architectonic init my-workspace --preset project")}`);
  println(`    ${style.cyan("npx architectonic onboard --dir my-workspace")}`);
  println(`    ${style.cyan("npx architectonic verify --dir my-workspace")}`);
  println();
  println(style.bold("  Commands"));
  const rows = [
    ["recommend", "select the smallest useful profile from a stated need"],
    ["init", "create a standalone layer, adaptive profile, or custom composition"],
    ["add", "add one layer or explicit profile without replacing local knowledge"],
    ["onboard", "route document-guided interviews into local files"],
    ["map", "show local entries and upstream contracts"],
    ["graph", "build a replaceable graph projection from explicit Markdown links"],
    ["verify", "run semantic protocol conformance"],
    ["doctor", "check installation and package integrity"],
    ["upgrade", "safely upgrade clean upstream layers"],
    ["agent", "create an installed agent from an agents-layer spec"],
  ];
  for (const [command, description] of rows) println(`    ${style.cyan(padEnd(command, 12))}${style.dim(description)}`);
  println();
  println(style.dim(`  Docs  ${REPO_URL}`));
  println();
}

export function helpFull() {
  println(`architectonic ${VERSION}
Adaptive, agent-readable operating protocol for human–AI collaboration.

Status: experimental, pre-1.0.
Principle: use no structure for disposable work, one standalone layer for one durable concern, and compound profiles only when the work proves it needs them.

Usage:
  npx architectonic recommend --need <description> [--json]
  npx architectonic init [name] [--preset <layer|profile|a+b>] [--source git|npm]
  npx architectonic add <layer|profile>... [--source git|npm]
  npx architectonic onboard [--fix] [--json]
  npx architectonic map [--json]
  npx architectonic graph [--format json|dot|both] [--include-contracts] [--json]
  npx architectonic verify [--json]
  npx architectonic doctor [--fix] [--json]
  npx architectonic list [--json]
  npx architectonic status [--json]
  npx architectonic diff <layer>
  npx architectonic update [layer...] [--dry-run]
  npx architectonic upgrade [layer...] [--dry-run]
  npx architectonic remove <layer> [--force]
  npx architectonic agent create --spec <file> --output <dir>

Standalone layers:
${LAYER_NAMES.map((layer) => `  ${padEnd(layer, 20)}${LAYERS[layer].purpose}${LAYERS[layer].standalone ? "" : " (requires companion)"}`).join("\n")}

Adaptive profiles:
${Object.entries(PROFILES).map(([name, layers]) => `  ${padEnd(name, 24)}${PROFILE_METADATA[name]?.summary || layers.join(" + ")}`).join("\n")}

Custom composition:
  --preset project+knowledge+skills+meta

Boundaries:
  Knowledge is the governed corpus. Living knowledge is recurring maintenance used only when correctness decays as external sources change.
  Graphs are derived projections. Obsidian, Graphify, GraphRAG, or another renderer may consume the files without becoming canonical.
  Rails hold one canonical work ledger. Backlog, queue, and now are views, not competing sources of state.
  Loops consume rail items and require verification, a budget, a stop condition, and human-controlled authority.
  Workframe is an optional execution environment; Architectonic remains file-native and runtime-neutral.

Environment:
  ARCHITECTONIC_SOURCE_BASE   git clone base URL or local path
  ARCHITECTONIC_NPM_BASE      npm package scope or local package root
  ARCHITECTONIC_ADD_SOURCE    default source mode (git|npm)
  NO_COLOR                    disable color output

Docs: ${REPO_URL}`);
}

export function helpCommand(name) {
  const guides = {
    recommend: "architectonic recommend — choose the smallest useful profile from a stated need\n\nUsage:\n  npx architectonic recommend --need \"changing regulatory corpus\" [--json]\n\nThe result is advisory and deterministic. A disposable task may correctly return no install.",
    init: "architectonic init — create a standalone layer, named profile, or custom composition\n\nUsage:\n  npx architectonic init [name] [--preset project|organization|llm-wiki|a+b] [--source git|npm]\n\nExamples:\n  npx architectonic init work --preset project\n  npx architectonic init brain --preset second-brain\n  npx architectonic init research --preset knowledge+skills+meta",
    add: "architectonic add — install layers or explicit profiles\n\nUsage:\n  npx architectonic add <layer|profile>... [--source git|npm]\n\nAdding constitution, identity, project, or knowledge installs only that standalone concern.",
    onboard: "architectonic onboard — inspect or repair organization-owned files\n\nUsage:\n  npx architectonic onboard [--dir <path>] [--fix] [--json]\n\nInspect sources first, ask targeted questions only where material gaps remain, and record explicit answers under organization/.",
    map: "architectonic map — show local operating entries and upstream contracts\n\nUsage:\n  npx architectonic map [--dir <path>] [--json]",
    graph: "architectonic graph — derive a graph from explicit Markdown and wikilinks\n\nUsage:\n  npx architectonic graph [--dir <path>] [--format json|dot|both] [--include-contracts] [--output <dir>] [--json]\n\nThe graph is replaceable and never becomes canonical by generation alone.",
    verify: "architectonic verify — run semantic protocol and local-scaffold conformance\n\nUsage:\n  npx architectonic verify [--dir <path>] [--json]",
    doctor: "architectonic doctor — check installation structure and package state\n\nUsage:\n  npx architectonic doctor [--dir <path>] [--fix] [--json]",
    list: "architectonic list — show installed layers, profiles, and features\n\nUsage:\n  npx architectonic list [--dir <path>] [--json]",
    status: "architectonic status — show sources, versions, and local changes\n\nUsage:\n  npx architectonic status [--dir <path>] [--json]",
    diff: "architectonic diff — show local changes for one git layer\n\nUsage:\n  npx architectonic diff <layer> [--dir <path>]",
    update: "architectonic update — fast-forward clean git layers\n\nUsage:\n  npx architectonic update [layer...] [--dir <path>] [--dry-run]",
    upgrade: "architectonic upgrade — upgrade clean git and npm layers without overwriting local modifications\n\nUsage:\n  npx architectonic upgrade [layer...] [--dir <path>] [--dry-run]",
    remove: "architectonic remove — remove one unmodified layer and invalidate profiles that depended on it\n\nUsage:\n  npx architectonic remove <layer> [--dir <path>] [--force]",
    agent: "architectonic agent create — instantiate a local agent from an installed agents-layer spec\n\nUsage:\n  npx architectonic agent create --spec <file> --output <dir> [--dir <workspace>]",
  };
  if (!guides[name]) throw new Error(`No help for command: ${name}`);
  println(guides[name]);
}
