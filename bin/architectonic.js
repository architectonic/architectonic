#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const VERSION = "0.0.6";
const args = process.argv.slice(2);
const [command, ...rest] = args;
const supported = ["teleology", "identity", "project", "skills"];
const supportedSet = new Set(supported);
const repoBase = process.env.ARCHITECTONIC_SOURCE_BASE || "https://github.com/architectonic";
const npmBase = process.env.ARCHITECTONIC_NPM_BASE || "";
const packageMap = {
  teleology: "teleology",
  identity: "architectonic-identity",
  project: "architectonic-project",
  skills: "architectonic-skills",
};

function printHelp() {
  console.log(`architectonic ${VERSION}

CLI for composing the core layers of an agentic system.

Usage:
  npx architectonic
  npx architectonic help
  npx architectonic add <teleology|identity|project|skills>
  npx architectonic add teleology identity skills
  npx architectonic add skills --dir ./vendor
  npx architectonic add teleology --source npm
  npx architectonic init [name]
  npx architectonic list
  npx architectonic doctor
  npx architectonic doctor --fix
  npx architectonic status
  npx architectonic diff <layer>
  npx architectonic update
  npx architectonic remove <layer>

Layers:
  teleology  purpose, principles, doctrine, governance
  identity   actors, roles, authority, boundaries
  project    operating context for a concrete initiative
  skills     reusable procedures and capabilities

Run vs install:
  npx architectonic ...        run immediately
  npm install architectonic    install in a project
  npm install -g architectonic install globally

What add does:
  Installs the selected layer repositories into the target directory
  from git or npm sources and records them in architectonic.json.

What status and diff do:
  Inspect local drift from recorded sources without mutating anything.`);
}

function printUsageError(message) {
  throw new Error(`${message}\nRun \`architectonic help\` for usage.`);
}

function parseAddArgs(tokens) {
  const targets = [];
  let installDir = process.cwd();
  let source = process.env.ARCHITECTONIC_ADD_SOURCE || "git";

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === "--dir" || token === "--out") {
      const next = tokens[index + 1];
      if (!next) {
        throw new Error(`Missing value for ${token}`);
      }
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
      if (!next) {
        throw new Error("Missing value for --source");
      }
      source = next;
      index += 1;
      continue;
    }
    if (token.startsWith("--source=")) {
      source = token.slice("--source=".length);
      continue;
    }
    if (token.startsWith("-")) {
      throw new Error(`Unknown option: ${token}`);
    }
    targets.push(token);
  }

  return { targets, installDir, source };
}

function parseInitArgs(tokens) {
  let installDir = process.cwd();
  let source = process.env.ARCHITECTONIC_ADD_SOURCE || "git";
  let preset = "solo";
  let workspaceName = "";

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === "--dir" || token === "--out") {
      const next = tokens[index + 1];
      if (!next) {
        throw new Error(`Missing value for ${token}`);
      }
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
      if (!next) {
        throw new Error("Missing value for --source");
      }
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
      if (!next) {
        throw new Error("Missing value for --preset");
      }
      preset = next;
      index += 1;
      continue;
    }
    if (token.startsWith("--preset=")) {
      preset = token.slice("--preset=".length);
      continue;
    }
    if (token.startsWith("-")) {
      throw new Error(`Unknown option: ${token}`);
    }
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

function parseDoctorArgs(tokens) {
  let installDir = process.cwd();
  let fix = false;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === "--fix") {
      fix = true;
      continue;
    }
    if (token.startsWith("-")) {
      throw new Error(`Unknown option: ${token}`);
    }
    installDir = path.resolve(token);
  }

  return { installDir, fix };
}

function parseUpdateArgs(tokens) {
  let installDir = process.cwd();
  let dryRun = false;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (token.startsWith("-")) {
      throw new Error(`Unknown option: ${token}`);
    }
    installDir = path.resolve(token);
  }

  return { installDir, dryRun };
}

function parseStatusArgs(tokens) {
  let installDir = process.cwd();

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.startsWith("-")) {
      throw new Error(`Unknown option: ${token}`);
    }
    installDir = path.resolve(token);
  }

  return { installDir };
}

function parseDiffArgs(tokens) {
  let installDir = process.cwd();
  let target = "";

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === "--dir" || token === "--out") {
      const next = tokens[index + 1];
      if (!next) {
        throw new Error(`Missing value for ${token}`);
      }
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
    if (token.startsWith("-")) {
      throw new Error(`Unknown option: ${token}`);
    }
    if (!target) {
      target = token;
      continue;
    }
    throw new Error(`Unexpected argument: ${token}`);
  }

  return { installDir, target };
}

function parseRemoveArgs(tokens) {
  let installDir = process.cwd();
  let force = false;
  let target = "";

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === "--force") {
      force = true;
      continue;
    }
    if (token === "--dir" || token === "--out") {
      const next = tokens[index + 1];
      if (!next) {
        throw new Error(`Missing value for ${token}`);
      }
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
    if (token.startsWith("-")) {
      throw new Error(`Unknown option: ${token}`);
    }
    if (!target) {
      target = token;
      continue;
    }
    throw new Error(`Unexpected argument: ${token}`);
  }

  return { installDir, force, target };
}

function ensureGitAvailable() {
  const result = spawnSync("git", ["--version"], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error("git is required on PATH for `architectonic add`.");
  }
}

function ensureNpmAvailable() {
  const result = spawnSync("npm", ["--version"], { encoding: "utf8", shell: true });
  if (result.status !== 0) {
    throw new Error("npm is required on PATH for `architectonic add --source npm`.");
  }
}

function ensureTarAvailable() {
  const result = spawnSync("tar", ["--version"], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error("tar is required on PATH for npm package extraction.");
  }
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
  if (!packageName) {
    throw new Error(`No npm package mapping defined for ${target}`);
  }
  if (!npmBase) {
    return packageName;
  }
  const normalizedBase = npmBase.replace(/\\/g, "/");
  if (/^(?:[A-Za-z]:\/|\/|\.{1,2}\/)/.test(normalizedBase)) {
    return path.resolve(normalizedBase, target);
  }
  return normalizedBase.endsWith("/")
    ? `${normalizedBase}${packageName}`
    : `${normalizedBase}/${packageName}`;
}

function targetPathFor(installDir, target) {
  return path.join(installDir, target);
}

function manifestPathFor(installDir) {
  return path.join(installDir, "architectonic.json");
}

function readManifest(manifestPath) {
  if (!fs.existsSync(manifestPath)) {
    return {
      schema_version: 1,
      installed_at: new Date().toISOString(),
      layers: {},
    };
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

function cloneLayer(target, installDir) {
  const repoUrl = repoUrlFor(target);
  const targetPath = targetPathFor(installDir, target);

  if (fs.existsSync(targetPath)) {
    throw new Error(`Target already exists: ${targetPath}`);
  }

  const clone = spawnSync("git", ["clone", repoUrl, targetPath], {
    cwd: installDir,
    encoding: "utf8",
    stdio: "pipe",
  });

  if (clone.status !== 0) {
    const detail = (clone.stderr || clone.stdout || "").trim();
    throw new Error(`Failed to clone ${repoUrl}${detail ? `\n${detail}` : ""}`);
  }

  return {
    name: target,
    repo: repoUrl,
    path: targetPath,
    source: "git",
  };
}

function packNpmLayer(target, installDir) {
  const packageSpec = packageSpecFor(target);
  const targetPath = targetPathFor(installDir, target);
  const tempRoot = fs.mkdtempSync(path.join(installDir, "architectonic-npm-"));
  const pack = spawnSync("npm", ["pack", packageSpec, "--pack-destination", tempRoot], {
    cwd: installDir,
    encoding: "utf8",
    stdio: "pipe",
    shell: true,
  });

  if (pack.status !== 0) {
    const detail = (pack.stderr || pack.stdout || "").trim();
    throw new Error(`Failed to pack ${packageSpec}${detail ? `\n${detail}` : ""}`);
  }

  const tgzName = (pack.stdout || "").trim().split(/\r?\n/).filter(Boolean).pop();
  if (!tgzName) {
    throw new Error(`npm pack did not return a tarball name for ${packageSpec}`);
  }

  const tgzPath = path.join(tempRoot, tgzName);
  if (!fs.existsSync(tgzPath)) {
    throw new Error(`Packed tarball not found: ${tgzPath}`);
  }

  if (fs.existsSync(targetPath)) {
    throw new Error(`Target already exists: ${targetPath}`);
  }

  fs.mkdirSync(targetPath, { recursive: true });
  const extract = spawnSync("tar", ["-xzf", tgzPath, "-C", targetPath], {
    cwd: installDir,
    encoding: "utf8",
    stdio: "pipe",
  });

  if (extract.status !== 0) {
    const detail = (extract.stderr || extract.stdout || "").trim();
    throw new Error(`Failed to extract ${tgzPath}${detail ? `\n${detail}` : ""}`);
  }

  const extractedPackageDir = path.join(targetPath, "package");
  if (!fs.existsSync(extractedPackageDir)) {
    throw new Error(`Expected extracted package directory at ${extractedPackageDir}`);
  }

  for (const entry of fs.readdirSync(extractedPackageDir, { withFileTypes: true })) {
    const from = path.join(extractedPackageDir, entry.name);
    const to = path.join(targetPath, entry.name);
    fs.renameSync(from, to);
  }
  fs.rmdirSync(extractedPackageDir);
  fs.rmSync(tempRoot, { recursive: true, force: true });

  return {
    name: target,
    repo: packageSpec,
    path: targetPath,
    source: "npm",
  };
}

function readInstalledPackageName(layerPath) {
  const packageJsonPath = path.join(layerPath, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    return null;
  }
  try {
    return readJson(packageJsonPath).name || null;
  } catch {
    return null;
  }
}

function readInstalledVersion(layerPath) {
  const packageJsonPath = path.join(layerPath, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    return null;
  }
  try {
    return readJson(packageJsonPath).version || null;
  } catch {
    return null;
  }
}

function hasGitRepo(layerPath) {
  return pathExists(path.join(layerPath, ".git"));
}

function gitResult(args, cwd) {
  return spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: "pipe",
  });
}

function isGitWorktreeDirty(layerPath) {
  const result = gitResult(["status", "--porcelain"], layerPath);
  if (result.status !== 0) {
    return null;
  }
  return Boolean((result.stdout || "").trim());
}

function packageMetaFor(target, layerPath) {
  return {
    expectedPackageName: packageMap[target] || null,
    packageName: readInstalledPackageName(layerPath),
    version: readInstalledVersion(layerPath),
  };
}

function relativeManifestPath(installDir, absolutePath) {
  return `./${path.relative(installDir, absolutePath).replace(/\\/g, "/")}`;
}

function ensureInstallPrereqs(source) {
  if (source === "git") {
    ensureGitAvailable();
    return;
  }
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
    ref: refOverride ?? manifest.layers[layerName]?.ref ?? (source === "git" ? repoUrlFor(layerName) : packageSpecFor(layerName)),
    path: relativeManifestPath(installDir, absoluteLayerPath),
    installed_at: new Date().toISOString(),
    package_name: readInstalledPackageName(absoluteLayerPath),
  };
}

function getGitHead(layerPath) {
  const result = gitResult(["rev-parse", "HEAD"], layerPath);
  if (result.status !== 0) {
    return null;
  }
  return (result.stdout || "").trim() || null;
}

function getGitBranch(layerPath) {
  const result = gitResult(["rev-parse", "--abbrev-ref", "HEAD"], layerPath);
  if (result.status !== 0) {
    return null;
  }
  return (result.stdout || "").trim() || null;
}

function getGitUpstream(layerPath) {
  const result = gitResult(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], layerPath);
  if (result.status !== 0) {
    return null;
  }
  return (result.stdout || "").trim() || null;
}

function getGitAheadBehind(layerPath) {
  const upstream = getGitUpstream(layerPath);
  if (!upstream) {
    return null;
  }
  const result = gitResult(["rev-list", "--left-right", "--count", `${upstream}...HEAD`], layerPath);
  if (result.status !== 0) {
    return null;
  }
  const [behindRaw, aheadRaw] = (result.stdout || "").trim().split(/\s+/);
  return {
    upstream,
    behind: Number.parseInt(behindRaw || "0", 10),
    ahead: Number.parseInt(aheadRaw || "0", 10),
  };
}

function getGitDiffSummary(layerPath) {
  const result = gitResult(["status", "--short"], layerPath);
  if (result.status !== 0) {
    return null;
  }
  const lines = (result.stdout || "").split(/\r?\n/).filter(Boolean);
  return {
    dirty: lines.length > 0,
    lines,
  };
}

function getNpmPublishedVersion(packageSpec) {
  const result = spawnSync("npm", ["view", packageSpec, "version"], {
    encoding: "utf8",
    stdio: "pipe",
    shell: true,
  });
  if (result.status !== 0) {
    return null;
  }
  return (result.stdout || "").trim() || null;
}

function describeGitLayerState(layerPath) {
  const branch = getGitBranch(layerPath);
  const head = getGitHead(layerPath);
  const diffSummary = getGitDiffSummary(layerPath);
  const aheadBehind = getGitAheadBehind(layerPath);
  return {
    branch,
    head,
    dirty: diffSummary?.dirty ?? false,
    diffLines: diffSummary?.lines ?? [],
    aheadBehind,
  };
}

function describeNpmLayerState(layerName, layerPath) {
  const installedVersion = readInstalledVersion(layerPath);
  const publishedVersion = getNpmPublishedVersion(packageSpecFor(layerName));
  return {
    installedVersion,
    publishedVersion,
    outdated: Boolean(installedVersion && publishedVersion && installedVersion !== publishedVersion),
  };
}

function installTargets(targets, installDir, source) {
  ensureInstallPrereqs(source);
  fs.mkdirSync(installDir, { recursive: true });

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

  for (const item of installed) {
    updateManifestLayerRecord(manifest, installDir, item.name, item.path, item.source, item.repo);
  }

  writeManifest(manifestPath, manifest);

  console.log("");
  console.log(`Installed ${installed.map((item) => item.name).join(", ")} into ${installDir}`);
  console.log(`Wrote ${manifestPath}`);
}

function installLayer(target, installDir, source) {
  if (source === "git") {
    return cloneLayer(target, installDir);
  }
  if (source === "npm") {
    return packNpmLayer(target, installDir);
  }
  throw new Error(`Unsupported source: ${source}. Use git or npm.`);
}

function loadManifestFromDir(installDir) {
  const manifestPath = manifestPathFor(installDir);
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`No architectonic.json found in ${installDir}`);
  }
  return { manifestPath, manifest: readManifest(manifestPath) };
}

function addCommand(tokens) {
  const { targets, installDir, source } = parseAddArgs(tokens);

  if (!targets.length) {
    throw new Error("Specify one or more layers: teleology, identity, project, skills");
  }

  const invalid = targets.filter((target) => !supportedSet.has(target));
  if (invalid.length) {
    throw new Error(`Unknown layer(s): ${invalid.join(", ")}\nSupported layers: ${supported.join(", ")}`);
  }

  installTargets(targets, installDir, source);
}

function resolvePreset(preset) {
  const presets = {
    solo: ["teleology", "identity", "project", "skills"],
    company: ["teleology", "project", "skills"],
    project: ["project", "skills"],
    agent: ["identity", "skills"],
  };
  const layers = presets[preset];
  if (!layers) {
    throw new Error(`Unknown preset: ${preset}. Supported presets: ${Object.keys(presets).join(", ")}`);
  }
  return layers;
}

function writeInitFiles(installDir, workspaceName, layers) {
  const displayName = workspaceName || path.basename(installDir);
  const readmePath = path.join(installDir, "README.md");
  const agentsPath = path.join(installDir, "AGENTS.md");

  if (!pathExists(readmePath)) {
    fs.writeFileSync(
      readmePath,
      `# ${displayName}\n\nThis workspace was initialized by \`architectonic\`.\n\nInstalled layers:\n\n${layers.map((layer) => `- ${layer}`).join("\n")}\n`,
      "utf8",
    );
  }

  if (!pathExists(agentsPath)) {
    fs.writeFileSync(
      agentsPath,
      `# Agent Instructions\n\nRead installed layers before making structural changes.\n\nPriority order:\n1. teleology\n2. identity\n3. project\n4. skills\n`,
      "utf8",
    );
  }
}

function initCommand(tokens) {
  const { installDir, source, preset, workspaceName } = parseInitArgs(tokens);
  if (pathExists(installDir) && fs.readdirSync(installDir).length > 0) {
    throw new Error(`Refusing to initialize into a non-empty directory: ${installDir}`);
  }
  fs.mkdirSync(installDir, { recursive: true });
  const layers = resolvePreset(preset);
  writeInitFiles(installDir, workspaceName, layers);
  installTargets(layers, installDir, source);
}

function listCommand(tokens) {
  const installDir = tokens[0] ? path.resolve(tokens[0]) : process.cwd();
  const { manifest } = loadManifestFromDir(installDir);
  const entries = Object.entries(manifest.layers || {});

  if (!entries.length) {
    console.log("No layers installed.");
    return;
  }

  for (const [name, layer] of entries) {
    console.log(`${name}`);
    console.log(`  source: ${layer.source || "unknown"}`);
    console.log(`  path:   ${layer.path || "unknown"}`);
    console.log(`  ref:    ${layer.ref || "unknown"}`);
    if (layer.package_name) {
      console.log(`  pkg:    ${layer.package_name}`);
    }
  }
}

function statusCommand(tokens) {
  const { installDir } = parseStatusArgs(tokens);
  const { manifest } = loadManifestFromDir(installDir);
  const entries = Object.entries(manifest.layers || {});

  if (!entries.length) {
    console.log("No layers installed.");
    return;
  }

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
      const dirtyLabel = state.dirty ? "dirty" : "clean";
      const branchLabel = state.branch || "detached";
      let relation = "no-upstream";
      if (state.aheadBehind) {
        relation = `ahead ${state.aheadBehind.ahead}, behind ${state.aheadBehind.behind}`;
      }
      console.log(`  [git] ${name}: ${branchLabel}, ${dirtyLabel}, ${relation}`);
      continue;
    }

    if (layer.source === "npm") {
      const state = describeNpmLayerState(name, layerPath);
      const installed = state.installedVersion || "unknown";
      const published = state.publishedVersion || "unknown";
      const relation = state.outdated ? "outdated" : "current-or-unknown";
      console.log(`  [npm] ${name}: installed ${installed}, published ${published}, ${relation}`);
      continue;
    }

    console.log(`  [unknown] ${name}: unsupported source ${layer.source || "unknown"}`);
  }
}

function inferLayerPath(installDir, layerName) {
  const candidate = targetPathFor(installDir, layerName);
  return pathExists(candidate) ? candidate : null;
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

  for (const [name, layer] of entries) {
    const relativePath = String(layer.path || "");
    const layerPath = path.resolve(installDir, relativePath);
    const packageJsonPath = path.join(layerPath, "package.json");
    const exists = fs.existsSync(layerPath);
    const hasPackageJson = fs.existsSync(packageJsonPath);
    const packageName = hasPackageJson ? readInstalledPackageName(layerPath) : null;
    const expectedPackageName = packageMap[name];

    if (!exists) {
      const inferredPath = inferLayerPath(installDir, name);
      if (fix && inferredPath) {
        updateManifestLayerRecord(manifest, installDir, name, inferredPath, layer.source || "unknown", layer.ref || null);
        changed = true;
        console.log(`  [fix] ${name}: repointed path to ${relativeManifestPath(installDir, inferredPath)}`);
        continue;
      }
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
      if (fix) {
        manifest.layers[name].package_name = packageName;
        manifest.layers[name].path = relativeManifestPath(installDir, layerPath);
        changed = true;
        console.log(`  [fix] ${name}: synced manifest package name to ${packageName}`);
        continue;
      }
      console.log(`  [fail] ${name}: expected package ${expectedPackageName}, found ${packageName}`);
      failures += 1;
      continue;
    }

    if (fix) {
      const normalizedPath = relativeManifestPath(installDir, layerPath);
      if (manifest.layers[name].path !== normalizedPath || manifest.layers[name].package_name !== packageName) {
        manifest.layers[name].path = normalizedPath;
        manifest.layers[name].package_name = packageName;
        changed = true;
      }
    }

    console.log(`  [ok] ${name}: ${relativePath} (${layer.source || "unknown"})`);
  }

  if (fix && changed) {
    writeManifest(manifestPath, manifest);
    console.log(`  [write] updated manifest repairs`);
  }

  if (failures > 0) {
    process.exit(1);
  }
}

function updateGitLayer(layerName, layerPath, dryRun) {
  if (!hasGitRepo(layerPath)) {
    return { status: "skip", detail: "not a git repository" };
  }
  const dirty = isGitWorktreeDirty(layerPath);
  if (dirty === null) {
    return { status: "skip", detail: "unable to inspect git status" };
  }
  if (dirty) {
    return { status: "skip", detail: "local changes detected; preserving fork" };
  }
  if (dryRun) {
    return { status: "plan", detail: "would run git pull --ff-only" };
  }
  const result = gitResult(["pull", "--ff-only"], layerPath);
  if (result.status !== 0) {
    return { status: "fail", detail: (result.stderr || result.stdout || "").trim() || "git pull failed" };
  }
  return { status: "ok", detail: (result.stdout || "").trim() || "up to date" };
}

function getLatestNpmVersion(packageSpec) {
  const result = spawnSync("npm", ["view", packageSpec, "version"], {
    encoding: "utf8",
    stdio: "pipe",
    shell: true,
  });
  if (result.status !== 0) {
    return null;
  }
  return (result.stdout || "").trim() || null;
}

function updateNpmLayer(layerName, layerPath) {
  const installedVersion = readInstalledVersion(layerPath);
  const packageSpec = packageSpecFor(layerName);
  const latestVersion = getLatestNpmVersion(packageSpec);
  if (!latestVersion) {
    return { status: "skip", detail: "unable to resolve latest npm version" };
  }
  if (!installedVersion) {
    return { status: "skip", detail: `latest ${latestVersion} available; local version unknown` };
  }
  if (installedVersion === latestVersion) {
    return { status: "ok", detail: `already at ${installedVersion}` };
  }
  return {
    status: "skip",
    detail: `newer package ${latestVersion} available; skipped to preserve local fork (${installedVersion} installed)`,
  };
}

function updateCommand(tokens) {
  const { installDir, dryRun } = parseUpdateArgs(tokens);
  const { manifestPath, manifest } = loadManifestFromDir(installDir);
  const entries = Object.entries(manifest.layers || {});

  if (!entries.length) {
    throw new Error("No installed layers recorded.");
  }

  ensureGitAvailable();
  ensureNpmAvailable();

  let changed = false;
  console.log(`architectonic update${dryRun ? " --dry-run" : ""}`);
  console.log(`  root: ${installDir}`);

  for (const [name, layer] of entries) {
    const layerPath = path.resolve(installDir, String(layer.path || ""));
    if (!pathExists(layerPath)) {
      console.log(`  [skip] ${name}: missing directory`);
      continue;
    }

    let outcome;
    if (layer.source === "git") {
      outcome = updateGitLayer(name, layerPath, dryRun);
    } else if (layer.source === "npm") {
      outcome = updateNpmLayer(name, layerPath);
    } else {
      outcome = { status: "skip", detail: `unsupported source ${layer.source || "unknown"}` };
    }

    console.log(`  [${outcome.status}] ${name}: ${outcome.detail}`);
    if (outcome.status === "ok" && !dryRun) {
      manifest.layers[name].installed_at = new Date().toISOString();
      manifest.layers[name].package_name = readInstalledPackageName(layerPath);
      changed = true;
    }
  }

  if (changed) {
    writeManifest(manifestPath, manifest);
    console.log(`  [write] refreshed manifest timestamps`);
  }
}

function removeCommand(tokens) {
  const { installDir, force, target } = parseRemoveArgs(tokens);
  if (!target) {
    throw new Error("Specify a layer to remove.");
  }
  if (!supportedSet.has(target)) {
    throw new Error(`Unknown layer: ${target}`);
  }
  const { manifestPath, manifest } = loadManifestFromDir(installDir);
  const layer = manifest.layers[target];
  if (!layer) {
    throw new Error(`Layer not recorded in manifest: ${target}`);
  }
  const layerPath = path.resolve(installDir, String(layer.path || ""));
  if (pathExists(layerPath) && hasGitRepo(layerPath) && !force) {
    const dirty = isGitWorktreeDirty(layerPath);
    if (dirty) {
      throw new Error(`Refusing to remove ${target}: local git changes detected. Re-run with --force if you really want to delete it.`);
    }
  }
  if (pathExists(layerPath)) {
    fs.rmSync(layerPath, { recursive: true, force: true });
  }
  delete manifest.layers[target];
  writeManifest(manifestPath, manifest);
  console.log(`Removed ${target}`);
  console.log(`Updated ${manifestPath}`);
}

function diffCommand(tokens) {
  const { installDir, target } = parseDiffArgs(tokens);
  if (!target) {
    throw new Error("Specify a layer to diff.");
  }
  if (!supportedSet.has(target)) {
    throw new Error(`Unknown layer: ${target}`);
  }
  const { manifest } = loadManifestFromDir(installDir);
  const layer = manifest.layers[target];
  if (!layer) {
    throw new Error(`Layer not recorded in manifest: ${target}`);
  }
  const layerPath = path.resolve(installDir, String(layer.path || ""));
  if (!pathExists(layerPath)) {
    throw new Error(`Layer path does not exist: ${layerPath}`);
  }

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
    if (!summary || !summary.lines.length) {
      console.log(`  local changes: none`);
      return;
    }
    console.log(`  local changes:`);
    for (const line of summary.lines) {
      console.log(`    ${line}`);
    }
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
    if (state.outdated) {
      console.log(`  drift: newer package available`);
    } else {
      console.log(`  drift: none detected from package version`);
    }
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
