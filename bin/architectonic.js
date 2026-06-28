#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const VERSION = "0.0.7";
const args = process.argv.slice(2);
const [command, ...rest] = args;

const layers = ["constitution", "doctrine", "identity", "project", "skills", "knowledge", "meta", "living-knowledge"];
const coreConstitution = ["constitution", "doctrine", "identity", "project", "skills", "knowledge", "meta"];
const aliases = { teleology: "doctrine" };
const bundles = {
  constitution: coreConstitution,
  solo: coreConstitution,
  default: coreConstitution,
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
const supported = new Set(layers);
const repoBase = process.env.ARCHITECTONIC_SOURCE_BASE || "https://github.com/architectonic";
const npmBase = process.env.ARCHITECTONIC_NPM_BASE || "";

function help() {
  console.log(`architectonic ${VERSION}

CLI for composing Architectonic layers.

Usage:
  npx architectonic init [name]
  npx architectonic add constitution
  npx architectonic add <doctrine|identity|project|skills|knowledge|meta|living-knowledge>
  npx architectonic add teleology        # deprecated alias for doctrine
  npx architectonic add knowledge-system
  npx architectonic list
  npx architectonic doctor
  npx architectonic doctor --fix
  npx architectonic status
  npx architectonic diff <layer>
  npx architectonic update
  npx architectonic remove <layer>

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
  project-system    doctrine + project + skills + knowledge + meta

Sources:
  --source git      clone from GitHub or ARCHITECTONIC_SOURCE_BASE
  --source npm      pack from npm or ARCHITECTONIC_NPM_BASE`);
}

function normalize(name) {
  return aliases[name] || name;
}

function expand(name) {
  const normalized = normalize(name);
  if (normalized === "constitution") return bundles.constitution;
  if (bundles[normalized]) return bundles[normalized];
  return [normalized];
}

function expandTargets(targets) {
  const expanded = targets.length ? targets.flatMap(expand) : coreConstitution;
  const seen = new Set();
  return expanded.filter((item) => {
    if (seen.has(item)) return false;
    seen.add(item);
    return true;
  });
}

function parseCommon(tokens) {
  const targets = [];
  let dir = process.cwd();
  let source = process.env.ARCHITECTONIC_ADD_SOURCE || "git";
  let force = false;
  let dryRun = false;
  let preset = "constitution";

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === "--force") { force = true; continue; }
    if (token === "--dry-run") { dryRun = true; continue; }
    if (token === "--dir" || token === "--out") {
      const next = tokens[++i];
      if (!next) throw new Error(`Missing value for ${token}`);
      dir = path.resolve(next);
      continue;
    }
    if (token.startsWith("--dir=") || token.startsWith("--out=")) {
      dir = path.resolve(token.split("=").slice(1).join("="));
      continue;
    }
    if (token === "--source") {
      const next = tokens[++i];
      if (!next) throw new Error("Missing value for --source");
      source = next;
      continue;
    }
    if (token.startsWith("--source=")) { source = token.slice("--source=".length); continue; }
    if (token === "--preset") {
      const next = tokens[++i];
      if (!next) throw new Error("Missing value for --preset");
      preset = next;
      continue;
    }
    if (token.startsWith("--preset=")) { preset = token.slice("--preset=".length); continue; }
    if (token.startsWith("-")) throw new Error(`Unknown option: ${token}`);
    targets.push(token);
  }
  return { targets, dir, source, force, dryRun, preset };
}

function ensure(cmd, message) {
  const result = spawnSync(cmd, ["--version"], { encoding: "utf8", shell: process.platform === "win32" });
  if (result.status !== 0) throw new Error(message);
}

function ensureSource(source) {
  if (source === "git") return ensure("git", "git is required on PATH for --source git.");
  if (source === "npm") {
    ensure("npm", "npm is required on PATH for --source npm.");
    ensure("tar", "tar is required on PATH for --source npm.");
    return;
  }
  throw new Error(`Unsupported source: ${source}. Use git or npm.`);
}

function repoUrl(layer) {
  const base = repoBase.replace(/\\/g, "/");
  if (/^(?:[A-Za-z]:\/|\/|\.{1,2}\/)/.test(base)) return path.resolve(base, layer);
  return `${base}/${layer}.git`;
}

function packageSpec(layer) {
  const pkg = packageMap[layer];
  if (!pkg) throw new Error(`No npm package mapping for ${layer}`);
  if (!npmBase) return pkg;
  const base = npmBase.replace(/\\/g, "/");
  if (/^(?:[A-Za-z]:\/|\/|\.{1,2}\/)/.test(base)) return path.resolve(base, layer);
  return base.endsWith("/") ? `${base}${pkg}` : `${base}/${pkg}`;
}

function manifestPath(dir) { return path.join(dir, "architectonic.json"); }
function layerPath(dir, layer) { return path.join(dir, layer); }
function exists(p) { return fs.existsSync(p); }
function readJson(p) { return JSON.parse(fs.readFileSync(p, "utf8")); }
function readManifest(dir) {
  const p = manifestPath(dir);
  if (!exists(p)) return { schema_version: 1, installed_at: new Date().toISOString(), aliases, layers: {} };
  return readJson(p);
}
function writeManifest(dir, manifest) {
  fs.writeFileSync(manifestPath(dir), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}
function rel(root, p) { return `./${path.relative(root, p).replace(/\\/g, "/")}`; }
function packageName(p) {
  const packagePath = path.join(p, "package.json");
  if (!exists(packagePath)) return null;
  try { return readJson(packagePath).name || null; } catch { return null; }
}
function packageVersion(p) {
  const packagePath = path.join(p, "package.json");
  if (!exists(packagePath)) return null;
  try { return readJson(packagePath).version || null; } catch { return null; }
}

function cloneLayer(layer, dir) {
  const to = layerPath(dir, layer);
  if (exists(to)) throw new Error(`Target already exists: ${to}`);
  const url = repoUrl(layer);
  const result = spawnSync("git", ["clone", url, to], { cwd: dir, encoding: "utf8", stdio: "pipe" });
  if (result.status !== 0) throw new Error(`Failed to clone ${url}\n${(result.stderr || result.stdout || "").trim()}`);
  return { layer, ref: url, path: to, source: "git" };
}

function packLayer(layer, dir) {
  const to = layerPath(dir, layer);
  if (exists(to)) throw new Error(`Target already exists: ${to}`);
  const temp = fs.mkdtempSync(path.join(dir, "architectonic-npm-"));
  const spec = packageSpec(layer);
  const pack = spawnSync("npm", ["pack", spec, "--pack-destination", temp], { cwd: dir, encoding: "utf8", stdio: "pipe", shell: true });
  if (pack.status !== 0) throw new Error(`Failed to pack ${spec}\n${(pack.stderr || pack.stdout || "").trim()}`);
  const tgz = (pack.stdout || "").trim().split(/\r?\n/).filter(Boolean).pop();
  if (!tgz) throw new Error(`npm pack did not return a tarball for ${spec}`);
  fs.mkdirSync(to, { recursive: true });
  const extract = spawnSync("tar", ["-xzf", path.join(temp, tgz), "-C", to], { cwd: dir, encoding: "utf8", stdio: "pipe" });
  if (extract.status !== 0) throw new Error(`Failed to extract ${tgz}\n${(extract.stderr || extract.stdout || "").trim()}`);
  const packageDir = path.join(to, "package");
  if (!exists(packageDir)) throw new Error(`Expected extracted package directory: ${packageDir}`);
  for (const entry of fs.readdirSync(packageDir, { withFileTypes: true })) fs.renameSync(path.join(packageDir, entry.name), path.join(to, entry.name));
  fs.rmdirSync(packageDir);
  fs.rmSync(temp, { recursive: true, force: true });
  return { layer, ref: spec, path: to, source: "npm" };
}

function install(targets, dir, source) {
  const finalTargets = expandTargets(targets);
  const invalid = finalTargets.filter((layer) => !supported.has(layer));
  if (invalid.length) throw new Error(`Unknown layer(s): ${invalid.join(", ")}`);
  ensureSource(source);
  fs.mkdirSync(dir, { recursive: true });
  const manifest = readManifest(dir);
  manifest.installed_at = new Date().toISOString();
  manifest.last_source = source;
  manifest.git_source_base = repoBase;
  manifest.npm_source_base = npmBase || "registry";
  manifest.aliases = aliases;
  const installed = [];
  for (const layer of finalTargets) {
    console.log(`Adding ${layer} from ${source}...`);
    const item = source === "git" ? cloneLayer(layer, dir) : packLayer(layer, dir);
    installed.push(item.layer);
    manifest.layers[layer] = { source: item.source, ref: item.ref, path: rel(dir, item.path), installed_at: new Date().toISOString(), package_name: packageName(item.path) };
  }
  writeManifest(dir, manifest);
  console.log(`Installed ${installed.join(", ")} into ${dir}`);
  console.log(`Wrote ${manifestPath(dir)}`);
}

function init(tokens) {
  const parsed = parseCommon(tokens);
  const name = parsed.targets.find((t) => !bundles[t] && !supported.has(normalize(t)));
  let dir = parsed.dir;
  if (name) dir = path.resolve(dir, name);
  if (exists(dir) && fs.readdirSync(dir).length > 0) throw new Error(`Refusing to initialize into a non-empty directory: ${dir}`);
  fs.mkdirSync(dir, { recursive: true });
  const selected = expandTargets([parsed.preset || "constitution"]);
  fs.writeFileSync(path.join(dir, "README.md"), `# ${name || path.basename(dir)}\n\nInitialized by \`architectonic\`.\n\nInstalled layers:\n\n${selected.map((l) => `- ${l}`).join("\n")}\n`, "utf8");
  fs.writeFileSync(path.join(dir, "AGENTS.md"), `# Agent Instructions\n\nRead installed layers before making structural changes.\n\nPriority order:\n1. constitution\n2. doctrine\n3. identity\n4. project\n5. knowledge\n6. skills\n7. meta\n`, "utf8");
  install(selected, dir, parsed.source);
}

function load(dir) {
  const p = manifestPath(dir);
  if (!exists(p)) throw new Error(`No architectonic.json found in ${dir}`);
  return readJson(p);
}

function list(tokens) {
  const { dir } = parseCommon(tokens);
  const manifest = load(dir);
  for (const [layer, item] of Object.entries(manifest.layers || {})) {
    console.log(`${layer}`);
    console.log(`  source: ${item.source || "unknown"}`);
    console.log(`  path:   ${item.path || "unknown"}`);
    console.log(`  ref:    ${item.ref || "unknown"}`);
    if (item.package_name) console.log(`  pkg:    ${item.package_name}`);
  }
}

function git(cwd, gitArgs) { return spawnSync("git", gitArgs, { cwd, encoding: "utf8", stdio: "pipe" }); }
function gitDirty(p) { const r = git(p, ["status", "--short"]); return r.status === 0 ? (r.stdout || "").trim() : null; }
function gitBranch(p) { const r = git(p, ["rev-parse", "--abbrev-ref", "HEAD"]); return r.status === 0 ? (r.stdout || "").trim() : null; }

function doctor(tokens) {
  const { dir, force } = parseCommon(tokens);
  const manifest = load(dir);
  let failed = 0;
  for (const [rawLayer, item] of Object.entries(manifest.layers || {})) {
    const layer = normalize(rawLayer);
    const p = path.resolve(dir, item.path || `./${layer}`);
    if (!exists(p)) { console.log(`  [fail] ${layer}: missing directory`); failed++; continue; }
    if (!exists(path.join(p, "package.json"))) { console.log(`  [fail] ${layer}: missing package.json`); failed++; continue; }
    const expected = packageMap[layer];
    const found = packageName(p);
    if (expected && found !== expected) { console.log(`  [fail] ${layer}: expected ${expected}, found ${found}`); failed++; continue; }
    if (force) {
      item.path = rel(dir, p);
      item.package_name = found;
    }
    console.log(`  [ok] ${layer}: ${item.path}`);
  }
  if (force) writeManifest(dir, manifest);
  if (failed) process.exit(1);
}

function status(tokens) {
  const { dir } = parseCommon(tokens);
  ensureSource("git");
  ensure("npm", "npm is required on PATH for npm status checks.");
  const manifest = load(dir);
  console.log(`architectonic status\n  root: ${dir}`);
  for (const [rawLayer, item] of Object.entries(manifest.layers || {})) {
    const layer = normalize(rawLayer);
    const p = path.resolve(dir, item.path || `./${layer}`);
    if (!exists(p)) { console.log(`  [missing] ${layer}`); continue; }
    if (item.source === "git") console.log(`  [git] ${layer}: ${gitBranch(p) || "unknown"}, ${gitDirty(p) ? "dirty" : "clean"}`);
    else console.log(`  [npm] ${layer}: installed ${packageVersion(p) || "unknown"}`);
  }
}

function diff(tokens) {
  const parsed = parseCommon(tokens);
  const target = normalize(parsed.targets[0] || "");
  if (!target) throw new Error("Specify a layer to diff.");
  const manifest = load(parsed.dir);
  const item = manifest.layers[target];
  if (!item) throw new Error(`Layer not recorded in manifest: ${target}`);
  const p = path.resolve(parsed.dir, item.path || `./${target}`);
  if (!exists(p)) throw new Error(`Layer path does not exist: ${p}`);
  if (item.source === "git") {
    const changed = gitDirty(p);
    console.log(`architectonic diff ${target}`);
    if (!changed) console.log("  local changes: none");
    else console.log(changed.split(/\r?\n/).map((line) => `  ${line}`).join("\n"));
    return;
  }
  console.log(`architectonic diff ${target}\n  installed version: ${packageVersion(p) || "unknown"}`);
}

function update(tokens) {
  const parsed = parseCommon(tokens);
  const manifest = load(parsed.dir);
  ensureSource("git");
  ensure("npm", "npm is required on PATH for npm update checks.");
  for (const [rawLayer, item] of Object.entries(manifest.layers || {})) {
    const layer = normalize(rawLayer);
    const p = path.resolve(parsed.dir, item.path || `./${layer}`);
    if (!exists(p)) { console.log(`  [skip] ${layer}: missing`); continue; }
    if (item.source !== "git") { console.log(`  [skip] ${layer}: npm update is non-mutating for now`); continue; }
    if (gitDirty(p)) { console.log(`  [skip] ${layer}: local changes detected`); continue; }
    if (parsed.dryRun) { console.log(`  [plan] ${layer}: would git pull --ff-only`); continue; }
    const r = git(p, ["pull", "--ff-only"]);
    console.log(`  [${r.status === 0 ? "ok" : "fail"}] ${layer}: ${(r.stdout || r.stderr || "").trim()}`);
  }
}

function remove(tokens) {
  const parsed = parseCommon(tokens);
  const target = normalize(parsed.targets[0] || "");
  if (!target) throw new Error("Specify a layer to remove.");
  const manifest = load(parsed.dir);
  const item = manifest.layers[target];
  if (!item) throw new Error(`Layer not recorded in manifest: ${target}`);
  const p = path.resolve(parsed.dir, item.path || `./${target}`);
  if (exists(p) && exists(path.join(p, ".git")) && gitDirty(p) && !parsed.force) throw new Error(`Refusing to remove ${target}: local git changes detected. Use --force to delete.`);
  if (exists(p)) fs.rmSync(p, { recursive: true, force: true });
  delete manifest.layers[target];
  writeManifest(parsed.dir, manifest);
  console.log(`Removed ${target}`);
}

try {
  if (!command || ["help", "--help", "-h"].includes(command)) { help(); process.exit(0); }
  if (command === "init") { init(rest); process.exit(0); }
  if (command === "add") { const p = parseCommon(rest); install(p.targets, p.dir, p.source); process.exit(0); }
  if (command === "list") { list(rest); process.exit(0); }
  if (command === "doctor") { doctor(rest); process.exit(0); }
  if (command === "status") { status(rest); process.exit(0); }
  if (command === "diff") { diff(rest); process.exit(0); }
  if (command === "update") { update(rest); process.exit(0); }
  if (command === "remove") { remove(rest); process.exit(0); }
  throw new Error(`Unknown command: ${command}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
