#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));
const VERSION = PKG.version;
const REPO_URL = PKG.repository?.url?.replace(/^git\+/, "").replace(/\.git$/, "") || "https://github.com/architectonic/architectonic";

const argv = process.argv.slice(2);
const layers = [
  "constitution",
  "doctrine",
  "identity",
  "project",
  "skills",
  "knowledge",
  "models",
  "agents",
  "living-knowledge",
  "meta",
];
const core = [...layers];
const commands = ["init", "add", "list", "doctor", "status", "diff", "update", "remove"];
const bundleAliases = { agent: "agent-system" };
const bundles = {
  constitution: core,
  solo: core,
  default: core,
  "knowledge-system": ["constitution", "doctrine", "knowledge", "living-knowledge", "meta"],
  "agent-system": ["doctrine", "identity", "project", "skills", "knowledge", "models", "agents", "meta"],
  "project-system": ["doctrine", "identity", "project", "skills", "knowledge", "models", "agents", "meta"],
};
const packageMap = {
  constitution: "architectonic-constitution",
  doctrine: "architectonic-doctrine",
  identity: "architectonic-identity",
  project: "architectonic-project",
  skills: "architectonic-skills",
  knowledge: "architectonic-knowledge",
  models: "architectonic-models",
  agents: "architectonic-agents",
  "living-knowledge": "architectonic-living-knowledge",
  meta: "architectonic-meta",
};
const layerBlurbs = {
  constitution: "root scaffold and composition contract",
  doctrine: "purpose, ethics, ontology, epistemology, governance, and incentives",
  identity: "actors, roles, authority, delegation, incentives, and privacy",
  project: "operating-unit context, sources, decisions, risks, and artifacts",
  skills: "reusable procedures and verification",
  knowledge: "claims, sources, evidence, uncertainty, and known unknowns",
  models: "model metadata, evaluations, capability requirements, and routing policy",
  agents: "software-actor composition, permissions, prompts, evaluations, and attachments",
  "living-knowledge": "review cycles for maintaining a knowledge corpus",
  meta: "audit, upkeep, drift review, and revision policy",
};

const repoBase = process.env.ARCHITECTONIC_SOURCE_BASE || "https://github.com/architectonic";
const npmBase = process.env.ARCHITECTONIC_NPM_BASE || "";

const noColor = "NO_COLOR" in process.env && process.env.NO_COLOR !== "0";
const useColor = Boolean(!noColor && process.stdout.isTTY && process.env.TERM !== "dumb" && !process.env.CI)
  || Boolean(process.env.FORCE_COLOR && process.env.FORCE_COLOR !== "0");
const esc = (n, value) => (useColor ? `\x1b[${n}m${value}\x1b[0m` : value);
const style = {
  bold: (value) => esc("1", value),
  dim: (value) => esc("2", value),
  cyan: (value) => esc("36", value),
  green: (value) => esc("32", value),
  yellow: (value) => esc("33", value),
  red: (value) => esc("31", value),
  blue: (value) => esc("34", value),
};

function icon(kind) {
  if (!useColor) return `[${kind}]`;
  const map = {
    ok: style.green("✓"),
    fail: style.red("✗"),
    warn: style.yellow("!"),
    info: style.blue("·"),
    skip: style.dim("–"),
    plan: style.cyan("→"),
  };
  return map[kind] || style.dim("·");
}

function println(value = "") { console.log(value); }
function printErr(value) { console.error(value); }
function emitJson(value) { console.log(JSON.stringify(value, null, 2)); }
function padEnd(value, length) { return value.length >= length ? value : value + " ".repeat(length - value.length); }
function exists(target) { return fs.existsSync(target); }
function readJson(target) { return JSON.parse(fs.readFileSync(target, "utf8")); }
function manifestPath(dir) { return path.join(dir, "architectonic.json"); }
function layerPath(dir, layer) { return path.join(dir, layer); }
function rel(root, target) { return `./${path.relative(root, target).replace(/\\/g, "/")}`; }
function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: "utf8",
    stdio: "pipe",
    shell: process.platform === "win32",
    ...options,
  });
}
function git(cwd, args) { return run("git", args, { cwd, shell: false }); }
function gitHead(dir) {
  const result = git(dir, ["rev-parse", "HEAD"]);
  return result.status === 0 ? (result.stdout || "").trim() : null;
}
function branch(dir) {
  const result = git(dir, ["rev-parse", "--abbrev-ref", "HEAD"]);
  return result.status === 0 ? (result.stdout || "").trim() : null;
}
function dirty(dir) {
  const result = git(dir, ["status", "--short"]);
  return result.status === 0 ? (result.stdout || "").trim() : null;
}
function pkgName(dir) {
  try { return readJson(path.join(dir, "package.json")).name || null; } catch { return null; }
}
function pkgVersion(dir) {
  try { return readJson(path.join(dir, "package.json")).version || null; } catch { return null; }
}
function shortSha(sha) { return sha ? sha.slice(0, 12) : null; }

function ensure(command, message) {
  if (run(command, ["--version"]).status !== 0) throw new Error(message);
}
function ensureSource(source) {
  if (source === "git") {
    ensure("git", "git is required on PATH for --source git.");
    return;
  }
  if (source === "npm") {
    ensure("npm", "npm is required on PATH for --source npm.");
    ensure("tar", "tar is required on PATH for --source npm.");
    return;
  }
  throw new Error(`Unsupported source: ${source}. Use git or npm.`);
}
function repoUrl(layer) {
  const base = repoBase.replace(/\\/g, "/");
  return /^(?:[A-Za-z]:\/|\/|\.{1,2}\/)/.test(base)
    ? path.resolve(base, layer)
    : `${base}/${layer}.git`;
}
function packageSpec(layer) {
  const pkg = packageMap[layer];
  if (!pkg) throw new Error(`No npm package mapping for ${layer}`);
  if (!npmBase) return pkg;
  const base = npmBase.replace(/\\/g, "/");
  return /^(?:[A-Za-z]:\/|\/|\.{1,2}\/)/.test(base)
    ? path.resolve(base, layer)
    : base.endsWith("/") ? `${base}${pkg}` : `${base}/${pkg}`;
}
function expand(name) {
  const bundleKey = bundleAliases[name] || name;
  if (bundleKey === "constitution") return bundles.constitution;
  if (layers.includes(name) && !bundles[name]) return [name];
  return bundles[bundleKey] || [name];
}
function expandTargets(targets) {
  const seen = new Set();
  return (targets.length ? targets : ["constitution"])
    .flatMap(expand)
    .filter((item) => !seen.has(item) && seen.add(item));
}
function suggest(input, choices) {
  const query = input.toLowerCase();
  return choices
    .map((choice) => {
      let score = 0;
      if (choice === query) score = 100;
      else if (choice.startsWith(query)) score = 80;
      else if (query.startsWith(choice)) score = 70;
      else if (choice.includes(query) || query.includes(choice)) score = 50;
      else for (const char of query) if (choice.includes(char)) score += 1;
      return { choice, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.choice || null;
}
function parse(tokens) {
  const parsed = {
    targets: [],
    dir: process.cwd(),
    source: process.env.ARCHITECTONIC_ADD_SOURCE || "git",
    fix: false,
    force: false,
    dryRun: false,
    json: false,
    preset: "constitution",
  };
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === "--fix") parsed.fix = true;
    else if (token === "--force") parsed.force = true;
    else if (token === "--dry-run") parsed.dryRun = true;
    else if (token === "--json") parsed.json = true;
    else if (token === "--dir" || token === "--out") {
      const value = tokens[++index];
      if (!value) throw new Error(`Missing value for ${token}`);
      parsed.dir = path.resolve(value);
    } else if (token.startsWith("--dir=") || token.startsWith("--out=")) {
      parsed.dir = path.resolve(token.split("=").slice(1).join("="));
    } else if (token === "--source") {
      const value = tokens[++index];
      if (!value) throw new Error("Missing value for --source");
      parsed.source = value;
    } else if (token.startsWith("--source=")) parsed.source = token.slice("--source=".length);
    else if (token === "--preset") {
      const value = tokens[++index];
      if (!value) throw new Error("Missing value for --preset");
      parsed.preset = value;
    } else if (token.startsWith("--preset=")) parsed.preset = token.slice("--preset=".length);
    else if (token === "--help" || token === "-h") continue;
    else if (token.startsWith("-")) throw new Error(`Unknown option: ${token}`);
    else parsed.targets.push(token);
  }
  return parsed;
}
function parseDirArg(tokens) {
  const parsed = parse(tokens);
  if (parsed.targets.length === 1 && /[\\/]/.test(parsed.targets[0])) {
    parsed.dir = path.resolve(parsed.targets[0]);
    parsed.targets = [];
  }
  return parsed;
}
function hint(lines) {
  println();
  for (const line of lines) println(style.dim(`  → ${line}`));
}

function welcome() {
  println();
  println(`${style.bold("  architectonic")} ${style.dim(`v${VERSION}`)}`);
  println(style.dim("  Compose a workspace for systemic human-AI collaboration."));
  println();
  println(style.bold("  Examples"));
  println(`    ${style.cyan("npx architectonic init my-workspace")}${style.dim("     create workspace + full ensemble")}`);
  println(`    ${style.cyan("npx architectonic add agents")}${style.dim("              add one layer")}`);
  println(`    ${style.cyan("npx architectonic doctor")}${style.dim("                verify install health")}`);
  println();
  println(style.bold("  Commands"));
  const rows = [
    ["init", "create a workspace and install a bundle"],
    ["add", "install layers or bundles (--source git|npm)"],
    ["list", "show installed layers from architectonic.json"],
    ["doctor", "verify manifest and installed layers"],
    ["status", "show source, branch, cleanliness, and pin state"],
    ["diff", "show local changes for one layer"],
    ["update", "fast-forward clean git layers"],
    ["remove", "remove one installed layer"],
  ];
  for (const [command, description] of rows) println(`    ${style.cyan(padEnd(command, 8))}${style.dim(description)}`);
  println();
  println(`${style.bold("  Layers")}     ${style.dim(layers.join(" · "))}`);
  println();
  println(style.dim(`  Docs       ${REPO_URL}`));
  println();
}
function helpFull() {
  println(`architectonic ${VERSION}
CLI for composing Architectonic layers into a workspace for systemic human-AI collaboration.

Usage:
  npx architectonic init [name]
  npx architectonic add <layer|bundle>...
  npx architectonic list [--json]
  npx architectonic doctor [--fix] [--json]
  npx architectonic status [--json]
  npx architectonic diff <layer>
  npx architectonic update [layer...] [--dry-run]
  npx architectonic remove <layer> [--force]

Layers:
${layers.map((layer) => `  ${padEnd(layer, 18)}${layerBlurbs[layer]}`).join("\n")}

Bundles:
  constitution      ${core.join(" + ")}
  knowledge-system  ${bundles["knowledge-system"].join(" + ")}
  agent-system      ${bundles["agent-system"].join(" + ")}
  project-system    ${bundles["project-system"].join(" + ")}

Environment:
  ARCHITECTONIC_SOURCE_BASE   git clone base URL or local path
  ARCHITECTONIC_NPM_BASE      npm package scope or local package root
  ARCHITECTONIC_ADD_SOURCE    default source mode (git|npm)
  NO_COLOR                    disable color output

Docs: ${REPO_URL}`);
}
function helpCommand(name) {
  const guides = {
    init: `architectonic init — create a workspace and install a bundle

Usage:
  npx architectonic init [name] [--dir <path>] [--source git|npm] [--preset constitution]

The default constitution preset installs the full Architectonic ensemble.`,
    add: `architectonic add — install layers or bundles

Usage:
  npx architectonic add <layer|bundle>... [--dir <path>] [--source git|npm]

Examples:
  npx architectonic add agents
  npx architectonic add models
  npx architectonic add knowledge-system
  npx architectonic add agent-system`,
    list: "architectonic list — show installed layers\n\nUsage:\n  npx architectonic list [--dir <path>] [--json]",
    doctor: "architectonic doctor — verify installed layers\n\nUsage:\n  npx architectonic doctor [--dir <path>] [--fix] [--json]",
    status: "architectonic status — show source, branch, cleanliness, and pins\n\nUsage:\n  npx architectonic status [--dir <path>] [--json]",
    diff: "architectonic diff — show local changes for one layer\n\nUsage:\n  npx architectonic diff <layer> [--dir <path>]",
    update: "architectonic update — fast-forward clean git layers\n\nUsage:\n  npx architectonic update [layer...] [--dir <path>] [--dry-run]",
    remove: "architectonic remove — remove one installed layer\n\nUsage:\n  npx architectonic remove <layer> [--dir <path>] [--force]",
  };
  if (!guides[name]) throw new Error(`No help for command: ${name}`);
  println(guides[name]);
}

function readManifest(dir) {
  return exists(manifestPath(dir))
    ? readJson(manifestPath(dir))
    : { schema_version: 1, installed_at: new Date().toISOString(), layers: {} };
}
function writeManifest(dir, manifest) {
  fs.writeFileSync(manifestPath(dir), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}
function layerRecord(root, item) {
  const record = {
    source: item.source,
    ref: item.ref,
    path: rel(root, item.path),
    installed_at: new Date().toISOString(),
    package_name: pkgName(item.path),
  };
  if (item.source === "git") record.resolved_sha = gitHead(item.path);
  else record.resolved_version = pkgVersion(item.path);
  return record;
}
function cloneLayer(layer, dir) {
  const destination = layerPath(dir, layer);
  if (exists(destination)) throw new Error(`Target already exists: ${destination}`);
  const url = repoUrl(layer);
  const result = run("git", ["clone", url, destination], { cwd: dir, shell: process.platform === "win32" });
  if (result.status !== 0) throw new Error(`Failed to clone ${url}\n${(result.stderr || result.stdout || "").trim()}`);
  return { layer, path: destination, source: "git", ref: url };
}
function packLayer(layer, dir) {
  const destination = layerPath(dir, layer);
  if (exists(destination)) throw new Error(`Target already exists: ${destination}`);
  const temp = fs.mkdtempSync(path.join(dir, "architectonic-npm-"));
  const spec = packageSpec(layer);
  const packed = run("npm", ["pack", spec, "--pack-destination", temp], { cwd: dir, shell: true });
  if (packed.status !== 0) throw new Error(`Failed to pack ${spec}\n${(packed.stderr || packed.stdout || "").trim()}`);
  const archive = (packed.stdout || "").trim().split(/\r?\n/).filter(Boolean).pop();
  fs.mkdirSync(destination, { recursive: true });
  const extracted = run("tar", ["-xzf", path.join(temp, archive), "-C", destination], { cwd: dir });
  if (extracted.status !== 0) throw new Error(`Failed to extract ${archive}\n${(extracted.stderr || extracted.stdout || "").trim()}`);
  const packageDir = path.join(destination, "package");
  for (const entry of fs.readdirSync(packageDir, { withFileTypes: true })) {
    fs.renameSync(path.join(packageDir, entry.name), path.join(destination, entry.name));
  }
  fs.rmdirSync(packageDir);
  fs.rmSync(temp, { recursive: true, force: true });
  return { layer, path: destination, source: "npm", ref: spec };
}
function install(targets, dir, source, { quiet = false } = {}) {
  const finalTargets = expandTargets(targets);
  const invalid = finalTargets.filter((item) => !layers.includes(item));
  if (invalid.length) {
    const candidates = [...layers, ...Object.keys(bundles)];
    const suggestions = invalid.map((item) => suggest(item, candidates)).filter(Boolean);
    throw new Error(`Unknown layer(s): ${invalid.join(", ")}${suggestions.length ? `\nDid you mean: ${[...new Set(suggestions)].join(", ")}?` : ""}`);
  }
  ensureSource(source);
  fs.mkdirSync(dir, { recursive: true });
  const manifest = readManifest(dir);
  Object.assign(manifest, {
    installed_at: new Date().toISOString(),
    last_source: source,
    git_source_base: repoBase,
    npm_source_base: npmBase || "registry",
  });
  for (const layer of finalTargets) {
    if (!quiet) println(`${icon("plan")} Adding ${style.bold(layer)} from ${source}...`);
    const item = source === "git" ? cloneLayer(layer, dir) : packLayer(layer, dir);
    manifest.layers[layer] = layerRecord(dir, item);
  }
  writeManifest(dir, manifest);
  if (!quiet) {
    println(`${icon("ok")} Installed ${style.bold(finalTargets.join(", "))} into ${dir}`);
    println(`${icon("info")} Wrote ${manifestPath(dir)}`);
  }
  return finalTargets;
}
function init(tokens) {
  const parsed = parse(tokens);
  const name = parsed.targets.find((target) => !bundles[target] && !bundleAliases[target] && !layers.includes(target));
  const dir = name ? path.resolve(parsed.dir, name) : parsed.dir;
  if (exists(dir) && fs.readdirSync(dir).length > 0) throw new Error(`Refusing to initialize into a non-empty directory: ${dir}`);
  fs.mkdirSync(dir, { recursive: true });
  const selected = expandTargets([parsed.preset || "constitution"]);
  fs.writeFileSync(path.join(dir, "README.md"), `# ${name || path.basename(dir)}\n\nInitialized by \`architectonic\`.\n\nInstalled layers:\n\n${selected.map((item) => `- ${item}`).join("\n")}\n`, "utf8");
  fs.writeFileSync(path.join(dir, "AGENTS.md"), `# Agent Instructions\n\nRead the installed layers before making structural changes.\n\nThe constitution composes the ensemble. Each layer remains authoritative for its own concern.\n`, "utf8");
  install(selected, dir, parsed.source);
  hint(["architectonic doctor", "architectonic status"]);
}
function load(dir) {
  if (!exists(manifestPath(dir))) throw new Error(`No architectonic.json found in ${dir}`);
  return readJson(manifestPath(dir));
}
function inspectLayer(root, layer, item) {
  const dir = path.resolve(root, item.path || `./${layer}`);
  const expected = packageMap[layer];
  const found = exists(dir) ? pkgName(dir) : null;
  const checks = [];
  let ok = true;
  if (!exists(dir)) {
    checks.push({ level: "fail", code: "missing_dir", message: "missing directory" });
    ok = false;
  } else if (!exists(path.join(dir, "package.json"))) {
    checks.push({ level: "fail", code: "missing_package_json", message: "missing package.json" });
    ok = false;
  }
  if (expected && found && expected !== found) {
    checks.push({ level: "fail", code: "package_name", message: `expected ${expected}, found ${found}` });
    ok = false;
  }
  const head = item.source === "git" && exists(path.join(dir, ".git")) ? gitHead(dir) : null;
  const dirtyFiles = exists(dir) ? dirty(dir) : null;
  return {
    layer, dir, expected, found, ok, checks,
    source: item.source,
    branch: exists(dir) ? branch(dir) : null,
    dirty: Boolean(dirtyFiles),
    dirtyFiles,
    head,
    pin: item.resolved_sha || null,
    version: exists(dir) ? pkgVersion(dir) : null,
  };
}
function listCommand(tokens) {
  const parsed = parseDirArg(tokens);
  const manifest = load(parsed.dir);
  if (parsed.json) return emitJson({ command: "list", root: parsed.dir, layers: manifest.layers || {}, schema_version: manifest.schema_version || 1 });
  println(`${style.bold("architectonic list")} ${style.dim(`root: ${parsed.dir}`)}`);
  println();
  for (const [layer, item] of Object.entries(manifest.layers || {})) {
    println(`  ${style.bold(layer)}`);
    println(style.dim(`    source  ${item.source || "unknown"}`));
    println(style.dim(`    path    ${item.path || "unknown"}`));
    println(style.dim(`    ref     ${item.ref || "unknown"}`));
    if (item.package_name) println(style.dim(`    pkg     ${item.package_name}`));
    if (item.resolved_sha) println(style.dim(`    pin     ${shortSha(item.resolved_sha)}`));
    if (item.resolved_version) println(style.dim(`    pin     v${item.resolved_version}`));
    println();
  }
}
function doctor(tokens) {
  const parsed = parseDirArg(tokens);
  const manifest = load(parsed.dir);
  const results = [];
  let failed = 0;
  for (const [layer, item] of Object.entries(manifest.layers || {})) {
    const info = inspectLayer(parsed.dir, layer, item);
    if (parsed.fix && exists(info.dir)) {
      item.path = rel(parsed.dir, info.dir);
      item.package_name = info.found;
      if (item.source === "git" && info.head) item.resolved_sha = info.head;
      if (item.source === "npm" && info.version) item.resolved_version = info.version;
    }
    if (!info.ok) failed += 1;
    results.push(info);
  }
  const missing = core.filter((layer) => !manifest.layers?.[layer]);
  if (missing.length) failed += missing.length;
  if (parsed.fix) writeManifest(parsed.dir, manifest);
  if (parsed.json) return emitJson({ command: "doctor", root: parsed.dir, ok: failed === 0, failed, missing, results });
  println(`${style.bold("architectonic doctor")} ${style.dim(`root: ${parsed.dir}`)}`);
  for (const result of results) {
    println(`  ${result.ok ? icon("ok") : icon("fail")} ${padEnd(result.layer, 18)} ${result.found || "no package"}`);
    for (const check of result.checks) println(style.dim(`      ${check.level}: ${check.message}`));
  }
  if (missing.length) println(`${icon("fail")} Missing ensemble layers: ${missing.join(", ")}`);
  if (failed) process.exitCode = 1;
}
function status(tokens) {
  const parsed = parseDirArg(tokens);
  const manifest = load(parsed.dir);
  const selected = parsed.targets.length ? parsed.targets : Object.keys(manifest.layers || {});
  const results = selected.map((layer) => {
    const item = manifest.layers[layer];
    if (!item) return { layer, installed: false };
    return { installed: true, ...inspectLayer(parsed.dir, layer, item) };
  });
  if (parsed.json) return emitJson({ command: "status", root: parsed.dir, results });
  println(`${style.bold("architectonic status")} ${style.dim(`root: ${parsed.dir}`)}`);
  for (const result of results) {
    if (!result.installed) {
      println(`  ${icon("warn")} ${padEnd(result.layer, 18)} not installed`);
      continue;
    }
    const state = result.dirty ? "dirty" : "clean";
    const pin = result.head ? shortSha(result.head) : result.version ? `v${result.version}` : "unresolved";
    println(`  ${result.ok ? icon("ok") : icon("fail")} ${padEnd(result.layer, 18)} ${padEnd(result.source || "unknown", 5)} ${padEnd(state, 6)} ${pin}`);
  }
}
function diff(tokens) {
  const parsed = parse(tokens);
  const layer = parsed.targets[0];
  if (!layer) throw new Error("diff requires a layer name");
  const manifest = load(parsed.dir);
  const item = manifest.layers[layer];
  if (!item) throw new Error(`Layer is not installed: ${layer}`);
  if (item.source !== "git") throw new Error(`diff is available only for git-sourced layers: ${layer}`);
  const result = git(path.resolve(parsed.dir, item.path), ["diff", "--"]);
  process.stdout.write(result.stdout || "");
  process.stderr.write(result.stderr || "");
  if (result.status !== 0) process.exitCode = result.status;
}
function update(tokens) {
  const parsed = parse(tokens);
  const manifest = load(parsed.dir);
  const targets = parsed.targets.length ? parsed.targets : Object.keys(manifest.layers || {});
  const results = [];
  for (const layer of targets) {
    const item = manifest.layers[layer];
    if (!item) {
      results.push({ layer, status: "missing" });
      continue;
    }
    const dir = path.resolve(parsed.dir, item.path);
    if (item.source !== "git") {
      results.push({ layer, status: "skipped", reason: "npm-sourced layer" });
      continue;
    }
    if (dirty(dir)) {
      results.push({ layer, status: "skipped", reason: "dirty worktree" });
      continue;
    }
    if (parsed.dryRun) {
      results.push({ layer, status: "planned" });
      continue;
    }
    const result = git(dir, ["pull", "--ff-only"]);
    if (result.status !== 0) {
      results.push({ layer, status: "failed", reason: (result.stderr || result.stdout || "").trim() });
      continue;
    }
    item.resolved_sha = gitHead(dir);
    results.push({ layer, status: "updated", resolved_sha: item.resolved_sha });
  }
  if (!parsed.dryRun) writeManifest(parsed.dir, manifest);
  if (parsed.json) return emitJson({ command: "update", root: parsed.dir, results });
  for (const result of results) println(`  ${result.status === "updated" ? icon("ok") : result.status === "failed" ? icon("fail") : icon("skip")} ${padEnd(result.layer, 18)} ${result.status}${result.reason ? `: ${result.reason}` : ""}`);
  if (results.some((result) => result.status === "failed")) process.exitCode = 1;
}
function remove(tokens) {
  const parsed = parse(tokens);
  const layer = parsed.targets[0];
  if (!layer) throw new Error("remove requires a layer name");
  const manifest = load(parsed.dir);
  const item = manifest.layers[layer];
  if (!item) throw new Error(`Layer is not installed: ${layer}`);
  const dir = path.resolve(parsed.dir, item.path);
  if (item.source === "git" && exists(dir) && dirty(dir) && !parsed.force) throw new Error(`Refusing to remove dirty git layer: ${layer}\nUse --force only after reviewing local changes.`);
  fs.rmSync(dir, { recursive: true, force: true });
  delete manifest.layers[layer];
  writeManifest(parsed.dir, manifest);
  println(`${icon("ok")} Removed ${layer}`);
}

function main() {
  if (!argv.length) return welcome();
  if (argv.includes("--version") || argv.includes("-V")) return println(VERSION);
  const command = argv[0];
  if (argv.includes("--help") || argv.includes("-h")) {
    if (commands.includes(command)) return helpCommand(command);
    return helpFull();
  }
  if (command === "init") return init(argv.slice(1));
  if (command === "add") {
    const parsed = parse(argv.slice(1));
    return install(parsed.targets, parsed.dir, parsed.source);
  }
  if (command === "list") return listCommand(argv.slice(1));
  if (command === "doctor") return doctor(argv.slice(1));
  if (command === "status") return status(argv.slice(1));
  if (command === "diff") return diff(argv.slice(1));
  if (command === "update") return update(argv.slice(1));
  if (command === "remove") return remove(argv.slice(1));
  throw new Error(`Unknown command: ${command}\nRun architectonic --help.`);
}

try {
  main();
} catch (error) {
  printErr(`${icon("fail")} ${error.message}`);
  process.exitCode = 1;
}
