import fs from "node:fs";
import path from "node:path";
import {
  dirty, exists, finishJson, git, gitHead, hashDirectory, icon, load, padEnd, parse, pkgVersion,
  println, rel, run, writeManifest,
} from "./runtime.js";
import { extractPackedLayer } from "./install.js";
import { inspectLayer } from "./inspect.js";

function updateGitLayer(root, layer, item, dryRun) {
  const dir = path.resolve(root, item.path);
  if (item.source !== "git") return { layer, status: "skipped", reason: "npm-sourced layer; use upgrade" };
  if (dirty(dir)) return { layer, status: "skipped", reason: "dirty worktree" };
  if (dryRun) return { layer, status: "planned" };
  const result = git(dir, ["pull", "--ff-only"]);
  if (result.status !== 0) return { layer, status: "failed", reason: (result.stderr || result.stdout || "").trim() };
  item.resolved_sha = gitHead(dir);
  item.integrity = hashDirectory(dir);
  return { layer, status: "updated", resolved_sha: item.resolved_sha };
}

export function update(tokens) {
  const parsed = parse(tokens);
  const manifest = load(parsed.dir);
  const targets = parsed.targets.length ? parsed.targets : Object.keys(manifest.layers || {});
  const results = targets.map((layer) => {
    const item = manifest.layers[layer];
    return item ? updateGitLayer(parsed.dir, layer, item, parsed.dryRun) : { layer, status: "missing" };
  });
  if (!parsed.dryRun) writeManifest(parsed.dir, manifest);
  if (parsed.json) return finishJson({ command: "update", root: parsed.dir, results }, !results.some((result) => result.status === "failed"));
  for (const result of results) println(`  ${result.status === "updated" ? icon("ok") : result.status === "failed" ? icon("fail") : icon("skip")} ${padEnd(result.layer, 18)} ${result.status}${result.reason ? `: ${result.reason}` : ""}`);
  if (results.some((result) => result.status === "failed")) process.exitCode = 1;
}

function upgradeNpmLayer(root, layer, item, dryRun) {
  const currentDir = path.resolve(root, item.path);
  if (item.integrity && hashDirectory(currentDir) !== item.integrity) return { layer, status: "skipped", reason: "local modifications require review" };
  const stagingRoot = fs.mkdtempSync(path.join(root, ".architectonic-upgrade-"));
  try {
    const staged = extractPackedLayer(layer, stagingRoot);
    const nextVersion = pkgVersion(staged.path);
    const currentVersion = pkgVersion(currentDir);
    if (!nextVersion) return { layer, status: "failed", reason: "packed package has no version" };
    if (nextVersion === currentVersion) return { layer, status: "current", version: currentVersion };
    const check = inspectLayer(stagingRoot, layer, { ...item, path: `./${layer}`, integrity: null }, { semantic: true });
    if (!check.ok) return { layer, status: "failed", reason: check.checks.map((entry) => entry.message).join("; ") };
    if (dryRun) return { layer, status: "planned", from: currentVersion, to: nextVersion };
    const backup = `${currentDir}.architectonic-backup`;
    fs.rmSync(backup, { recursive: true, force: true });
    fs.renameSync(currentDir, backup);
    try {
      fs.renameSync(staged.path, currentDir);
      fs.rmSync(backup, { recursive: true, force: true });
    } catch (error) {
      if (exists(currentDir)) fs.rmSync(currentDir, { recursive: true, force: true });
      fs.renameSync(backup, currentDir);
      throw error;
    }
    item.resolved_version = nextVersion;
    item.installed_at = new Date().toISOString();
    item.integrity = hashDirectory(currentDir);
    return { layer, status: "updated", from: currentVersion, to: nextVersion };
  } finally {
    fs.rmSync(stagingRoot, { recursive: true, force: true });
  }
}

export function upgrade(tokens) {
  const parsed = parse(tokens);
  const manifest = load(parsed.dir);
  const targets = parsed.targets.length ? parsed.targets : Object.keys(manifest.layers || {});
  const results = [];
  for (const layer of targets) {
    const item = manifest.layers[layer];
    if (!item) results.push({ layer, status: "missing" });
    else if (item.source === "git") results.push(updateGitLayer(parsed.dir, layer, item, parsed.dryRun));
    else {
      try { results.push(upgradeNpmLayer(parsed.dir, layer, item, parsed.dryRun)); }
      catch (error) { results.push({ layer, status: "failed", reason: error.message }); }
    }
  }
  if (!parsed.dryRun) writeManifest(parsed.dir, manifest);
  const ok = !results.some((result) => result.status === "failed");
  if (parsed.json) return finishJson({ command: "upgrade", root: parsed.dir, results }, ok);
  for (const result of results) println(`  ${result.status === "updated" || result.status === "current" ? icon("ok") : result.status === "failed" ? icon("fail") : icon("skip")} ${padEnd(result.layer, 18)} ${result.status}${result.from || result.to ? ` ${result.from || "?"} -> ${result.to || result.version || "?"}` : ""}${result.reason ? `: ${result.reason}` : ""}`);
  if (!ok) process.exitCode = 1;
}

export function remove(tokens) {
  const parsed = parse(tokens);
  const layer = parsed.targets[0];
  if (!layer) throw new Error("remove requires a layer name");
  const manifest = load(parsed.dir);
  const item = manifest.layers[layer];
  if (!item) throw new Error(`Layer is not installed: ${layer}`);
  const dir = path.resolve(parsed.dir, item.path);
  if (item.source === "git" && exists(dir) && dirty(dir) && !parsed.force) throw new Error(`Refusing to remove dirty git layer: ${layer}\nUse --force only after reviewing local changes.`);
  if (item.source === "npm" && item.integrity && hashDirectory(dir) !== item.integrity && !parsed.force) throw new Error(`Refusing to remove locally modified layer: ${layer}\nUse --force only after reviewing local changes.`);
  fs.rmSync(dir, { recursive: true, force: true });
  delete manifest.layers[layer];
  manifest.required_layers = (manifest.required_layers || []).filter((name) => name !== layer);
  writeManifest(parsed.dir, manifest);
  println(`${icon("ok")} Removed ${layer}`);
}

export function agentCommand(tokens) {
  const action = tokens[0];
  if (action !== "create") throw new Error("Usage: architectonic agent create --spec <file> --output <dir>");
  const parsed = parse(tokens.slice(1));
  if (!parsed.spec || !parsed.output) throw new Error("agent create requires --spec and --output");
  const manifest = load(parsed.dir);
  const item = manifest.layers?.agents;
  if (!item) throw new Error("The agents layer is not installed. Run architectonic add agents first.");
  const agentsDir = path.resolve(parsed.dir, item.path);
  const generator = path.join(agentsDir, "scripts", "instantiate_agent.py");
  if (!exists(generator)) throw new Error(`Installed agents package does not contain ${rel(parsed.dir, generator)}`);
  const python = process.platform === "win32" ? "python" : "python3";
  const result = run(python, [generator, "--spec", path.resolve(parsed.spec), "--output", parsed.output], { cwd: agentsDir });
  process.stdout.write(result.stdout || "");
  process.stderr.write(result.stderr || "");
  if (result.status !== 0) process.exitCode = result.status;
}
