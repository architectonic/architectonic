#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const VERSION = "0.0.7";
const [command, ...rest] = process.argv.slice(2);
const layers = ["constitution", "doctrine", "identity", "project", "skills", "knowledge", "meta", "living-knowledge"];
const core = ["constitution", "doctrine", "identity", "project", "skills", "knowledge", "meta"];
const aliases = { teleology: "doctrine" };
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
const repoBase = process.env.ARCHITECTONIC_SOURCE_BASE || "https://github.com/architectonic";
const npmBase = process.env.ARCHITECTONIC_NPM_BASE || "";

function help() {
  console.log(`architectonic ${VERSION}

Usage:
  npx architectonic init [name]
  npx architectonic add constitution
  npx architectonic add <doctrine|identity|project|skills|knowledge|meta|living-knowledge>
  npx architectonic add teleology        # deprecated alias for doctrine
  npx architectonic add knowledge-system
  npx architectonic list
  npx architectonic doctor [--fix]
  npx architectonic status
  npx architectonic diff <layer>
  npx architectonic update [--dry-run]
  npx architectonic remove <layer> [--force]

Layers:
  constitution      root scaffold / bundle contract
  doctrine          purpose, ethics, ontology, epistemology, governance, incentives
  identity          actors, roles, authority, incentives, privacy
  project           operating-unit context
  skills            reusable procedures and verification
  knowledge         disclosed knowledge corpus and evidence
  meta              self-audit, upkeep, drift control, recursive improvement
  living-knowledge  optional campaign-based knowledge maintenance pattern

Bundles:
  constitution      constitution + doctrine + identity + project + skills + knowledge + meta
  knowledge-system  constitution + doctrine + knowledge + meta + living-knowledge
  agent-system      doctrine + identity + skills + meta
  project-system    doctrine + project + skills + knowledge + meta`);
}

function normalize(name) { return aliases[name] || name; }
function expand(name) {
  const n = normalize(name);
  if (n === "constitution") return bundles.constitution;
  return bundles[n] || [n];
}
function expandTargets(targets) {
  const seen = new Set();
  return (targets.length ? targets : ["constitution"]).flatMap(expand).filter((x) => !seen.has(x) && seen.add(x));
}
function parse(tokens) {
  const out = { targets: [], dir: process.cwd(), source: process.env.ARCHITECTONIC_ADD_SOURCE || "git", fix: false, force: false, dryRun: false, preset: "constitution" };
  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i];
    if (t === "--fix") { out.fix = true; continue; }
    if (t === "--force") { out.force = true; continue; }
    if (t === "--dry-run") { out.dryRun = true; continue; }
    if (t === "--dir" || t === "--out") { const v = tokens[++i]; if (!v) throw new Error(`Missing value for ${t}`); out.dir = path.resolve(v); continue; }
    if (t.startsWith("--dir=") || t.startsWith("--out=")) { out.dir = path.resolve(t.split("=").slice(1).join("=")); continue; }
    if (t === "--source") { const v = tokens[++i]; if (!v) throw new Error("Missing value for --source"); out.source = v; continue; }
    if (t.startsWith("--source=")) { out.source = t.slice("--source=".length); continue; }
    if (t === "--preset") { const v = tokens[++i]; if (!v) throw new Error("Missing value for --preset"); out.preset = v; continue; }
    if (t.startsWith("--preset=")) { out.preset = t.slice("--preset=".length); continue; }
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
function manifestPath(dir) { return path.join(dir, "architectonic.json"); }
function readManifest(dir) { return exists(manifestPath(dir)) ? readJson(manifestPath(dir)) : { schema_version: 1, installed_at: new Date().toISOString(), aliases, layers: {} }; }
function writeManifest(dir, m) { fs.writeFileSync(manifestPath(dir), `${JSON.stringify(m, null, 2)}\n`, "utf8"); }
function rel(root, p) { return `./${path.relative(root, p).replace(/\\/g, "/")}`; }
function layerPath(dir, layer) { return path.join(dir, layer); }

function cloneLayer(layer, dir) {
  const to = layerPath(dir, layer);
  if (exists(to)) throw new Error(`Target already exists: ${to}`);
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
  if (exists(to)) throw new Error(`Target already exists: ${to}`);
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
function install(targets, dir, source) {
  const finalTargets = expandTargets(targets);
  const invalid = finalTargets.filter((x) => !layers.includes(x));
  if (invalid.length) throw new Error(`Unknown layer(s): ${invalid.join(", ")}`);
  ensureSource(source);
  fs.mkdirSync(dir, { recursive: true });
  const manifest = readManifest(dir);
  Object.assign(manifest, { installed_at: new Date().toISOString(), last_source: source, git_source_base: repoBase, npm_source_base: npmBase || "registry", aliases });
  const installed = [];
  for (const layer of finalTargets) {
    console.log(`Adding ${layer} from ${source}...`);
    const item = source === "git" ? cloneLayer(layer, dir) : packLayer(layer, dir);
    installed.push(layer);
    manifest.layers[layer] = { source: item.source, ref: item.ref, path: rel(dir, item.path), installed_at: new Date().toISOString(), package_name: pkgName(item.path) };
  }
  writeManifest(dir, manifest);
  console.log(`Installed ${installed.join(", ")} into ${dir}`);
  console.log(`Wrote ${manifestPath(dir)}`);
}
function init(tokens) {
  const p = parse(tokens);
  const name = p.targets.find((t) => !bundles[t] && !layers.includes(normalize(t)));
  const dir = name ? path.resolve(p.dir, name) : p.dir;
  if (exists(dir) && fs.readdirSync(dir).length > 0) throw new Error(`Refusing to initialize into a non-empty directory: ${dir}`);
  fs.mkdirSync(dir, { recursive: true });
  const selected = expandTargets([p.preset || "constitution"]);
  fs.writeFileSync(path.join(dir, "README.md"), `# ${name || path.basename(dir)}\n\nInitialized by \`architectonic\`.\n\nInstalled layers:\n\n${selected.map((x) => `- ${x}`).join("\n")}\n`, "utf8");
  fs.writeFileSync(path.join(dir, "AGENTS.md"), "# Agent Instructions\n\nRead installed layers before making structural changes.\n\nPriority order:\n1. constitution\n2. doctrine\n3. identity\n4. project\n5. knowledge\n6. skills\n7. meta\n", "utf8");
  install(selected, dir, p.source);
}
function load(dir) { if (!exists(manifestPath(dir))) throw new Error(`No architectonic.json found in ${dir}`); return readJson(manifestPath(dir)); }
function list(tokens) { const p = parseDirArg(tokens); const m = load(p.dir); for (const [layer, item] of Object.entries(m.layers || {})) { console.log(`${layer}\n  source: ${item.source || "unknown"}\n  path:   ${item.path || "unknown"}\n  ref:    ${item.ref || "unknown"}${item.package_name ? `\n  pkg:    ${item.package_name}` : ""}`); } }
function git(cwd, args) { return run("git", args, { cwd, shell: false }); }
function dirty(dir) { const r = git(dir, ["status", "--short"]); return r.status === 0 ? (r.stdout || "").trim() : null; }
function branch(dir) { const r = git(dir, ["rev-parse", "--abbrev-ref", "HEAD"]); return r.status === 0 ? (r.stdout || "").trim() : null; }
function doctor(tokens) {
  const p = parseDirArg(tokens); const m = load(p.dir); let failed = 0;
  for (const [raw, item] of Object.entries(m.layers || {})) {
    const layer = normalize(raw); const dir = path.resolve(p.dir, item.path || `./${layer}`); const expected = packageMap[layer]; const found = pkgName(dir);
    if (!exists(dir)) { console.log(`  [fail] ${layer}: missing directory`); failed += 1; continue; }
    if (!exists(path.join(dir, "package.json"))) { console.log(`  [fail] ${layer}: missing package.json`); failed += 1; continue; }
    if (expected && found !== expected) { console.log(`  [fail] ${layer}: expected ${expected}, found ${found}`); failed += 1; continue; }
    if (p.fix) { item.path = rel(p.dir, dir); item.package_name = found; }
    console.log(`  [ok] ${layer}: ${item.path}`);
  }
  if (p.fix) writeManifest(p.dir, m);
  if (failed) process.exit(1);
}
function status(tokens) { const p = parseDirArg(tokens); ensureSource("git"); ensure("npm", "npm is required on PATH for npm status checks."); const m = load(p.dir); console.log(`architectonic status\n  root: ${p.dir}`); for (const [raw, item] of Object.entries(m.layers || {})) { const layer = normalize(raw); const dir = path.resolve(p.dir, item.path || `./${layer}`); if (!exists(dir)) console.log(`  [missing] ${layer}`); else if (item.source === "git") console.log(`  [git] ${layer}: ${branch(dir) || "unknown"}, ${dirty(dir) ? "dirty" : "clean"}`); else console.log(`  [npm] ${layer}: installed ${pkgVersion(dir) || "unknown"}`); } }
function diff(tokens) { const p = parse(tokens); if (!p.targets.length) throw new Error("Specify a layer to diff."); if (p.targets.length > 1) { const last = p.targets[p.targets.length - 1]; if (/[\\/]/.test(last)) { p.dir = path.resolve(last); p.targets.pop(); } } const target = normalize(p.targets[0] || ""); if (!target) throw new Error("Specify a layer to diff."); const m = load(p.dir); const item = m.layers[target]; if (!item) throw new Error(`Layer not recorded in manifest: ${target}`); const dir = path.resolve(p.dir, item.path || `./${target}`); if (item.source === "git") { const d = dirty(dir); console.log(`architectonic diff ${target}`); console.log(d ? d.split(/\r?\n/).map((x) => `  ${x}`).join("\n") : "  local changes: none"); } else console.log(`architectonic diff ${target}\n  installed version: ${pkgVersion(dir) || "unknown"}`); }
function update(tokens) { const p = parseDirArg(tokens); const m = load(p.dir); ensureSource("git"); for (const [raw, item] of Object.entries(m.layers || {})) { const layer = normalize(raw); const dir = path.resolve(p.dir, item.path || `./${layer}`); if (!exists(dir)) { console.log(`  [skip] ${layer}: missing`); continue; } if (item.source !== "git") { console.log(`  [skip] ${layer}: npm update is non-mutating for now`); continue; } if (dirty(dir)) { console.log(`  [skip] ${layer}: local changes detected`); continue; } if (p.dryRun) { console.log(`  [plan] ${layer}: would git pull --ff-only`); continue; } const r = git(dir, ["pull", "--ff-only"]); console.log(`  [${r.status === 0 ? "ok" : "fail"}] ${layer}: ${(r.stdout || r.stderr || "").trim()}`); } }
function remove(tokens) { const p = parse(tokens); const target = normalize(p.targets[0] || ""); if (!target) throw new Error("Specify a layer to remove."); const m = load(p.dir); const item = m.layers[target]; if (!item) throw new Error(`Layer not recorded in manifest: ${target}`); const dir = path.resolve(p.dir, item.path || `./${target}`); if (exists(path.join(dir, ".git")) && dirty(dir) && !p.force) throw new Error(`Refusing to remove ${target}: local git changes detected. Use --force to delete.`); if (exists(dir)) fs.rmSync(dir, { recursive: true, force: true }); delete m.layers[target]; writeManifest(p.dir, m); console.log(`Removed ${target}`); }

try {
  if (!command || ["help", "--help", "-h"].includes(command)) { help(); process.exit(0); }
  if (command === "init") init(rest);
  else if (command === "add") { const p = parse(rest); install(p.targets, p.dir, p.source); }
  else if (command === "list") list(rest);
  else if (command === "doctor") doctor(rest);
  else if (command === "status") status(rest);
  else if (command === "diff") diff(rest);
  else if (command === "update") update(rest);
  else if (command === "remove") remove(rest);
  else throw new Error(`Unknown command: ${command}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
