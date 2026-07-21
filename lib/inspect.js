import fs from "node:fs";
import path from "node:path";
import {
  LAYERS, PROTOCOL_VERSION, branch, dirty, exists, finishJson, git, gitHead, hashDirectory, icon, load,
  padEnd, parse, parseDirArg, pkgName, pkgVersion, println, protocolMinor, readJson, rel, shortSha, style,
  writeManifest,
} from "./runtime.js";

export function inspectLayer(root, layer, item, { semantic = false } = {}) {
  const dir = path.resolve(root, item.path || `./${layer}`);
  const definition = LAYERS[layer];
  const checks = [];
  const warnings = [];
  let ok = true;
  const fail = (code, message) => { checks.push({ level: "fail", code, message }); ok = false; };
  const warn = (code, message) => warnings.push({ level: "warn", code, message });

  if (!definition) fail("unknown_layer", "layer is not defined by this CLI version");
  if (!exists(dir)) fail("missing_dir", "missing directory");
  const packageFile = path.join(dir, "package.json");
  if (exists(dir) && !exists(packageFile)) fail("missing_package_json", "missing package.json");
  const found = exists(packageFile) ? pkgName(dir) : null;
  if (definition && found && definition.packageName !== found) fail("package_name", `expected ${definition.packageName}, found ${found}`);

  const currentIntegrity = exists(dir) ? hashDirectory(dir) : null;
  if (item.integrity && currentIntegrity && item.integrity !== currentIntegrity) warn("local_changes", "installed files differ from recorded integrity");

  let protocol = null;
  if (semantic && exists(dir)) {
    const protocolFile = path.join(dir, "architectonic.protocol.json");
    if (!exists(protocolFile)) fail("missing_protocol", "missing architectonic.protocol.json");
    else {
      try {
        protocol = readJson(protocolFile);
        if (protocol.layer !== layer) fail("protocol_layer", `protocol declares ${protocol.layer || "no layer"}`);
        if (protocolMinor(protocol.protocol_version) !== protocolMinor(PROTOCOL_VERSION)) {
          fail("protocol_version", `expected protocol ${protocolMinor(PROTOCOL_VERSION)}.x, found ${protocol.protocol_version || "none"}`);
        }
        const installedVersion = pkgVersion(dir);
        if (protocol.package_version && installedVersion && protocol.package_version !== installedVersion) {
          fail("package_version", `protocol package version ${protocol.package_version} differs from package.json ${installedVersion}`);
        }
        const canonical = protocol.canonical_entry || definition?.entry;
        if (!canonical || !exists(path.join(dir, canonical))) fail("missing_entry", `missing canonical entry ${canonical || "(undefined)"}`);
      } catch (error) {
        fail("invalid_protocol", `invalid architectonic.protocol.json: ${error.message}`);
      }
    }
  }

  const head = item.source === "git" && exists(path.join(dir, ".git")) ? gitHead(dir) : null;
  const dirtyFiles = item.source === "git" && exists(dir) ? dirty(dir) : null;
  return {
    layer, dir, ok, checks, warnings,
    expected: definition?.packageName || null,
    found,
    source: item.source,
    branch: exists(dir) ? branch(dir) : null,
    dirty: Boolean(dirtyFiles),
    dirtyFiles,
    head,
    pin: item.resolved_sha || null,
    version: exists(dir) ? pkgVersion(dir) : null,
    protocol,
    entry: protocol?.canonical_entry || definition?.entry || null,
  };
}

export function listCommand(tokens) {
  const parsed = parseDirArg(tokens);
  const manifest = load(parsed.dir);
  if (parsed.json) return finishJson({ command: "list", root: parsed.dir, manifest }, true);
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

function runInspection(tokens, semantic) {
  const parsed = parseDirArg(tokens);
  const manifest = load(parsed.dir);
  const results = [];
  for (const [layer, item] of Object.entries(manifest.layers || {})) {
    const info = inspectLayer(parsed.dir, layer, item, { semantic });
    if (parsed.fix && exists(info.dir)) {
      item.path = rel(parsed.dir, info.dir);
      item.package_name = info.found;
      item.integrity = hashDirectory(info.dir);
      if (item.source === "git" && info.head) item.resolved_sha = info.head;
      if (item.source === "npm" && info.version) item.resolved_version = info.version;
    }
    results.push(info);
  }
  const required = manifest.required_layers || Object.keys(manifest.layers || {});
  const missing = required.filter((layer) => !manifest.layers?.[layer]);
  const rootChecks = [];
  if (semantic && !exists(path.join(parsed.dir, "AGENTS.md"))) rootChecks.push({ level: "fail", code: "missing_agents", message: "missing workspace AGENTS.md" });
  const ok = missing.length === 0 && rootChecks.length === 0 && results.every((result) => result.ok);
  if (parsed.fix) writeManifest(parsed.dir, manifest);
  return { parsed, manifest, results, missing, rootChecks, ok };
}

export function doctor(tokens) {
  const state = runInspection(tokens, false);
  if (state.parsed.json) return finishJson({ command: "doctor", root: state.parsed.dir, ok: state.ok, missing: state.missing, results: state.results }, state.ok);
  println(`${style.bold("architectonic doctor")} ${style.dim(`root: ${state.parsed.dir}`)}`);
  for (const result of state.results) {
    println(`  ${result.ok ? icon("ok") : icon("fail")} ${padEnd(result.layer, 18)} ${result.found || "no package"}`);
    for (const check of result.checks) println(style.dim(`      ${check.level}: ${check.message}`));
    for (const warning of result.warnings) println(style.dim(`      ${warning.level}: ${warning.message}`));
  }
  if (state.missing.length) println(`${icon("fail")} Missing required layers: ${state.missing.join(", ")}`);
  if (!state.ok) process.exitCode = 1;
}

export function verify(tokens) {
  const state = runInspection(tokens, true);
  if (state.parsed.json) return finishJson({ command: "verify", root: state.parsed.dir, protocol_version: PROTOCOL_VERSION, ok: state.ok, missing: state.missing, root_checks: state.rootChecks, results: state.results }, state.ok);
  println(`${style.bold("architectonic verify")} ${style.dim(`root: ${state.parsed.dir}`)}`);
  println(style.dim(`  protocol ${PROTOCOL_VERSION} · semantic conformance`));
  for (const result of state.results) {
    println(`  ${result.ok ? icon("ok") : icon("fail")} ${padEnd(result.layer, 18)} ${result.entry || "no canonical entry"}`);
    for (const check of result.checks) println(style.dim(`      ${check.level}: ${check.message}`));
    for (const warning of result.warnings) println(style.dim(`      ${warning.level}: ${warning.message}`));
  }
  for (const check of state.rootChecks) println(`${icon("fail")} ${check.message}`);
  if (state.missing.length) println(`${icon("fail")} Missing required layers: ${state.missing.join(", ")}`);
  println(state.ok ? `${icon("ok")} Conformance passed` : `${icon("fail")} Conformance failed`);
  if (!state.ok) process.exitCode = 1;
}

export function mapCommand(tokens) {
  const parsed = parseDirArg(tokens);
  const manifest = load(parsed.dir);
  const rows = Object.entries(manifest.layers || {}).map(([layer, item]) => {
    const definition = LAYERS[layer];
    const dir = path.resolve(parsed.dir, item.path || `./${layer}`);
    let protocol = null;
    try { protocol = readJson(path.join(dir, "architectonic.protocol.json")); } catch { /* verify reports this */ }
    const entry = protocol?.canonical_entry || definition?.entry || "README.md";
    return {
      layer,
      purpose: definition?.purpose || "unknown layer",
      path: rel(parsed.dir, dir),
      entry: rel(parsed.dir, path.join(dir, entry)),
      source: item.source || "unknown",
      version: pkgVersion(dir),
    };
  });
  if (parsed.json) return finishJson({ command: "map", root: parsed.dir, profiles: manifest.profiles || [], rows }, true);
  println(`${style.bold("architectonic map")} ${style.dim(`root: ${parsed.dir}`)}`);
  println();
  for (const row of rows) {
    println(`  ${style.bold(padEnd(row.layer, 18))} ${row.entry}`);
    println(style.dim(`    ${row.purpose}`));
  }
  println();
  println(style.dim("  Read the smallest relevant canonical entry before broad search."));
}

export function status(tokens) {
  const parsed = parseDirArg(tokens);
  const manifest = load(parsed.dir);
  const selected = parsed.targets.length ? parsed.targets : Object.keys(manifest.layers || {});
  const results = selected.map((layer) => {
    const item = manifest.layers[layer];
    if (!item) return { layer, installed: false };
    return { installed: true, ...inspectLayer(parsed.dir, layer, item) };
  });
  if (parsed.json) return finishJson({ command: "status", root: parsed.dir, results }, true);
  println(`${style.bold("architectonic status")} ${style.dim(`root: ${parsed.dir}`)}`);
  for (const result of results) {
    if (!result.installed) {
      println(`  ${icon("warn")} ${padEnd(result.layer, 18)} not installed`);
      continue;
    }
    const state = result.dirty ? "dirty" : result.warnings.length ? "modified" : "clean";
    const pin = result.head ? shortSha(result.head) : result.version ? `v${result.version}` : "unresolved";
    println(`  ${result.ok ? icon("ok") : icon("fail")} ${padEnd(result.layer, 18)} ${padEnd(result.source || "unknown", 5)} ${padEnd(state, 8)} ${pin}`);
  }
}

export function diff(tokens) {
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
