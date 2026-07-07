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
const layers = ["constitution", "doctrine", "identity", "project", "skills", "knowledge", "meta", "living-knowledge"];
const core = ["constitution", "doctrine", "identity", "project", "skills", "knowledge", "meta"];
const layerAliases = { teleology: "doctrine" };
// ponytail: only alias names that are not also layer names (project is a layer)
const bundleAliases = { agent: "agent-system" };
const commands = ["init", "add", "list", "doctor", "status", "diff", "update", "remove"];
const bundles = {
  constitution: core,
  solo: core,
  default: core,
  "knowledge-system": ["constitution", "doctrine", "knowledge", "meta", "living-knowledge"],
  "agent-system": ["doctrine", "identity", "skills", "meta"],
  "project-system": ["doctrine", "project", "skills", "knowledge", "meta"],
};
const packageMap = {
  constitution: "architectonic-constitution",
  doctrine: "architectonic-doctrine",
  identity: "architectonic-identity",
  project: "architectonic-project",
  skills: "architectonic-skills",
  knowledge: "architectonic-knowledge",
  meta: "architectonic-meta",
  "living-knowledge": "architectonic-living-knowledge",
};
const layerBlurbs = {
  constitution: "root scaffold / bundle contract",
  doctrine: "purpose, ethics, ontology, epistemology, governance",
  identity: "actors, roles, authority, incentives, privacy",
  project: "operating-unit context",
  skills: "reusable procedures and verification",
  knowledge: "disclosed knowledge corpus and evidence",
  meta: "self-audit, upkeep, drift control, recursive improvement",
  "living-knowledge": "optional campaign-based knowledge maintenance",
};
const repoBase = process.env.ARCHITECTONIC_SOURCE_BASE || "https://github.com/architectonic";
const npmBase = process.env.ARCHITECTONIC_NPM_BASE || "";

// ponytail: ANSI only when interactive; plain text for pipes, CI, and NO_COLOR
const noColor = "NO_COLOR" in process.env && process.env.NO_COLOR !== "0";
const useColor = Boolean(!noColor && process.stdout.isTTY && process.env.TERM !== "dumb" && !process.env.CI) || (process.env.FORCE_COLOR && process.env.FORCE_COLOR !== "0");
const esc = (n, s) => (useColor ? `\x1b[${n}m${s}\x1b[0m` : s);
const style = {
  bold: (s) => esc("1", s),
  dim: (s) => esc("2", s),
  cyan: (s) => esc("36", s),
  green: (s) => esc("32", s),
  yellow: (s) => esc("33", s),
  red: (s) => esc("31", s),
  blue: (s) => esc("34", s),
};
function icon(kind) {
  if (!useColor) return `[${kind}]`;
  const map = { ok: style.green("✓"), fail: style.red("✗"), warn: style.yellow("!"), info: style.blue("·"), skip: style.dim("–"), plan: style.cyan("→") };
  return map[kind] || style.dim("·");
}
function println(s = "") { console.log(s); }
function printErr(s) { console.error(s); }
function emitJson(data) { console.log(JSON.stringify(data, null, 2)); }
function padEnd(s, n) { return s.length >= n ? s : s + " ".repeat(n - s.length); }

function suggest(input, choices) {
  const q = input.toLowerCase();
  const scored = choices
    .map((c) => {
      let score = 0;
      if (c === q) score = 100;
      else if (c.startsWith(q)) score = 80;
      else if (q.startsWith(c)) score = 70;
      else if (c.includes(q) || q.includes(c)) score = 50;
      else {
        let hits = 0;
        for (const ch of q) if (c.includes(ch)) hits += 1;
        score = hits;
      }
      return { c, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.c || null;
}

function welcome() {
  const w = process.stdout.columns || 72;
  const bar = "─".repeat(Math.min(w - 2, 58));
  println();
  println(style.bold(`  architectonic`) + style.dim(`  v${VERSION}`));
  println(style.dim("  Compose constitution layers into a human-agent operating system"));
  println();
  println(style.dim(`  ${bar}`));
  println();
  println(style.bold("  Examples"));
  println(`    ${style.cyan("npx architectonic init my-workspace")}${style.dim("     create workspace + default bundle")}`);
  println(`    ${style.cyan("npx architectonic add skills")}${style.dim("              add a single layer")}`);
  println(`    ${style.cyan("npx architectonic doctor")}${style.dim("                verify install health")}`);
  println();
  println(style.bold("  Commands"));
  const rows = [
    ["init", "scaffold workspace and install the constitution bundle"],
    ["add", "install layers or bundles (--source git|npm)"],
    ["list", "show installed layers from architectonic.json"],
    ["doctor", "verify manifest matches disk (--fix to repair paths)"],
    ["status", "branch, cleanliness, and pin state per layer"],
    ["diff", "show local changes for one layer"],
    ["update", "fast-forward git layers (--dry-run to preview)"],
    ["remove", "uninstall a layer (--force when dirty)"],
  ];
  for (const [cmd, desc] of rows) println(`    ${style.cyan(padEnd(cmd, 8))}${style.dim(desc)}`);
  println();
  println(style.bold("  Layers") + style.dim(`     ${core.join(" · ")}`));
  println(style.dim(`           living-knowledge (optional addon)`));
  println();
  println(style.dim(`  More     architectonic <command> --help   architectonic --help`));
  println(style.dim(`  Docs     ${REPO_URL}`));
  println();
}

function helpFull() {
  println(`architectonic ${VERSION}
CLI for composing constitution layers into a human-agent operating system.

Usage:
  npx architectonic init [name]
  npx architectonic add <layer|bundle>...
  npx architectonic list [--json]
  npx architectonic doctor [--fix] [--json]
  npx architectonic status [--json]
  npx architectonic diff <layer>
  npx architectonic update [layer...] [--dry-run]
  npx architectonic remove <layer> [--force]

Global flags:
  -h, --help       show help (full reference, or per-command help)
  -V, --version    show version

Common flags:
  --dir, --out     workspace root (default: current directory)
  --source         git or npm (default: git, or ARCHITECTONIC_ADD_SOURCE)
  --json           machine-readable output (list, doctor, status)
  --dry-run        preview without mutating (update)
  --force          skip safety checks (remove)
  --fix            repair manifest paths (doctor)

Layers:
${layers.map((l) => `  ${padEnd(l, 18)}${layerBlurbs[l]}`).join("\n")}

Bundles:
  constitution      ${core.join(" + ")}
  knowledge-system  constitution + doctrine + knowledge + meta + living-knowledge
  agent-system      doctrine + identity + skills + meta  (alias: agent)
  project-system    doctrine + project + skills + knowledge + meta

Environment:
  ARCHITECTONIC_SOURCE_BASE   git clone base URL or local path
  ARCHITECTONIC_NPM_BASE      npm package scope or local package root
  ARCHITECTONIC_ADD_SOURCE    default source mode (git|npm)
  NO_COLOR                    disable color output

Docs: ${REPO_URL}`);
}

function helpCommand(name) {
  const guides = {
    init: `architectonic init — create a workspace and install layers

Usage:
  npx architectonic init [name] [--dir <path>] [--source git|npm] [--preset constitution]

Creates a workspace directory, writes README.md and AGENTS.md, then installs the
default constitution bundle (doctrine, identity, project, skills, knowledge, meta).

Examples:
  npx architectonic init
  npx architectonic init my-workspace
  npx architectonic init --dir ./workspaces/demo

Next: npx architectonic doctor`,
    add: `architectonic add — install layers or bundles

Usage:
  npx architectonic add <layer|bundle>... [--dir <path>] [--source git|npm]

Examples:
  npx architectonic add skills
  npx architectonic add knowledge-system
  npx architectonic add agent-system
  npx architectonic add doctrine --source npm

Bundles: constitution, knowledge-system, agent-system (alias: agent),
          project-system

Next: npx architectonic status`,
    list: `architectonic list — show installed layers

Usage:
  npx architectonic list [--dir <path>] [--json]

Examples:
  npx architectonic list
  npx architectonic list --json`,
    doctor: `architectonic doctor — verify install health

Usage:
  npx architectonic doctor [--dir <path>] [--fix] [--json]

Checks manifest entries, package names, entry files, and pin state.
Use --fix to repair manifest paths and package names.

Examples:
  npx architectonic doctor
  npx architectonic doctor --fix`,
    status: `architectonic status — layer branch, cleanliness, and pins

Usage:
  npx architectonic status [--dir <path>] [--json]

Examples:
  npx architectonic status
  npx architectonic status skills --json`,
    diff: `architectonic diff — show local changes for one layer

Usage:
  npx architectonic diff <layer> [--dir <path>]

Examples:
  npx architectonic diff skills
  npx architectonic diff doctrine ./my-workspace`,
    update: `architectonic update — fast-forward git layers

Usage:
  npx architectonic update [layer...] [--dir <path>] [--dry-run]

Conservative: skips dirty worktrees and non-fast-forward divergences.
npm layers are reported but not overwritten.

Examples:
  npx architectonic update
  npx architectonic update skills meta
  npx architectonic update --dry-run`,
    remove: `architectonic remove — uninstall a layer

Usage:
  npx architectonic remove <layer> [--dir <path>] [--force]

Examples:
  npx architectonic remove living-knowledge
  npx architectonic remove skills --force`,
  };
  const body = guides[name];
  if (!body) throw new Error(`No help for command: ${name}. Run architectonic --help for the full reference.`);
  println(body);
}

function normalize(name) { return layerAliases[name] || name; }
function expand(name) {
  const n = normalize(name);
  if (n === "constitution") return bundles.constitution;
  if (layers.includes(n) && !bundles[n]) return [n];
  const bundleKey = bundleAliases[name] || n;
  return bundles[bundleKey] || [n];
}
function expandTargets(targets) {
  const seen = new Set();
  return (targets.length ? targets : ["constitution"]).flatMap(expand).filter((x) => !seen.has(x) && seen.add(x));
}
function parse(tokens) {
  const out = { targets: [], dir: process.cwd(), source: process.env.ARCHITECTONIC_ADD_SOURCE || "git", fix: false, force: false, dryRun: false, json: false, preset: "constitution" };
  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i];
    if (t === "--fix") { out.fix = true; continue; }
    if (t === "--force") { out.force = true; continue; }
    if (t === "--dry-run") { out.dryRun = true; continue; }
    if (t === "--json") { out.json = true; continue; }
    if (t === "--dir" || t === "--out") { const v = tokens[++i]; if (!v) throw new Error(`Missing value for ${t}`); out.dir = path.resolve(v); continue; }
    if (t.startsWith("--dir=") || t.startsWith("--out=")) { out.dir = path.resolve(t.split("=").slice(1).join("=")); continue; }
    if (t === "--source") { const v = tokens[++i]; if (!v) throw new Error("Missing value for --source"); out.source = v; continue; }
    if (t.startsWith("--source=")) { out.source = t.slice("--source=".length); continue; }
    if (t === "--preset") { const v = tokens[++i]; if (!v) throw new Error("Missing value for --preset"); out.preset = v; continue; }
    if (t.startsWith("--preset=")) { out.preset = t.slice("--preset=".length); continue; }
    if (t === "--help" || t === "-h") continue;
    if (t.startsWith("-")) throw new Error(`Unknown option: ${t}`);
    out.targets.push(t);
  }
  return out;
}
function parseDirArg(tokens) {
  const p = parse(tokens);
  if (p.targets.length === 1 && /[\\/]/.test(p.targets[0])) {
    p.dir = path.resolve(p.targets[0]);
    p.targets = [];
  }
  return p;
}
function hint(lines) {
  println();
  for (const line of lines) println(style.dim(`  → ${line}`));
}
function run(cmd, args, opts = {}) { return spawnSync(cmd, args, { encoding: "utf8", stdio: "pipe", shell: process.platform === "win32", ...opts }); }
function ensure(cmd, message) { if (run(cmd, ["--version"]).status !== 0) throw new Error(message); }
function ensureSource(source) {
  if (source === "git") return ensure("git", "git is required on PATH for --source git.");
  if (source === "npm") { ensure("npm", "npm is required on PATH for --source npm."); ensure("tar", "tar is required on PATH for --source npm."); return; }
  throw new Error(`Unsupported source: ${source}. Use git or npm.`);
}
function repoUrl(layer) { const base = repoBase.replace(/\\/g, "/"); return /^(?:[A-Za-z]:\/|\/|\.{1,2}\/)/.test(base) ? path.resolve(base, layer) : `${base}/${layer}.git`; }
function packageSpec(layer) {
  const pkg = packageMap[layer];
  if (!pkg) throw new Error(`No npm package mapping for ${layer}`);
  if (!npmBase) return pkg;
  const base = npmBase.replace(/\\/g, "/");
  return /^(?:[A-Za-z]:\/|\/|\.{1,2}\/)/.test(base) ? path.resolve(base, layer) : base.endsWith("/") ? `${base}${pkg}` : `${base}/${pkg}`;
}
function exists(p) { return fs.existsSync(p); }
function readJson(p) { return JSON.parse(fs.readFileSync(p, "utf8")); }
function pkgName(p) { try { return readJson(path.join(p, "package.json")).name || null; } catch { return null; } }
function pkgVersion(p) { try { return readJson(path.join(p, "package.json")).version || null; } catch { return null; } }
function semverParts(v) { return String(v || "0").split(".").map((x) => parseInt(x, 10) || 0); }
function cmpSemver(a, b) {
  const aa = semverParts(a);
  const bb = semverParts(b);
  for (let i = 0; i < 3; i += 1) {
    const d = (aa[i] || 0) - (bb[i] || 0);
    if (d) return d < 0 ? -1 : 1;
  }
  return 0;
}
function npmLatest(name) {
  const r = run("npm", ["view", name, "version"], { shell: process.platform === "win32" });
  return r.status === 0 ? (r.stdout || "").trim() || null : null;
}
function manifestPath(dir) { return path.join(dir, "architectonic.json"); }
function readManifest(dir) { return exists(manifestPath(dir)) ? readJson(manifestPath(dir)) : { schema_version: 1, installed_at: new Date().toISOString(), aliases: layerAliases, layers: {} }; }
function writeManifest(dir, m) { fs.writeFileSync(manifestPath(dir), `${JSON.stringify(m, null, 2)}\n`, "utf8"); }
function rel(root, p) { return `./${path.relative(root, p).replace(/\\/g, "/")}`; }
function layerPath(dir, layer) { return path.join(dir, layer); }
function git(cwd, args) { return run("git", args, { cwd, shell: false }); }
function dirty(dir) { const r = git(dir, ["status", "--short"]); return r.status === 0 ? (r.stdout || "").trim() : null; }
function branch(dir) { const r = git(dir, ["rev-parse", "--abbrev-ref", "HEAD"]); return r.status === 0 ? (r.stdout || "").trim() : null; }
function gitHead(dir) { const r = git(dir, ["rev-parse", "HEAD"]); return r.status === 0 ? (r.stdout || "").trim() : null; }
function shortSha(sha) { return sha ? sha.slice(0, 12) : null; }

function layerRecord(dir, item, layerPathOnDisk) {
  const source = item.source;
  const rec = {
    source,
    ref: item.ref,
    path: rel(dir, layerPathOnDisk),
    installed_at: new Date().toISOString(),
    package_name: pkgName(layerPathOnDisk),
  };
  if (source === "git") rec.resolved_sha = gitHead(layerPathOnDisk);
  else rec.resolved_version = pkgVersion(layerPathOnDisk);
  return rec;
}

function cloneLayer(layer, dir) {
  const to = layerPath(dir, layer);
  if (exists(to)) throw new Error(`Target already exists: ${to}\n  Remove it first, or pick another directory with --dir.`);
  const url = repoUrl(layer);
  const gitArgs = [];
  if (/^(?:[A-Za-z]:\\|[A-Za-z]:\/|\/|\.{1,2}[\\/])/.test(url)) {
    gitArgs.push("-c", `safe.directory=${url.replace(/\\/g, "/")}`);
    gitArgs.push("-c", `safe.directory=${url.replace(/\\/g, "/")}/.git`);
  }
  gitArgs.push("clone", url, to);
  const r = run("git", gitArgs, { cwd: dir, shell: process.platform === "win32" });
  if (r.status !== 0) throw new Error(`Failed to clone ${url}\n${(r.stderr || r.stdout || "").trim()}`);
  return { layer, path: to, source: "git", ref: url };
}
function packLayer(layer, dir) {
  const to = layerPath(dir, layer);
  if (exists(to)) throw new Error(`Target already exists: ${to}\n  Remove it first, or pick another directory with --dir.`);
  const temp = fs.mkdtempSync(path.join(dir, "architectonic-npm-"));
  const spec = packageSpec(layer);
  const pack = run("npm", ["pack", spec, "--pack-destination", temp], { cwd: dir, shell: true });
  if (pack.status !== 0) throw new Error(`Failed to pack ${spec}\n${(pack.stderr || pack.stdout || "").trim()}`);
  const tgz = (pack.stdout || "").trim().split(/\r?\n/).filter(Boolean).pop();
  fs.mkdirSync(to, { recursive: true });
  const extract = run("tar", ["-xzf", path.join(temp, tgz), "-C", to], { cwd: dir });
  if (extract.status !== 0) throw new Error(`Failed to extract ${tgz}\n${(extract.stderr || extract.stdout || "").trim()}`);
  const packageDir = path.join(to, "package");
  if (!exists(packageDir)) throw new Error(`Expected extracted package directory: ${packageDir}`);
  for (const entry of fs.readdirSync(packageDir, { withFileTypes: true })) fs.renameSync(path.join(packageDir, entry.name), path.join(to, entry.name));
  fs.rmdirSync(packageDir);
  fs.rmSync(temp, { recursive: true, force: true });
  return { layer, path: to, source: "npm", ref: spec };
}

function install(targets, dir, source, { quiet = false } = {}) {
  const finalTargets = expandTargets(targets);
  const invalid = finalTargets.filter((x) => !layers.includes(x));
  if (invalid.length) {
    const hints = invalid.map((x) => suggest(x, [...layers, ...Object.keys(bundles)])).filter(Boolean);
    throw new Error(`Unknown layer(s): ${invalid.join(", ")}${hints.length ? `\n  Did you mean: ${[...new Set(hints)].join(", ")}?` : ""}`);
  }
  ensureSource(source);
  fs.mkdirSync(dir, { recursive: true });
  const manifest = readManifest(dir);
  Object.assign(manifest, { installed_at: new Date().toISOString(), last_source: source, git_source_base: repoBase, npm_source_base: npmBase || "registry", aliases: layerAliases });
  const installed = [];
  for (const layer of finalTargets) {
    if (!quiet) println(`${icon("plan")} Adding ${style.bold(layer)} from ${source}...`);
    const item = source === "git" ? cloneLayer(layer, dir) : packLayer(layer, dir);
    installed.push(layer);
    manifest.layers[layer] = layerRecord(dir, item, item.path);
  }
  writeManifest(dir, manifest);
  if (!quiet) {
    println(`${icon("ok")} Installed ${style.bold(installed.join(", "))} into ${dir}`);
    println(`${icon("info")} Wrote ${manifestPath(dir)}`);
    hint(["architectonic status", "architectonic doctor"]);
  }
  return installed;
}

function init(tokens) {
  const p = parse(tokens);
  const name = p.targets.find((t) => !bundles[t] && !bundleAliases[t] && !layers.includes(normalize(t)));
  const dir = name ? path.resolve(p.dir, name) : p.dir;
  if (exists(dir) && fs.readdirSync(dir).length > 0) throw new Error(`Refusing to initialize into a non-empty directory: ${dir}\n  Pick an empty folder or a new name: architectonic init <name>`);
  fs.mkdirSync(dir, { recursive: true });
  const selected = expandTargets([p.preset || "constitution"]);
  fs.writeFileSync(path.join(dir, "README.md"), `# ${name || path.basename(dir)}\n\nInitialized by \`architectonic\`.\n\nInstalled layers:\n\n${selected.map((x) => `- ${x}`).join("\n")}\n`, "utf8");
  fs.writeFileSync(path.join(dir, "AGENTS.md"), "# Agent Instructions\n\nRead installed layers before making structural changes.\n\nPriority order:\n1. constitution\n2. doctrine\n3. identity\n4. project\n5. knowledge\n6. skills\n7. meta\n", "utf8");
  install(selected, dir, p.source);
  hint(["architectonic doctor", "architectonic status"]);
}

function load(dir) {
  if (!exists(manifestPath(dir))) throw new Error(`No architectonic.json found in ${dir}\n  Run architectonic init here, or pass --dir <path>.`);
  return readJson(manifestPath(dir));
}

function inspectLayer(root, raw, item) {
  const layer = normalize(raw);
  const dir = path.resolve(root, item.path || `./${layer}`);
  const expected = packageMap[layer];
  const found = pkgName(dir);
  const checks = [];
  let ok = true;
  if (!exists(dir)) { checks.push({ level: "fail", code: "missing_dir", message: "missing directory" }); ok = false; }
  if (exists(dir) && !exists(path.join(dir, "package.json"))) { checks.push({ level: "fail", code: "missing_package_json", message: "missing package.json" }); ok = false; }
  if (expected && found && found !== expected) { checks.push({ level: "fail", code: "package_name", message: `expected ${expected}, found ${found}` }); ok = false; }
  const entryFiles = ["START_HERE.md", "AGENTS.md", "README.md"];
  if (exists(dir)) {
    const hasEntry = entryFiles.some((f) => exists(path.join(dir, f)));
    if (!hasEntry) checks.push({ level: "warn", code: "missing_entry", message: `no ${entryFiles.join(" / ")} in layer` });
  }
  let head = null;
  let pin = item.resolved_sha || null;
  if (exists(dir) && item.source === "git" && exists(path.join(dir, ".git"))) {
    head = gitHead(dir);
    if (pin && head && pin !== head) checks.push({ level: "info", code: "pin_drift", message: `pinned ${shortSha(pin)}, now at ${shortSha(head)}` });
    else if (!pin && head) checks.push({ level: "warn", code: "unpinned", message: "no resolved_sha in manifest (run doctor --fix after update)" });
  }
  if (exists(dir) && item.source === "npm") {
    const ver = pkgVersion(dir);
    if (item.resolved_version && ver && item.resolved_version !== ver) checks.push({ level: "info", code: "version_drift", message: `pinned ${item.resolved_version}, now ${ver}` });
  }
  const d = exists(dir) ? dirty(dir) : null;
  return { layer, dir, expected, found, ok, checks, branch: exists(dir) ? branch(dir) : null, dirty: Boolean(d), dirtyFiles: d, head, pin, source: item.source, path: item.path, package_name: found, version: pkgVersion(dir) };
}

function list(tokens) {
  const p = parseDirArg(tokens);
  const m = load(p.dir);
  const optional = layers.filter((layer) => !core.includes(layer) && !m.layers[layer]);
  if (p.json) {
    emitJson({ command: "list", root: p.dir, layers: m.layers || {}, optional_addons: optional, schema_version: m.schema_version || 1 });
    return;
  }
  println(style.bold(`architectonic list`) + style.dim(`  root: ${p.dir}`));
  println();
  for (const [layer, item] of Object.entries(m.layers || {})) {
    println(`  ${style.bold(layer)}`);
    println(style.dim(`    source  ${item.source || "unknown"}`));
    println(style.dim(`    path    ${item.path || "unknown"}`));
    println(style.dim(`    ref     ${item.ref || "unknown"}`));
    if (item.package_name) println(style.dim(`    pkg     ${item.package_name}`));
    if (item.resolved_sha) println(style.dim(`    pin     ${shortSha(item.resolved_sha)}`));
    if (item.resolved_version) println(style.dim(`    pin     v${item.resolved_version}`));
    println();
  }
  if (optional.length) println(style.dim(`  optional addons not installed: ${optional.join(", ")}`));
}

function doctor(tokens) {
  const p = parseDirArg(tokens);
  const m = load(p.dir);
  const results = [];
  let failed = 0;
  for (const [raw, item] of Object.entries(m.layers || {})) {
    const info = inspectLayer(p.dir, raw, item);
    if (p.fix && exists(info.dir)) {
      item.path = rel(p.dir, info.dir);
      item.package_name = info.found;
      if (info.source === "git" && info.head) item.resolved_sha = info.head;
      if (info.source === "npm" && info.version) item.resolved_version = info.version;
    }
    if (!info.ok) failed += 1;
    results.push(info);
  }
  const optional = layers.filter((layer) => !core.includes(layer) && !m.layers[layer]);
  const rootAgents = exists(path.join(p.dir, "AGENTS.md"));
  if (p.fix) writeManifest(p.dir, m);
  if (p.json) {
    emitJson({ command: "doctor", root: p.dir, ok: failed === 0, layers: results, optional_addons: optional, workspace_agents_md: rootAgents });
    if (failed) process.exit(1);
    return;
  }
  println(style.bold("architectonic doctor") + style.dim(`  root: ${p.dir}`));
  println();
  for (const info of results) {
    const lead = info.ok ? icon("ok") : icon("fail");
    println(`  ${lead} ${style.bold(info.layer)}${style.dim(`  ${info.path}`)}`);
    for (const c of info.checks) {
      const sym = c.level === "fail" ? icon("fail") : c.level === "warn" ? icon("warn") : icon("info");
      println(`      ${sym} ${c.message}`);
    }
  }
  for (const layer of optional) println(`  ${icon("info")} ${style.dim(`${layer}: optional addon not installed`)}`);
  if (!rootAgents) println(`  ${icon("warn")} ${style.dim("workspace AGENTS.md not found (expected after init)")}`);
  if (p.fix) println(`\n  ${icon("ok")} Manifest repaired`);
  if (failed) process.exit(1);
}

function status(tokens) {
  const p = parseDirArg(tokens);
  ensureSource("git");
  ensure("npm", "npm is required on PATH for npm status checks.");
  const m = load(p.dir);
  const rows = [];
  for (const [raw, item] of Object.entries(m.layers || {})) {
    const info = inspectLayer(p.dir, raw, item);
    let state = "ok";
    let detail = "";
    if (!exists(info.dir)) { state = "missing"; detail = "directory missing"; }
    else if (info.source === "git") {
      detail = `${info.branch || "unknown"}, ${info.dirty ? "dirty" : "clean"}`;
      if (info.head) detail += ` @ ${shortSha(info.head)}`;
      if (info.pin && info.head && info.pin !== info.head) state = "drift";
      if (info.dirty) state = "dirty";
    } else {
      detail = `v${info.version || "unknown"}`;
      const pkg = item.package_name || packageMap[info.layer];
      const latest = pkg ? npmLatest(pkg) : null;
      if (latest && info.version && cmpSemver(info.version, latest) < 0) { state = "outdated"; detail += ` (npm latest: ${latest})`; }
    }
    rows.push({ layer: info.layer, state, source: info.source, detail, dirty: info.dirty, head: info.head, pin: info.pin, path: info.path });
  }
  if (p.json) { emitJson({ command: "status", root: p.dir, layers: rows }); return; }
  println(style.bold("architectonic status") + style.dim(`  root: ${p.dir}`));
  println();
  for (const row of rows) {
    const sym = row.state === "ok" ? icon("ok") : row.state === "dirty" || row.state === "drift" ? icon("warn") : row.state === "missing" ? icon("fail") : icon("info");
    println(`  ${sym} ${style.bold(padEnd(row.layer, 16))}${style.dim(`${row.source}  ${row.detail}`)}`);
  }
}

function diff(tokens) {
  const p = parse(tokens);
  if (!p.targets.length) throw new Error("Specify a layer to diff.\n  Example: architectonic diff skills");
  if (p.targets.length > 1) {
    const last = p.targets[p.targets.length - 1];
    if (/[\\/]/.test(last)) { p.dir = path.resolve(last); p.targets.pop(); }
  }
  const target = normalize(p.targets[0] || "");
  if (!target) throw new Error("Specify a layer to diff.\n  Example: architectonic diff skills");
  const m = load(p.dir);
  const item = m.layers[target];
  if (!item) throw new Error(`Layer not recorded in manifest: ${target}\n  Run architectonic list to see installed layers.`);
  const dir = path.resolve(p.dir, item.path || `./${target}`);
  println(style.bold(`architectonic diff ${target}`));
  if (item.source === "git") {
    const d = dirty(dir);
    if (d) println(d.split(/\r?\n/).map((x) => `  ${x}`).join("\n"));
    else println(style.dim("  local changes: none"));
    hint([`architectonic update ${target} --dry-run`]);
  } else {
    println(`  installed version: ${pkgVersion(dir) || "unknown"}`);
  }
}

function update(tokens) {
  const p = parseDirArg(tokens);
  const m = load(p.dir);
  ensureSource("git");
  ensure("npm", "npm is required on PATH for npm layer version checks.");
  const filter = p.targets.map(normalize);
  if (filter.length) {
    const unknown = filter.filter((x) => !m.layers[x]);
    if (unknown.length) throw new Error(`Layer(s) not in manifest: ${unknown.join(", ")}\n  Run architectonic list to see installed layers.`);
  }
  println(style.bold(`architectonic update${filter.length ? ` ${filter.join(" ")}` : ""}`) + style.dim(`  root: ${p.dir}`));
  println();
  let changed = false;
  for (const [raw, item] of Object.entries(m.layers || {})) {
    const layer = normalize(raw);
    if (filter.length && !filter.includes(layer)) continue;
    const dir = path.resolve(p.dir, item.path || `./${layer}`);
    if (!exists(dir)) { println(`  ${icon("skip")} ${layer}: missing`); continue; }
    if (item.source !== "git") {
      const installed = pkgVersion(dir);
      const pkg = item.package_name || packageMap[layer];
      const latest = pkg ? npmLatest(pkg) : null;
      if (latest && installed && cmpSemver(installed, latest) < 0) println(`  ${icon("info")} ${layer}: installed ${installed}, npm has ${latest} — remove then architectonic add ${layer} --source npm`);
      else if (latest && installed) println(`  ${icon("ok")} ${layer}: npm ${installed}${cmpSemver(installed, latest) === 0 ? " (latest)" : ""}`);
      else println(`  ${icon("skip")} ${layer}: npm install (non-mutating)`);
      continue;
    }
    if (dirty(dir)) { println(`  ${icon("skip")} ${layer}: local changes — commit, stash, or discard before update`); continue; }
    if (p.dryRun) { println(`  ${icon("plan")} ${layer}: would git pull --ff-only`); continue; }
    const r = git(dir, ["pull", "--ff-only"]);
    const msg = (r.stderr || r.stdout || "").trim();
    if (r.status === 0) {
      changed = true;
      item.resolved_sha = gitHead(dir);
      println(`  ${icon("ok")} ${layer}: updated${item.resolved_sha ? ` @ ${shortSha(item.resolved_sha)}` : ""}${msg ? `\n      ${msg.split(/\r?\n/).join("\n      ")}` : ""}`);
    } else if (/not possible to fast-forward| divergent branches|non-fast-forward/i.test(msg)) println(`  ${icon("skip")} ${layer}: diverged — merge or rebase manually in ${dir}`);
    else println(`  ${icon("fail")} ${layer}: ${msg || "git pull --ff-only failed"}`);
  }
  if (changed) writeManifest(p.dir, m);
  if (!p.dryRun) hint(["architectonic status", "architectonic doctor"]);
}

function remove(tokens) {
  const p = parse(tokens);
  const target = normalize(p.targets[0] || "");
  if (!target) throw new Error("Specify a layer to remove.\n  Example: architectonic remove living-knowledge");
  const m = load(p.dir);
  const item = m.layers[target];
  if (!item) throw new Error(`Layer not recorded in manifest: ${target}\n  Run architectonic list to see installed layers.`);
  const dir = path.resolve(p.dir, item.path || `./${target}`);
  if (exists(path.join(dir, ".git")) && dirty(dir) && !p.force) throw new Error(`Refusing to remove ${target}: local git changes detected.\n  Commit or stash changes, or pass --force to delete anyway.`);
  if (exists(dir)) fs.rmSync(dir, { recursive: true, force: true });
  delete m.layers[target];
  writeManifest(p.dir, m);
  println(`${icon("ok")} Removed ${style.bold(target)}`);
  hint(["architectonic list"]);
}

function selfCheck() {
  const cli = path.join(__dirname, "architectonic.js");
  const nodeRun = (args) => spawnSync(process.execPath, [cli, ...args], { encoding: "utf8", stdio: "pipe", shell: false });
  const cases = [
    ["version flag", () => { const r = nodeRun(["--version"]); if (r.status !== 0 || r.stdout.trim() !== VERSION) throw new Error(`version: got ${JSON.stringify(r.stdout)}`); }],
    ["welcome", () => { const r = nodeRun([]); if (r.status !== 0 || !r.stdout.includes("Examples")) throw new Error("welcome"); }],
    ["bundle alias expand", () => { if (expand("agent").join() !== bundles["agent-system"].join()) throw new Error("agent alias"); }],
    ["project layer not bundle", () => { if (expand("project").join() !== "project") throw new Error("project layer"); }],
    ["project-system bundle", () => { if (!expand("project-system").includes("skills")) throw new Error("project-system"); }],
    ["suggest command", () => { if (suggest("lis", commands) !== "list") throw new Error("suggest"); }],
  ];
  for (const [, fn] of cases) fn();
  return cases.length;
}

try {
  if (argv[0] === "--version" || argv[0] === "-V") { println(VERSION); process.exit(0); }
  if (argv[0] === "--self-check") { const n = selfCheck(); println(`self-check ok (${n} cases)`); process.exit(0); }

  const [command, ...rest] = argv;
  if (!command) { welcome(); process.exit(0); }
  if (["help", "--help", "-h"].includes(command)) { helpFull(); process.exit(0); }
  if (rest.includes("--help") || rest.includes("-h")) { helpCommand(command); process.exit(0); }

  if (command === "init") init(rest);
  else if (command === "add") { const p = parse(rest); install(p.targets, p.dir, p.source); }
  else if (command === "list") list(rest);
  else if (command === "doctor") doctor(rest);
  else if (command === "status") status(rest);
  else if (command === "diff") diff(rest);
  else if (command === "update") update(rest);
  else if (command === "remove") remove(rest);
  else {
    const guess = suggest(command, commands);
    throw new Error(`Unknown command: ${command}${guess ? `\n  Did you mean: ${guess}?` : ""}\n  Run architectonic --help for the full reference.`);
  }
} catch (error) {
  printErr(useColor ? style.red(error.message) : error.message);
  process.exit(1);
}
