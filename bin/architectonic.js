#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const VERSION = "0.0.7";
const args = process.argv.slice(2);
const [command, ...rest] = args;

const layerOrder = ["constitution", "doctrine", "identity", "project", "skills", "knowledge", "meta", "living-knowledge"];
const defaultBundle = ["constitution", "doctrine", "identity", "project", "skills", "knowledge", "meta"];
const layerAliases = {
  teleology: "doctrine",
};
const bundles = {
  constitution: defaultBundle,
  solo: defaultBundle,
  default: defaultBundle,
  knowledge-system: ["constitution", "doctrine", "knowledge", "meta", "living-knowledge"],
  agent: ["doctrine", "identity", "skills", "meta"],
  project: ["doctrine", "project", "skills", "knowledge", "meta"],
};
const supportedSet = new Set(layerOrder);
const repoBase = process.env.ARCHITECTONIC_SOURCE_BASE || "https://github.com/architectonic";
const npmBase = process.env.ARCHITECTONIC_NPM_BASE || "";
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

function printHelp() {
  console.log(`architectonic ${VERSION}

CLI for composing Architectonic layers.

Usage:
  npx architectonic
  npx architectonic help
  npx architectonic init [name]
  npx architectonic add constitution
  npx architectonic add <doctrine|identity|project|skills|knowledge|meta|living-knowledge>
  npx architectonic add doctrine identity skills
  npx architectonic add teleology        # deprecated alias for doctrine
  npx architectonic add skills --dir ./vendor
  npx architectonic add constitution --source npm
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
  agent             doctrine + identity + skills + meta
  project           doctrine + project + skills + knowledge + meta

Run vs install:
  npx architectonic ...        run immediately
  npm install architectonic    install in a project
  npm install -g architectonic install globally

What add does:
  Installs selected canonical source repositories from git or npm and records them in architectonic.json.

What init does:
  Creates a workspace root, writes README.md and AGENTS.md, then installs the constitution bundle.

What status and diff do:
  Inspect local drift from recorded sources without mutating anything.`);
}

function printUsageError(message) {
  throw new Error(`${message}\nRun \`architectonic help\` for usage.`);
}

function normalizeLayerName(name) {
  return layerAliases[name] || name;
}

function expandTarget(target) {
  const normalized = normalizeLayerName(target);
  if (bundles[normalized]) {
    return bundles[normalized];
  }
  return [normalized];
}

function normalizeTargets(targets) {
  const expanded = [];
  for (const target of targets) {
    expanded.push(...expandTarget(target));
  }
  const seen = new Set();
  return expanded.filter((layer) => {
    if (seen.has(layer)) return false;
    seen.add(layer);
    return true;
  });
}

function parseAddArgs(tokens) {
  const rawTargets = [];
  let installDir = process.cwd();
  let source = process.env.ARCHITECTONIC_ADD_SOURCE || "git";

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === "--dir" || token === "--out") {
      const next = tokens[index + 1];
      if (!next) throw new Error(`Missing value for ${token}`);
      installDir = path.resolve(next);
      index += 1;
      continue;
    }
    if (token.startsWith("--dir=")) {
      installDir = path.resolve(token.slice("--dir=".length));
      continue;
    }
    if (token.startsWith("--out=")) {
      installDir = path.resolve(token.slice("--out=".length));
      continue;
    }
    if (token === "--source") {
      const next = tokens[index + 1];
      if (!next) throw new Error("Missing value for --source");
      source = next;
      index += 1;
      continue;
    }
    if (token.startsWith("--source=")) {
      source = token.slice("--source=".length);
      continue;
    }
    if (token.startsWith("-")) throw new Error(`Unknown option: ${token}`);
    rawTargets.push(token);
  }

  return { targets: normalizeTargets(rawTargets), installDir, source };
}

function parseInitArgs(tokens) {
  let installDir = process.cwd();
  let source = process.env.ARCHITECTONIC_ADD_SOURCE || "git";
  let preset = "constitution";
  let workspaceName = "";

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === "--dir" || token === "--out") {
      const next = tokens[index + 1];
      if (!next) throw new Error(`Missing value for ${token}`);
      installDir = path.resolve(next);
      index += 1;
      continue;
    }
    if (token.startsWith("--dir=")) {
      installDir = path.resolve(token.slice("--dir=".length));
      continue;
    }
    if (token.startsWith("--out=")) {
      installDir = path.resolve(token.slice("--out=".length));
      continue;
    }
    if (token === "--source") {
      const next = tokens[index + 1];
      if (!next) throw new Error("Missing value for --source");
      source = next;
      index += 1;
      continue;
    }
    if (token.startsWith("--source=")) {
      source = token.slice("--source=".length);
      continue;
    }
    if (token === "--preset") {
      const next = tokens[index + 1];
      if (!next) throw new Error("Missing value for --preset");
      preset = normalizeLayerName(next);
      index += 1;
      continue;
    }
    if (token.startsWith("--preset=")) {
      preset = normalizeLayerName(token.slice("--preset=".length));
      continue;
    }
    if (token.startsWith("-")) throw new Error(`Unknown option: ${token}`);
    if (!workspaceName) {
      workspaceName = token;
      continue;
    }
    throw new Error(`Unexpected argument: ${token}`);
  }

  if (workspaceName) {
    installDir = path.resolve(installDir, workspaceName);
  }

  return { installDir, source, preset, workspaceName };
}

function parseSinglePathArgs(tokens) {
  let installDir = process.cwd();
  for (const token of tokens) {
    if (token.startsWith("-")) throw new Error(`Unknown option: ${token}`);
    installDir = path.resolve(token);
  }
  return { installDir };
}

function parseDoctorArgs(tokens) {
  let installDir = process.cwd();
  let fix = false;
  for (const token of tokens) {
    if (token === "--fix") {
      fix = true;
      continue;
    }
    if (token.startsWith("-")) throw new Error(`Unknown option: ${token}`);
    installDir = path.resolve(token);
  }
  return { installDir, fix };
}

function parseUpdateArgs(tokens) {
  let installDir = process.cwd();
  let dryRun = false;
  for (const token of tokens) {
    if (token === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (token.startsWith("-")) throw new Error(`Unknown option: ${token}`);
    installDir = path.resolve(token);
  }
  return { installDir, dryRun };
}

function parseTargetArgs(tokens, commandName) {
  let installDir = process.cwd();
  let target = "";
  let force = false;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === "--force") {
      force = true;
      continue;
    }
    if (token === "--dir" || token === "--out") {
      const next = tokens[index + 1];
      if (!next) throw new Error(`Missing value for ${token}`);
      installDir = path.resolve(next);
      index += 1;
      continue;
    }
    if (token.startsWith("--dir=")) {
      installDir = path.resolve(token.slice("--dir=".length));
      continue;
    }
    if (token.startsWith("--out=")) {
      installDir = path.resolve(token.slice("--out=".length));
      continue;
    }
    if (token.startsWith("-")) throw new Error(`Unknown option: ${token}`);
    if (!target) {
      target = normalizeLayerName(token);
      continue;
    }
    throw new Error(`Unexpected argument for ${commandName}: ${token}`);
  }
  return { installDir, target, force };
}

function ensureGitAvailable() {
  const result = spawnSync("git", ["--version"], { encoding: "utf8" });
  if (result.status !== 0) throw new Error("git is required on PATH for git source operations.");
}

function ensureNpmAvailable() {
  const result = spawnSync("npm", ["--version"], { encoding: "utf8", shell: true });
  if (result.status !== 0) throw new Error("npm is required on PATH for npm source operations.");
}

function ensureTarAvailable() {
  const result = spawnSync("tar", ["--version"], { encoding: "utf8" });
  if (result.status !== 0) throw new Error("tar is required on PATH for npm package extraction.");
}

function repoUrlFor(target) {
  const normalizedBase = repoBase.replace(/\\/g, "/");
  if (/^(?:[A-Za-z]:\/|\/|\.{1,2}\/)/.test(normalizedBase)) {
    return path.resolve(normalizedBase, target);
  }
  return `${normalizedBase}/${target}.git`;
}

function packageSpecFor(target) {
  const packageName = packageMap[target];
  if (!packageName) throw new Error(`No npm package mapping defined for ${target}`);
  if (!npmBase) return packageName;
  const normalizedBase = npmBase.replace(/\\/g, "/");
  if (/^(?:[A-Za-z]:\/|\/|\.{1,2}\/)/.test(normalizedBase)) {
    return path.resolve(normalizedBase, target);
  }
  return normalizedBase.endsWith("/") ? `${normalizedBase}${packageName}` : `${normalizedBase}/${packageName}`;
}

function targetPathFor(installDir, target) {
  return path.join(installDir, target);
}

function manifestPathFor(installDir) {
  return path.join(installDir, "architectonic.json");
}

function readManifest(manifestPath) {
  if (!fs.existsSync(manifestPath)) {
    return { schema_version: 1, installed_at: new Date().toISOString(), layers: {}, aliases: layerAliases };
  }
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function writeManifest(manifestPath, manifest) {
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function pathExists(filePath) {
  return fs.existsSync(filePath);
}

function relativeManifestPath(installDir, absolutePath) {
  return `./${path.relative(installDir, absolutePath).replace(/\\/g, "/")}`;
}

function readInstalledPackageName(layerPath) {
  const packageJsonPath = path.join(layerPath, "package.json");
  if (!fs.existsSync(packageJsonPath)) return null;
  try { return readJson(packageJsonPath).name || null; } catch { return null; }
}

function readInstalledVersion(layerPath) {
  const packageJsonPath = path.join(layerPath, "package.json");
  if (!fs.existsSync(packageJsonPath)) return null;
  try { return readJson(packageJsonPath).version || null; } catch { return null; }
}

function hasGitRepo(layerPath) {
  return pathExists(path.join(layerPath, ".git"));
}

function gitResult(args, cwd) {
  return spawnSync("git", args, { cwd, encoding: "utf8", stdio: "pipe" });
}

function ensureInstallPrereqs(source) {
  if (source === "git") return ensureGitAvailable();
  if (source === "npm") {
    ensureNpmAvailable();
    ensureTarAvailable();
    return;
  }
  throw new Error(`Unsupported source: ${source}. Use git or npm.`);
}

function updateManifestLayerRecord(manifest, installDir, layerName, absoluteLayerPath, source, refOverride = null) {
  manifest.layers[layerName] = {
    source,
    ref: refOverride ?? (source === "git" ? repoUrlFor(layerName) : packageSpecFor(layerName)),
    path: relativeManifestPath(installDir, absoluteLayerPath),
    installed_at: new Date().toISOString(),
    package_name: readInstalledPackageName(absoluteLayerPath),
  };
}

function cloneLayer(target, installDir) {
  const repoUrl = repoUrlFor(target);
  const targetPath = targetPathFor(installDir, target);
  if (fs.existsSync(targetPath)) throw new Error(`Target already exists: ${targetPath}`);
  const clone = spawnSync("git", ["clone", repoUrl, targetPath], { cwd: installDir, encoding: "utf8", stdio: "pipe" });
  if (clone.status !== 0) {
    const detail = (clone.stderr || clone.stdout || "").trim();
    throw new Error(`Failed to clone ${repoUrl}${detail ? `\n${detail}` : ""}`);
  }
  return { name: target, repo: repoUrl, path: targetPath, source: "git" };
}

function packNpmLayer(target, installDir) {
  const packageSpec = packageSpecFor(target);
  const targetPath = targetPathFor(installDir, target);
  const tempRoot = fs.mkdtempSync(path.join(installDir, "architectonic-npm-"));
  const pack = spawnSync("npm", ["pack", packageSpec, "--pack-destination", tempRoot], { cwd: installDir, encoding: "utf8", stdio: "pipe", shell: true });
  if (pack.status !== 0) {
    const detail = (pack.stderr || pack.stdout || "").trim();
    throw new Error(`Failed to pack ${packageSpec}${detail ? `\n${detail}` : ""}`);
  }
  const tgzName = (pack.stdout || "").trim().split(/\r?\n/).filter(Boolean).pop();
  if (!tgzName) throw new Error(`npm pack did not return a tarball name for ${packageSpec}`);
  const tgzPath = path.join(tempRoot, tgzName);
  if (!fs.existsSync(tgzPath)) throw new Error(`Packed tarball not found: ${tgzPath}`);
  if (fs.existsSync(targetPath)) throw new Error(`Target already exists: ${targetPath}`);
  fs.mkdirSync(targetPath, { recursive: true });
  const extract = spawnSync("tar", ["-xzf", tgzPath, "-C", targetPath], { cwd: installDir, encoding: "utf8", stdio: "pipe" });
  if (extract.status !== 0) {
    const detail = (extract.stderr || extract.stdout || "").trim();
    throw new Error(`Failed to extract ${tgzPath}${detail ? `\n${detail}` : ""}`);
  }
  const extractedPackageDir = path.join(targetPath, "package");
  if (!fs.existsSync(extractedPackageDir)) throw new Error(`Expected extracted package directory at ${extractedPackageDir}`);
  for (const entry of fs.readdirSync(extractedPackageDir, { withFileTypes: true })) {
    fs.renameSync(path.join(extractedPackageDir, entry.name), path.join(targetPath, entry.name));
  }
  fs.rmdirSync(extractedPackageDir);
  fs.rmSync(tempRoot, { recursive: true, force: true });
  return { name: target, repo: packageSpec, path: targetPath, source: "npm" };
}

function installLayer(target, installDir, source) {
  if (source === "git") return cloneLayer(target, installDir);
  if (source === "npm") return packNpmLayer(target, installDir);
  throw new Error(`Unsupported source: ${source}. Use git or npm.`);
}

function installTargets(targets, installDir, source) {
  ensureInstallPrereqs(source);
  fs.mkdirSync(installDir, { recursive: true });
  const invalid = targets.filter((target) => !supportedSet.has(target));
  if (invalid.length) throw new Error(`Unknown layer(s): ${invalid.join(", ")}\nSupported layers: ${layerOrder.join(", ")}`);

  const installed = [];
  for (const target of targets) {
    console.log(`Adding ${target} from ${source}...`);
    installed.push(installLayer(target, installDir, source));
  }

  const manifestPath = manifestPathFor(installDir);
  const manifest = readManifest(manifestPath);
  manifest.installed_at = new Date().toISOString();
  manifest.last_source = source;
  manifest.git_source_base = repoBase;
  manifest.npm_source_base = npmBase || "registry";
  manifest.aliases = layerAliases;

  for (const item of installed) updateManifestLayerRecord(manifest, installDir, item.name, item.path, item.source, item.repo);
  writeManifest(manifestPath, manifest);
  console.log("");
  console.log(`Installed ${installed.map((item) => item.name).join(", ")} into ${installDir}`);
  console.log(`Wrote ${manifestPath}`);
}

function loadManifestFromDir(installDir) {
  const manifestPath = manifestPathFor(installDir);
  if (!fs.existsSync(manifestPath)) throw new Error(`No architectonic.json found in ${installDir}`);
  return { manifestPath, manifest: readManifest(manifestPath) };
}

function addCommand(tokens) {
  const { targets, installDir, source } = parseAddArgs(tokens);
  const finalTargets = targets.length ? targets : defaultBundle;
  installTargets(finalTargets, installDir, source);
}

function resolvePreset(preset) {
  const normalized = normalizeLayerName(preset);
  const layers = bundles[normalized];
  if (!layers) throw new Error(`Unknown preset: ${preset}. Supported presets: ${Object.keys(bundles).join(", ")}`);
  return layers;
}

function writeInitFiles(installDir, workspaceName, layers) {
  const displayName = workspaceName || path.basename(installDir);
  const readmePath = path.join(installDir, "README.md");
  const agentsPath = path.join(installDir, "AGENTS.md");
  if (!pathExists(readmePath)) {
    fs.writeFileSync(readmePath, `# ${displayName}\n\nThis workspace was initialized by \`architectonic\`.\n\nInstalled layers:\n\n${layers.map((layer) => `- ${layer}`).join("\n")}\n`, "utf8");
  }
  if (!pathExists(agentsPath)) {
    fs.writeFileSync(agentsPath, `# Agent Instructions\n\nRead installed layers before making structural changes.\n\nPriority order:\n1. constitution\n2. doctrine\n3. identity\n4. project\n5. knowledge\n6. skills\n7. meta\n`, "utf8");
  }
}

function initCommand(tokens) {
  const { installDir, source, preset, workspaceName } = parseInitArgs(tokens);
  if (pathExists(installDir) && fs.readdirSync(installDir).length > 0) throw new Error(`Refusing to initialize into a non-empty directory: ${installDir}`);
  fs.mkdirSync(installDir, { recursive: true });
  const layers = resolvePreset(preset);
  writeInitFiles(installDir, workspaceName, layers);
  installTargets(layers, installDir, source);
}

function listCommand(tokens) {
  const installDir = tokens[0] ? path.resolve(tokens[0]) : process.cwd();
  const { manifest } = loadManifestFromDir(installDir);
  const entries = Object.entries(manifest.layers || {});
  if (!entries.length) return console.log("No layers installed.");
  for (const [name, layer] of entries) {
    console.log(`${name}`);
    console.log(`  source: ${layer.source || "unknown"}`);
    console.log(`  path:   ${layer.path || "unknown"}`);
    console.log(`  ref:    ${layer.ref || "unknown"}`);
    if (layer.package_name) console.log(`  pkg:    ${layer.package_name}`);
  }
}

function getGitBranch(layerPath) {
  const result = gitResult(["rev-parse", "--abbrev-ref", "HEAD"], layerPath);
  return result.status === 0 ? (result.stdout || "").trim() || null : null;
}

function getGitHead(layerPath) {
  const result = gitResult(["rev-parse", "HEAD"], layerPath);
  return result.status === 0 ? (result.stdout || "").trim() || null : null;
}

function getGitUpstream(layerPath) {
  const result = gitResult(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], layerPath);
  return result.status === 0 ? (result.stdout || "").trim() || null : null;
}

function getGitAheadBehind(layerPath) {
  const upstream = getGitUpstream(layerPath);
  if (!upstream) return null;
  const result = gitResult(["rev-list", "--left-right", "--count", `${upstream}...HEAD`], layerPath);
  if (result.status !== 0) return null;
  const [behindRaw, aheadRaw] = (result.stdout || "").trim().split(/\s+/);
  return { upstream, behind: Number.parseInt(behindRaw || "0", 10), ahead: Number.parseInt(aheadRaw || "0", 10) };
}

function getGitDiffSummary(layerPath) {
  const result = gitResult(["status", "--short"], layerPath);
  if (result.status !== 0) return null;
  const lines = (result.stdout || "").split(/\r?\n/).filter(Boolean);
  return { dirty: lines.length > 0, lines };
}

function isGitWorktreeDirty(layerPath) {
  const summary = getGitDiffSummary(layerPath);
  return summary ? summary.dirty : null;
}

function describeGitLayerState(layerPath) {
  const diffSummary = getGitDiffSummary(layerPath);
  return { branch: getGitBranch(layerPath), head: getGitHead(layerPath), dirty: diffSummary?.dirty ?? false, diffLines: diffSummary?.lines ?? [], aheadBehind: getGitAheadBehind(layerPath) };
}

function getNpmPublishedVersion(packageSpec) {
  const result = spawnSync("npm", ["view", packageSpec, "version"], { encoding: "utf8", stdio: "pipe", shell: true });
  return result.status === 0 ? (result.stdout || "").trim() || null : null;
}

function describeNpmLayerState(layerName, layerPath) {
  const installedVersion = readInstalledVersion(layerPath);
  const publishedVersion = getNpmPublishedVersion(packageSpecFor(layerName));
  return { installedVersion, publishedVersion, outdated: Boolean(installedVersion && publishedVersion && installedVersion !== publishedVersion) };
}

function statusCommand(tokens) {
  const { installDir } = parseSinglePathArgs(tokens);
  const { manifest } = loadManifestFromDir(installDir);
  const entries = Object.entries(manifest.layers || {});
  if (!entries.length) return console.log("No layers installed.");
  ensureGitAvailable();
  ensureNpmAvailable();
  console.log(`architectonic status`);
  console.log(`  root: ${installDir}`);
  for (const [name, layer] of entries) {
    const layerPath = path.resolve(installDir, String(layer.path || ""));
    if (!pathExists(layerPath)) {
      console.log(`  [missing] ${name}: ${layer.path || "unknown path"}`);
      continue;
    }
    if (layer.source === "git") {
      const state = describeGitLayerState(layerPath);
      const relation = state.aheadBehind ? `ahead ${state.aheadBehind.ahead}, behind ${state.aheadBehind.behind}` : "no-upstream";
      console.log(`  [git] ${name}: ${state.branch || "detached"}, ${state.dirty ? "dirty" : "clean"}, ${relation}`);
      continue;
    }
    if (layer.source === "npm") {
      const state = describeNpmLayerState(name, layerPath);
      console.log(`  [npm] ${name}: installed ${state.installedVersion || "unknown"}, published ${state.publishedVersion || "unknown"}, ${state.outdated ? "outdated" : "current-or-unknown"}`);
      continue;
    }
    console.log(`  [unknown] ${name}: unsupported source ${layer.source || "unknown"}`);
  }
}

function doctorCommand(tokens) {
  const { installDir, fix } = parseDoctorArgs(tokens);
  const { manifestPath, manifest } = loadManifestFromDir(installDir);
  const entries = Object.entries(manifest.layers || {});
  let failures = 0;
  let changed = false;
  console.log(`architectonic doctor`);
  console.log(`  root: ${installDir}`);
  console.log(`  manifest: ${manifestPath}`);
  if (!entries.length) {
    console.log(`  [fail] no installed layers recorded`);
    process.exit(1);
  }
  for (const [rawName, layer] of entries) {
    const name = normalizeLayerName(rawName);
    const layerPath = path.resolve(installDir, String(layer.path || `./${name}`));
    const packageJsonPath = path.join(layerPath, "package.json");
    const exists = fs.existsSync(layerPath);
    const hasPackageJson = fs.existsSync(packageJsonPath);
    const packageName = hasPackageJson ? readInstalledPackageName(layerPath) : null;
    const expectedPackageName = packageMap[name];
    if (!exists) {
      console.log(`  [fail] ${name}: missing directory ${layerPath}`);
      failures += 1;
      continue;
    }
    if (!hasPackageJson) {
      console.log(`  [fail] ${name}: missing package.json`);
      failures += 1;
      continue;
    }
    if (packageName && expectedPackageName && packageName !== expectedPackageName) {
      console.log(`  [fail] ${name}: expected package ${expectedPackageName}, found ${packageName}`);
      failures += 1;
      continue;
    }
    if (fix) {
      const normalizedPath = relativeManifestPath(installDir, layerPath);
      if (manifest.layers[rawName].path !== normalizedPath || manifest.layers[rawName].package_name !== packageName) {
        manifest.layers[rawName].path = normalizedPath;
        manifest.layers[rawName].package_name = packageName;
        changed = true;
      }
    }
    console.log(`  [ok] ${name}: ${layer.path || `./${name}`} (${layer.source || "unknown"})`);
  }
  if (fix && changed) {
    writeManifest(manifestPath, manifest);
    console.log(`  [write] updated manifest repairs`);
  }
  if (failures > 0) process.exit(1);
}

function updateGitLayer(layerPath, dryRun) {
  if (!hasGitRepo(layerPath)) return { status: "skip", detail: "not a git repository" };
  const dirty = isGitWorktreeDirty(layerPath);
  if (dirty === null) return { status: "skip", detail: "unable to inspect git status" };
  if (dirty) return { status: "skip", detail: "local changes detected; preserving fork" };
  if (dryRun) return { status: "plan", detail: "would run git pull --ff-only" };
  const result = gitResult(["pull", "--ff-only"], layerPath);
  if (result.status !== 0) return { status: "fail", detail: (result.stderr || result.stdout || "").trim() || "git pull failed" };
  return { status: "ok", detail: (result.stdout || "").trim() || "up to date" };
}

function updateNpmLayer(layerName, layerPath) {
  const installedVersion = readInstalledVersion(layerPath);
  const latestVersion = getNpmPublishedVersion(packageSpecFor(layerName));
  if (!latestVersion) return { status: "skip", detail: "unable to resolve latest npm version" };
  if (!installedVersion) return { status: "skip", detail: `latest ${latestVersion} available; local version unknown` };
  if (installedVersion === latestVersion) return { status: "ok", detail: `already at ${installedVersion}` };
  return { status: "skip", detail: `newer package ${latestVersion} available; skipped to preserve local fork (${installedVersion} installed)` };
}

function updateCommand(tokens) {
  const { installDir, dryRun } = parseUpdateArgs(tokens);
  const { manifestPath, manifest } = loadManifestFromDir(installDir);
  const entries = Object.entries(manifest.layers || {});
  if (!entries.length) throw new Error("No installed layers recorded.");
  ensureGitAvailable();
  ensureNpmAvailable();
  let changed = false;
  console.log(`architectonic update${dryRun ? " --dry-run" : ""}`);
  console.log(`  root: ${installDir}`);
  for (const [rawName, layer] of entries) {
    const name = normalizeLayerName(rawName);
    const layerPath = path.resolve(installDir, String(layer.path || ""));
    if (!pathExists(layerPath)) {
      console.log(`  [skip] ${name}: missing directory`);
      continue;
    }
    const outcome = layer.source === "git" ? updateGitLayer(layerPath, dryRun) : layer.source === "npm" ? updateNpmLayer(name, layerPath) : { status: "skip", detail: `unsupported source ${layer.source || "unknown"}` };
    console.log(`  [${outcome.status}] ${name}: ${outcome.detail}`);
    if (outcome.status === "ok" && !dryRun) {
      manifest.layers[rawName].installed_at = new Date().toISOString();
      manifest.layers[rawName].package_name = readInstalledPackageName(layerPath);
      changed = true;
    }
  }
  if (changed) {
    writeManifest(manifestPath, manifest);
    console.log(`  [write] refreshed manifest timestamps`);
  }
}

function removeCommand(tokens) {
  const { installDir, target, force } = parseTargetArgs(tokens, "remove");
  if (!target) throw new Error("Specify a layer to remove.");
  if (!supportedSet.has(target)) throw new Error(`Unknown layer: ${target}`);
  const { manifestPath, manifest } = loadManifestFromDir(installDir);
  const layer = manifest.layers[target];
  if (!layer) throw new Error(`Layer not recorded in manifest: ${target}`);
  const layerPath = path.resolve(installDir, String(layer.path || ""));
  if (pathExists(layerPath) && hasGitRepo(layerPath) && !force) {
    const dirty = isGitWorktreeDirty(layerPath);
    if (dirty) throw new Error(`Refusing to remove ${target}: local git changes detected. Re-run with --force if you really want to delete it.`);
  }
  if (pathExists(layerPath)) fs.rmSync(layerPath, { recursive: true, force: true });
  delete manifest.layers[target];
  writeManifest(manifestPath, manifest);
  console.log(`Removed ${target}`);
  console.log(`Updated ${manifestPath}`);
}

function diffCommand(tokens) {
  const { installDir, target } = parseTargetArgs(tokens, "diff");
  if (!target) throw new Error("Specify a layer to diff.");
  if (!supportedSet.has(target)) throw new Error(`Unknown layer: ${target}`);
  const { manifest } = loadManifestFromDir(installDir);
  const layer = manifest.layers[target];
  if (!layer) throw new Error(`Layer not recorded in manifest: ${target}`);
  const layerPath = path.resolve(installDir, String(layer.path || ""));
  if (!pathExists(layerPath)) throw new Error(`Layer path does not exist: ${layerPath}`);
  if (layer.source === "git") {
    ensureGitAvailable();
    const summary = getGitDiffSummary(layerPath);
    const aheadBehind = getGitAheadBehind(layerPath);
    console.log(`architectonic diff ${target}`);
    console.log(`  source: git`);
    console.log(`  path: ${layerPath}`);
    if (aheadBehind) {
      console.log(`  upstream: ${aheadBehind.upstream}`);
      console.log(`  ahead: ${aheadBehind.ahead}`);
      console.log(`  behind: ${aheadBehind.behind}`);
    }
    if (!summary || !summary.lines.length) return console.log(`  local changes: none`);
    console.log(`  local changes:`);
    for (const line of summary.lines) console.log(`    ${line}`);
    return;
  }
  if (layer.source === "npm") {
    ensureNpmAvailable();
    const state = describeNpmLayerState(target, layerPath);
    console.log(`architectonic diff ${target}`);
    console.log(`  source: npm`);
    console.log(`  path: ${layerPath}`);
    console.log(`  installed version: ${state.installedVersion || "unknown"}`);
    console.log(`  published version: ${state.publishedVersion || "unknown"}`);
    console.log(`  drift: ${state.outdated ? "newer package available" : "none detected from package version"}`);
    return;
  }
  throw new Error(`Unsupported source for diff: ${layer.source || "unknown"}`);
}

try {
  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    process.exit(0);
  }
  if (command === "init") {
    initCommand(rest);
    process.exit(0);
  }
  if (command === "add") {
    addCommand(rest);
    process.exit(0);
  }
  if (command === "list") {
    listCommand(rest);
    process.exit(0);
  }
  if (command === "doctor") {
    doctorCommand(rest);
    process.exit(0);
  }
  if (command === "status") {
    statusCommand(rest);
    process.exit(0);
  }
  if (command === "diff") {
    diffCommand(rest);
    process.exit(0);
  }
  if (command === "update") {
    updateCommand(rest);
    process.exit(0);
  }
  if (command === "remove") {
    removeCommand(rest);
    process.exit(0);
  }
  printUsageError(`Unknown command: ${command}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
