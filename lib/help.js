import {
  LAYERS, LAYER_NAMES, PROFILES, REPO_URL, VERSION, padEnd, println, resolveAddTargets, resolvePreset, style,
} from "./runtime.js";

export function selfCheck() {
  const assertions = [];
  const assert = (condition, message) => {
    assertions.push({ ok: Boolean(condition), message });
    if (!condition) throw new Error(`self-check failed: ${message}`);
  };
  assert(resolvePreset("constitution").name === "full", "legacy init preset maps to full");
  assert(resolveAddTargets(["constitution"]).join(",") === "constitution", "add constitution installs one layer");
  assert(resolvePreset("knowledge-system").layers.join(",") === "constitution,doctrine,knowledge,living-knowledge,meta", "knowledge-system has exact layers");
  assert(new Set(LAYER_NAMES).size === LAYER_NAMES.length, "layer names are unique");
  for (const [name, layers] of Object.entries(PROFILES)) {
    assert(layers.length === new Set(layers).size, `${name} has no duplicate layers`);
    assert(layers.every((layer) => LAYERS[layer]), `${name} references known layers`);
  }
  for (const [name, definition] of Object.entries(LAYERS)) {
    assert(Boolean(definition.packageName), `${name} has a package mapping`);
    assert(Boolean(definition.entry), `${name} has a canonical entry`);
  }
  println(`architectonic self-check passed (${assertions.length} assertions)`);
}

export function welcome() {
  println();
  println(`${style.bold("  architectonic")} ${style.dim(`v${VERSION}`)}`);
  println(style.dim("  Agent-readable operating protocol for human–AI organizations."));
  println(style.yellow("  Experimental · pre-1.0 · evaluate through verify and published evidence."));
  println();
  println(style.bold("  Start"));
  println(`    ${style.cyan("npx architectonic init my-organization")}`);
  println(`    ${style.cyan("npx architectonic verify --dir my-organization")}`);
  println(`    ${style.cyan("npx architectonic map --dir my-organization")}`);
  println();
  println(style.bold("  Commands"));
  const rows = [
    ["init", "create a workspace from a named profile"], ["add", "install one layer or an explicit profile"],
    ["map", "show canonical entries and their purpose"], ["verify", "run semantic protocol conformance"],
    ["doctor", "check installation and package integrity"], ["status", "show source, version, and local changes"],
    ["upgrade", "safely upgrade clean git or npm layers"], ["agent", "create an installed agent from an agents-layer spec"],
  ];
  for (const [command, description] of rows) println(`    ${style.cyan(padEnd(command, 10))}${style.dim(description)}`);
  println();
  println(style.dim(`  Docs  ${REPO_URL}`));
  println();
}

export function helpFull() {
  println(`architectonic ${VERSION}
Agent-readable operating protocol for human–AI organizations.

Status: experimental, pre-1.0.

Usage:
  npx architectonic init [name] [--preset full] [--source git|npm]
  npx architectonic add <layer|profile>... [--source git|npm]
  npx architectonic map [--json]
  npx architectonic verify [--json]
  npx architectonic doctor [--fix] [--json]
  npx architectonic list [--json]
  npx architectonic status [--json]
  npx architectonic diff <layer>
  npx architectonic update [layer...] [--dry-run]
  npx architectonic upgrade [layer...] [--dry-run]
  npx architectonic remove <layer> [--force]
  npx architectonic agent create --spec <file> --output <dir>

Layers:
${LAYER_NAMES.map((layer) => `  ${padEnd(layer, 18)}${LAYERS[layer].purpose}`).join("\n")}

Profiles:
${Object.entries(PROFILES).map(([name, layers]) => `  ${padEnd(name, 18)}${layers.join(" + ")}`).join("\n")}

Compatibility:
  init --preset constitution is accepted as a deprecated alias for --preset full.
  add constitution always installs only the constitution layer.

Environment:
  ARCHITECTONIC_SOURCE_BASE   git clone base URL or local path
  ARCHITECTONIC_NPM_BASE      npm package scope or local package root
  ARCHITECTONIC_ADD_SOURCE    default source mode (git|npm)
  NO_COLOR                    disable color output

Docs: ${REPO_URL}`);
}

export function helpCommand(name) {
  const guides = {
    init: "architectonic init — create a workspace from a profile\n\nUsage:\n  npx architectonic init [name] [--preset full|knowledge-system|agent-system|project-system] [--source git|npm]",
    add: "architectonic add — install layers or explicit profiles\n\nUsage:\n  npx architectonic add <layer|profile>... [--source git|npm]\n\nNote: add constitution installs only the constitution layer.",
    map: "architectonic map — show canonical entries and their purpose\n\nUsage:\n  npx architectonic map [--dir <path>] [--json]",
    verify: "architectonic verify — run semantic protocol conformance\n\nUsage:\n  npx architectonic verify [--dir <path>] [--json]",
    doctor: "architectonic doctor — check installation structure and package state\n\nUsage:\n  npx architectonic doctor [--dir <path>] [--fix] [--json]",
    list: "architectonic list — show installed layers\n\nUsage:\n  npx architectonic list [--dir <path>] [--json]",
    status: "architectonic status — show sources, versions, and local changes\n\nUsage:\n  npx architectonic status [--dir <path>] [--json]",
    diff: "architectonic diff — show local changes for one git layer\n\nUsage:\n  npx architectonic diff <layer> [--dir <path>]",
    update: "architectonic update — fast-forward clean git layers\n\nUsage:\n  npx architectonic update [layer...] [--dir <path>] [--dry-run]",
    upgrade: "architectonic upgrade — upgrade clean git and npm layers without overwriting local modifications\n\nUsage:\n  npx architectonic upgrade [layer...] [--dir <path>] [--dry-run]",
    remove: "architectonic remove — remove one unmodified layer\n\nUsage:\n  npx architectonic remove <layer> [--dir <path>] [--force]",
    agent: "architectonic agent create — instantiate a local agent from an installed agents-layer spec\n\nUsage:\n  npx architectonic agent create --spec <file> --output <dir> [--dir <workspace>]",
  };
  if (!guides[name]) throw new Error(`No help for command: ${name}`);
  println(guides[name]);
}
