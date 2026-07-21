import fs from "node:fs";
import path from "node:path";
import {
  PROTOCOL_VERSION, VERSION, ensureSource, exists, gitHead, hashDirectory, icon, layerPath, manifestPath,
  packageSpec, parse, pkgName, pkgVersion, println, readManifest, rel, repoUrl, resolvePreset, run, style,
  unique, writeManifest,
} from "./runtime.js";
import { ensureOrganizationScaffold } from "./organization.js";

function cloneLayer(layer, dir) {
  const destination = layerPath(dir, layer);
  if (exists(destination)) throw new Error(`Target already exists: ${destination}`);
  const url = repoUrl(layer);
  const result = run("git", ["clone", url, destination], { cwd: dir });
  if (result.status !== 0) throw new Error(`Failed to clone ${url}\n${(result.stderr || result.stdout || "").trim()}`);
  return { layer, path: destination, source: "git", ref: url };
}

export function extractPackedLayer(layer, parentDir) {
  const destination = layerPath(parentDir, layer);
  const temp = fs.mkdtempSync(path.join(parentDir, ".architectonic-pack-"));
  const spec = packageSpec(layer);
  try {
    const packed = run("npm", ["pack", spec, "--pack-destination", temp], { cwd: parentDir });
    if (packed.status !== 0) throw new Error(`Failed to pack ${spec}\n${(packed.stderr || packed.stdout || "").trim()}`);
    const archive = (packed.stdout || "").trim().split(/\r?\n/).filter(Boolean).pop();
    fs.mkdirSync(destination, { recursive: true });
    const extracted = run("tar", ["-xzf", path.join(temp, archive), "-C", destination], { cwd: parentDir });
    if (extracted.status !== 0) throw new Error(`Failed to extract ${archive}\n${(extracted.stderr || extracted.stdout || "").trim()}`);
    const packageDir = path.join(destination, "package");
    for (const entry of fs.readdirSync(packageDir, { withFileTypes: true })) {
      fs.renameSync(path.join(packageDir, entry.name), path.join(destination, entry.name));
    }
    fs.rmdirSync(packageDir);
    return { layer, path: destination, source: "npm", ref: spec };
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

function layerRecord(root, item) {
  const record = {
    source: item.source,
    ref: item.ref,
    path: rel(root, item.path),
    installed_at: new Date().toISOString(),
    package_name: pkgName(item.path),
    integrity: hashDirectory(item.path),
  };
  if (item.source === "git") record.resolved_sha = gitHead(item.path);
  else record.resolved_version = pkgVersion(item.path);
  return record;
}

export function installResolved(layers, dir, source, { quiet = false, profile = null } = {}) {
  ensureSource(source);
  fs.mkdirSync(dir, { recursive: true });
  const manifest = readManifest(dir);
  Object.assign(manifest, {
    schema_version: 2,
    protocol_version: PROTOCOL_VERSION,
    architectonic_version: VERSION,
    last_source: source,
    git_source_base: process.env.ARCHITECTONIC_SOURCE_BASE || "https://github.com/architectonic",
    npm_source_base: process.env.ARCHITECTONIC_NPM_BASE || "registry",
  });
  manifest.profiles = unique([...(manifest.profiles || []), ...(profile ? [profile] : [])]);
  manifest.required_layers = unique([...(manifest.required_layers || []), ...layers]);
  manifest.layers ||= {};
  for (const layer of layers) {
    if (manifest.layers[layer]) throw new Error(`Layer is already installed: ${layer}`);
    if (!quiet) println(`${icon("plan")} Adding ${style.bold(layer)} from ${source}...`);
    const item = source === "git" ? cloneLayer(layer, dir) : extractPackedLayer(layer, dir);
    manifest.layers[layer] = layerRecord(dir, item);
  }
  writeManifest(dir, manifest);
  const organizationFiles = ensureOrganizationScaffold(dir, layers);
  if (!quiet) {
    println(`${icon("ok")} Installed ${style.bold(layers.join(", "))} into ${dir}`);
    println(`${icon("info")} Wrote ${manifestPath(dir)}`);
    if (organizationFiles.length) println(`${icon("info")} Created ${organizationFiles.length} organization-owned files`);
  }
  return layers;
}

export function init(tokens) {
  const parsed = parse(tokens);
  const name = parsed.targets[0] || null;
  if (parsed.targets.length > 1) throw new Error("init accepts at most one workspace name");
  const dir = name ? path.resolve(parsed.dir, name) : parsed.dir;
  if (exists(dir) && fs.readdirSync(dir).length > 0) throw new Error(`Refusing to initialize into a non-empty directory: ${dir}`);
  const preset = resolvePreset(parsed.preset);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "README.md"), `# ${path.basename(dir)}\n\nHuman–AI organization initialized with Architectonic.\n\n- Start with \`ONBOARDING.md\` to establish the organization through document-guided questions.\n- Run \`npx architectonic onboard\` to inspect local organization files.\n- Run \`npx architectonic map\` to locate local operating knowledge and upstream contracts.\n`, "utf8");
  fs.writeFileSync(path.join(dir, "AGENTS.md"), `# Agent instructions\n\n1. Read \`ONBOARDING.md\` when the local organization is new, incomplete, or inconsistent.\n2. Inspect existing documents and source artifacts before asking the human questions.\n3. Ask only targeted questions tied to a material document gap, decision, risk, authority boundary, or action.\n4. Write explicit answers into \`organization/\`; do not store local facts by editing installed layer packages.\n5. Run \`npx architectonic map\` before broad repository search and read the smallest relevant local entry and upstream contract.\n6. Treat sources as evidence; distinguish facts, inferences, assumptions, decisions, contradictions, and unknowns.\n7. Verify authority, acceptance criteria, review gates, and stopping conditions before material action.\n8. Preserve unresolved questions instead of inventing answers to complete a template.\n`, "utf8");
  installResolved(preset.layers, dir, parsed.source, { profile: preset.name });
  if (preset.legacyAlias) println(`${icon("warn")} Preset '${preset.legacyAlias}' is deprecated; use '${preset.name}'.`);
  println();
  println(`  ${style.dim("Next:")} npx architectonic onboard --dir ${JSON.stringify(dir)}`);
  println(`        npx architectonic verify --dir ${JSON.stringify(dir)}`);
  println(`        npx architectonic map --dir ${JSON.stringify(dir)}`);
}
