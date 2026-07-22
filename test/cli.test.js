import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const ROOT = path.resolve(import.meta.dirname, "..");
const CLI = path.join(ROOT, "bin", "architectonic.js");
const layers = {
  constitution: ["architectonic-constitution", "constitution.md"],
  doctrine: ["architectonic-doctrine", "doctrine.md"],
  identity: ["architectonic-identity", "START_HERE.md"],
  project: ["architectonic-project", "START_HERE.md"],
  skills: ["architectonic-skills", "README.md"],
  knowledge: ["architectonic-knowledge", "knowledge.md"],
  models: ["architectonic-models", "README.md"],
  agents: ["architectonic-agents", "README.md"],
  rail: ["architectonic-rail", "rail.md"],
  "living-knowledge": ["architectonic-living-knowledge", "living-knowledge.md"],
  meta: ["architectonic-meta", "meta.md"],
};

function run(args, options = {}) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: options.cwd || ROOT,
    env: { ...process.env, NO_COLOR: "1", ...options.env },
    encoding: "utf8",
  });
}

function makeFixtures(temp) {
  const base = path.join(temp, "sources");
  fs.mkdirSync(base, { recursive: true });
  for (const [layer, [packageName, entry]] of Object.entries(layers)) {
    const dir = path.join(base, layer);
    fs.mkdirSync(path.dirname(path.join(dir, entry)), { recursive: true });
    fs.writeFileSync(path.join(dir, "package.json"), `${JSON.stringify({ name: packageName, version: "0.3.0" }, null, 2)}\n`);
    fs.writeFileSync(path.join(dir, "architectonic.protocol.json"), `${JSON.stringify({
      schema_version: 1,
      protocol_version: "0.2.0",
      package_version: "0.3.0",
      package_name: packageName,
      layer,
      canonical_entry: entry,
      status: "experimental",
    }, null, 2)}\n`);
    fs.writeFileSync(path.join(dir, entry), `# ${layer}\n`);
    spawnSync("git", ["init", "-q"], { cwd: dir });
    spawnSync("git", ["add", "."], { cwd: dir });
    spawnSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "fixture"], { cwd: dir });
  }
  return base;
}

function initWorkspace(temp, name = "demo", preset = "project") {
  const base = makeFixtures(temp);
  const result = run(["init", name, "--dir", temp, "--preset", preset, "--source", "git"], {
    env: { ARCHITECTONIC_SOURCE_BASE: base },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return path.join(temp, name);
}

function withTemp(callback) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "architectonic-test-"));
  try { callback(temp); } finally { fs.rmSync(temp, { recursive: true, force: true }); }
}

test("version, self-check, and adaptive help are executable", () => {
  assert.match(run(["--version"]).stdout, /^0\.3\.0\s*$/);
  const checked = run(["--self-check"]);
  assert.equal(checked.status, 0, checked.stderr);
  assert.match(checked.stdout, /assertions/);
  const help = run(["--help"]);
  assert.match(help.stdout, /experimental, pre-1\.0/i);
  assert.match(help.stdout, /architectonic recommend/);
  assert.match(help.stdout, /architectonic graph/);
});

test("recommend can choose no install for disposable work", () => {
  const result = run(["recommend", "--need", "one-off throwaway script", "--json"]);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.install, false);
  assert.deepEqual(payload.layers, []);
});

test("recommend distinguishes changing knowledge from ordinary knowledge", () => {
  const living = run(["recommend", "--need", "changing regulatory corpus", "--json"]);
  assert.equal(living.status, 0, living.stderr);
  const payload = JSON.parse(living.stdout);
  assert.equal(payload.profile, "living-knowledge-system");
  assert.equal(payload.layers.includes("living-knowledge"), true);

  const stable = run(["recommend", "--need", "stable internal knowledge base", "--json"]);
  assert.equal(stable.status, 0, stable.stderr);
  assert.equal(JSON.parse(stable.stdout).layers.includes("living-knowledge"), false);
});

test("constitution, identity, project, and rail initialize as standalone systems", () => {
  for (const preset of ["constitution", "identity", "project", "rail"]) {
    withTemp((temp) => {
      const workspace = initWorkspace(temp, preset, preset);
      const manifest = JSON.parse(fs.readFileSync(path.join(workspace, "architectonic.json"), "utf8"));
      assert.deepEqual(Object.keys(manifest.layers), [preset]);
      assert.equal(run(["verify", "--dir", workspace, "--json"]).status, 0);
    });
  }
});

test("project-system is standalone from organization governance", () => withTemp((temp) => {
  const workspace = initWorkspace(temp, "project-system", "project-system");
  const manifest = JSON.parse(fs.readFileSync(path.join(workspace, "architectonic.json"), "utf8"));
  assert.deepEqual(Object.keys(manifest.layers), ["project", "rail", "knowledge", "skills", "meta"]);
  assert.equal(manifest.layers.constitution, undefined);
  assert.equal(manifest.layers.identity, undefined);
  assert.equal(run(["verify", "--dir", workspace, "--json"]).status, 0);
}));

test("knowledge-system excludes living maintenance while living-knowledge-system includes it", () => {
  withTemp((temp) => {
    const workspace = initWorkspace(temp, "knowledge", "knowledge-system");
    const manifest = JSON.parse(fs.readFileSync(path.join(workspace, "architectonic.json"), "utf8"));
    assert.deepEqual(Object.keys(manifest.layers), ["knowledge", "skills", "meta"]);
    assert.equal(manifest.layers["living-knowledge"], undefined);
  });
  withTemp((temp) => {
    const workspace = initWorkspace(temp, "living", "living-knowledge-system");
    const manifest = JSON.parse(fs.readFileSync(path.join(workspace, "architectonic.json"), "utf8"));
    assert.equal(Boolean(manifest.layers["living-knowledge"]), true);
    assert.equal(Boolean(manifest.layers.rail), true);
    assert.equal(fs.existsSync(path.join(workspace, "organization", "living-knowledge.md")), true);
    assert.equal(fs.existsSync(path.join(workspace, "organization", "knowledge", "wiki", "index.md")), false);
  });
});

test("llm-wiki, second-brain, and loop-system create only their feature scaffolds", () => {
  withTemp((temp) => {
    const workspace = initWorkspace(temp, "wiki", "llm-wiki");
    assert.equal(fs.existsSync(path.join(workspace, "organization", "knowledge", "wiki", "index.md")), true);
    assert.equal(fs.existsSync(path.join(workspace, "organization", "knowledge", ".archive", "README.md")), true);
    assert.equal(fs.existsSync(path.join(workspace, "organization", "brain", "README.md")), false);
  });
  withTemp((temp) => {
    const workspace = initWorkspace(temp, "brain", "second-brain");
    assert.equal(fs.existsSync(path.join(workspace, "organization", "brain", "capture.md")), true);
    assert.equal(fs.existsSync(path.join(workspace, "organization", "knowledge", "wiki", "index.md")), false);
  });
  withTemp((temp) => {
    const workspace = initWorkspace(temp, "loops", "loop-system");
    assert.equal(fs.existsSync(path.join(workspace, "organization", "loops", "index.md")), true);
    assert.equal(fs.existsSync(path.join(workspace, "organization", "loops", "budgets.md")), true);
  });
});

test("custom composition installs exactly the requested layers", () => withTemp((temp) => {
  const workspace = initWorkspace(temp, "custom", "project+knowledge+skills+meta");
  const manifest = JSON.parse(fs.readFileSync(path.join(workspace, "architectonic.json"), "utf8"));
  assert.deepEqual(Object.keys(manifest.layers), ["project", "knowledge", "skills", "meta"]);
  assert.equal(run(["verify", "--dir", workspace, "--json"]).status, 0);
}));

test("living-knowledge alone fails operational verification", () => withTemp((temp) => {
  const workspace = initWorkspace(temp, "bad-living", "living-knowledge");
  const verified = run(["verify", "--dir", workspace, "--json"]);
  assert.equal(verified.status, 1);
  const payload = JSON.parse(verified.stdout);
  assert.equal(payload.root_checks.some((entry) => entry.code === "missing_operational_dependency"), true);
}));

test("onboard repairs missing profile-specific files", () => withTemp((temp) => {
  const workspace = initWorkspace(temp, "wiki", "llm-wiki");
  const localEntry = path.join(workspace, "organization", "knowledge", "wiki", "index.md");
  fs.rmSync(localEntry);
  const failed = run(["verify", "--dir", workspace, "--json"]);
  assert.equal(failed.status, 1);
  const repaired = run(["onboard", "--dir", workspace, "--fix", "--json"]);
  assert.equal(repaired.status, 0, repaired.stderr);
  assert.equal(fs.existsSync(localEntry), true);
  assert.equal(run(["verify", "--dir", workspace, "--json"]).status, 0);
}));

test("graph creates derived JSON and DOT from explicit links", () => withTemp((temp) => {
  const workspace = initWorkspace(temp, "graph", "graph-system");
  const knowledgeDir = path.join(workspace, "organization", "knowledge");
  fs.writeFileSync(path.join(knowledgeDir, "alpha.md"), "# Alpha\n\nSee [[beta]].\n");
  fs.writeFileSync(path.join(knowledgeDir, "beta.md"), "# Beta\n");
  const result = run(["graph", "--dir", workspace, "--format", "both", "--json"]);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.canonical, false);
  assert.equal(payload.edges >= 1, true);
  assert.equal(fs.existsSync(path.join(workspace, ".architectonic", "derived", "graph.json")), true);
  assert.equal(fs.existsSync(path.join(workspace, ".architectonic", "derived", "graph.dot")), true);
  const graph = JSON.parse(fs.readFileSync(path.join(workspace, ".architectonic", "derived", "graph.json"), "utf8"));
  assert.equal(graph.edges.some((edge) => edge.source.endsWith("alpha.md") && edge.target.endsWith("beta.md") && edge.status === "extracted"), true);
}));

test("verify detects missing canonical and local files with failing JSON exit status", () => withTemp((temp) => {
  const workspace = initWorkspace(temp, "knowledge", "knowledge-system");
  fs.rmSync(path.join(workspace, "knowledge", "knowledge.md"));
  fs.rmSync(path.join(workspace, "organization", "knowledge", "index.md"));
  const verified = run(["verify", "--dir", workspace, "--json"]);
  assert.equal(verified.status, 1);
  const payload = JSON.parse(verified.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.root_checks.some((entry) => entry.code === "missing_local_entry"), true);
}));

test("add creates a verifiable standalone layer in an existing repository", () => withTemp((temp) => {
  const base = makeFixtures(temp);
  const workspace = path.join(temp, "existing");
  fs.mkdirSync(workspace);
  fs.writeFileSync(path.join(workspace, "README.md"), "# Existing\n");
  const result = run(["add", "project", "--dir", workspace, "--source", "git"], { env: { ARCHITECTONIC_SOURCE_BASE: base } });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(path.join(workspace, "AGENTS.md")), true);
  assert.equal(run(["verify", "--dir", workspace, "--json"]).status, 0);
}));

test("map exposes profiles, features, local entries, and contracts", () => withTemp((temp) => {
  const workspace = initWorkspace(temp, "wiki", "llm-wiki");
  const mapped = run(["map", "--dir", workspace, "--json"]);
  assert.equal(mapped.status, 0, mapped.stderr);
  const payload = JSON.parse(mapped.stdout);
  assert.deepEqual(payload.profiles, ["llm-wiki"]);
  assert.equal(payload.features.includes("wiki"), true);
  const row = payload.rows.find((entry) => entry.layer === "knowledge");
  assert.equal(row.contract_entry, "./knowledge/knowledge.md");
  assert.equal(row.local_entry, "./organization/knowledge/index.md");
}));
