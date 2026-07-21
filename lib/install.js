import fs from "node:fs";
import path from "node:path";
import {
  PROTOCOL_VERSION, VERSION, ensureSource, exists, gitHead, hashDirectory, icon, layerPath, manifestPath,
  packageSpec, parse, pkgName, pkgVersion, println, profileFeatures, readManifest, rel, repoUrl, resolvePreset, run,
  style, unique, writeManifest,
} from "./runtime.js";
import { ensureOrganizationScaffold } from "./organization.js";

const AGENT_GUIDE = `# Agent instructions

1. Read \`ONBOARDING.md\` when the local system is new, incomplete, stale, or inconsistent.
2. Inspect existing documents and source artifacts before asking the human questions.
3. Ask only targeted questions tied to a material document gap, decision, risk, authority boundary, or action.
4. Write explicit answers into \`organization/\`; do not store local facts by editing installed layer packages.
5. Run \`npx architectonic map\` before broad repository search and read the smallest relevant local entry and upstream contract.
6. Treat sources as evidence; distinguish facts, inferences, assumptions, decisions, contradictions, and unknowns.
7. Treat graphs, summaries, indexes, embeddings, and model output as derived views unless separately verified.
8. Give recurring loops durable state, a verifier, a budget, a stop condition, and a human-controlled authority gate.
9. Verify authority, acceptance criteria, review gates, and stopping conditions before material action.
10. Preserve unresolved questions instead of inventing answers to complete a template.
`;

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
    if (!archive) throw new Error(`npm pack returned no archive for ${spec}`);
    fs.mkdirSync(destination, { recursive: true });
    const extracted = run("tar", ["-xzf", path.join(temp, archive), "-C", destination], { cwd: parentDir });
    if (extracted.status !== 0) throw new Error(`Failed to extract ${archive}\n${(extracted.stderr || extracted.stdout || "").trim()}`);
    const packageDir = path.join(destination, "package");
    if (!exists(packageDir)) throw new Error(`Packed package ${spec} did not contain a package directory`);
    for (const entry of fs.readdirSync(packageDir, { withFileTypes: true })) {
      fs.renameSync(path.join(packageDir, entry.name), path.join(destination, entry.name));
    }
    fs.rmdirSync(packageDir);
    return { layer, path: destination, source: "npm", ref: spec };
  } catch (error) {
    fs.rmSync(destination, { recursive: true, force: true });
    throw error;
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

export function installResolved(layers, dir, source, { quiet = false, profiles = [], features = [] } = {}) {
  if (!layers.length) throw new Error("No layers were selected for installation.");
  ensureSource(source);
  fs.mkdirSync(dir, { recursive: true });
  const manifest = readManifest(dir);
  const nextProfiles = unique([...(manifest.profiles || []), ...profiles]);
  const nextFeatures = unique([...(manifest.features || []), ...profileFeatures(nextProfiles), ...features]);
  Object.assign(manifest, {
    schema_version: 3,
    protocol_version: PROTOCOL_VERSION,
    architectonic_version: VERSION,
    last_source: source,
    git_source_base: process.env.ARCHITECTONIC_SOURCE_BASE || "https://github.com/architectonic",
    npm_source_base: process.env.ARCHITECTONIC_NPM_BASE || "registry",
    profiles: nextProfiles,
    features: nextFeatures,
  });
  manifest.required_layers = unique([...(manifest.required_layers || []), ...layers]);
  manifest.layers ||= {};

  const added = [];
  try {
    for (const layer of layers) {
      if (manifest.layers[layer]) throw new Error(`Layer is already installed: ${layer}`);
      if (!quiet) println(`${icon("plan")} Adding ${style.bold(layer)} from ${source}...`);
      const item = source === "git" ? cloneLayer(layer, dir) : extractPackedLayer(layer, dir);
      manifest.layers[layer] = layerRecord(dir, item);
      added.push(layer);
    }
  } catch (error) {
    for (const layer of added) {
      fs.rmSync(layerPath(dir, layer), { recursive: true, force: true });
      delete manifest.layers[layer];
    }
    throw error;
  }

  if (!exists(path.join(dir, "AGENTS.md"))) fs.writeFileSync(path.join(dir, "AGENTS.md"), AGENT_GUIDE, "utf8");
  writeManifest(dir, manifest);
  const installedLayers = Object.keys(manifest.layers);
  const organizationFiles = ensureOrganizationScaffold(dir, installedLayers, manifest.profiles);
  if (!quiet) {
    println(`${icon("ok")} Installed ${style.bold(layers.join(", "))} into ${dir}`);
    println(`${icon("info")} Wrote ${manifestPath(dir)}`);
    if (manifest.profiles.length) println(`${icon("info")} Profiles: ${manifest.profiles.join(", ")}`);
    if (manifest.features.length) println(`${icon("info")} Features: ${manifest.features.join(", ")}`);
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
  fs.writeFileSync(path.join(dir, "README.md"), `# ${path.basename(dir)}\n\nInitialized with Architectonic profile \`${preset.name}\`.\n\n- Read \`ONBOARDING.md\` to establish the workspace through document-guided questions.\n- Run \`npx architectonic onboard\` to inspect local organization-owned files.\n- Run \`npx architectonic map\` before broad search.\n- Run \`npx architectonic verify\` before material action.\n`, "utf8");
  fs.writeFileSync(path.join(dir, "AGENTS.md"), AGENT_GUIDE, "utf8");
  installResolved(preset.layers, dir, parsed.source, {
    profiles: preset.profiles || [],
    features: preset.metadata?.features || [],
  });
  println();
  println(`  ${style.dim("Next:")} npx architectonic onboard --dir ${JSON.stringify(dir)}`);
  println(`        npx architectonic verify --dir ${JSON.stringify(dir)}`);
  println(`        npx architectonic map --dir ${JSON.stringify(dir)}`);
  if ((preset.metadata?.features || []).includes("graph")) println(`        npx architectonic graph --dir ${JSON.stringify(dir)}`);
}
