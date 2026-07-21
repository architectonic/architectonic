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
    fs.writeFileSync(path.join(dir, "package.json"), `${JSON.stringify({ name: packageName, version: "0.2.0" }, null, 2)}\n`);
    fs.writeFileSync(path.join(dir, "architectonic.protocol.json"), `${JSON.stringify({ schema_version: 1, protocol_version: "0.2.0", package_version: "0.2.0", package_name: packageName, layer, canonical_entry: entry, status: "experimental" }, null, 2)}\n`);
    fs.writeFileSync(path.join(dir, entry), `# ${layer}\n`);
    spawnSync("git", ["init", "-q"], { cwd: dir });
    spawnSync("git", ["add", "."], { cwd: dir });
    spawnSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "fixture"], { cwd: dir });
  }
  return base;
}

function initWorkspace(temp, name = "demo", preset = "knowledge-system") {
  const base = makeFixtures(temp);
  const result = run(["init", name, "--dir", temp, "--preset", preset, "--source", "git"], { env: { ARCHITECTONIC_SOURCE_BASE: base } });
  assert.equal(result.status, 0, result.stderr);
  return path.join(temp, name);
}

test("self-check and help are executable", () => {
  assert.equal(run(["--self-check"]).status, 0);
  const help = run(["--help"]);
  assert.match(help.stdout, /experimental, pre-1\.0/i);
  assert.match(help.stdout, /architectonic onboard/);
});

test("knowledge-system installs exactly its declared partial profile", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "architectonic-test-"));
  try {
    const workspace = initWorkspace(temp, "knowledge-demo");
    const manifest = JSON.parse(fs.readFileSync(path.join(workspace, "architectonic.json"), "utf8"));
    assert.deepEqual(Object.keys(manifest.layers), ["constitution", "doctrine", "knowledge", "living-knowledge", "meta"]);
    assert.equal(run(["doctor", "--dir", workspace, "--json"]).status, 0);
    assert.equal(run(["verify", "--dir", workspace, "--json"]).status, 0);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test("init creates organization-owned documents and document-guided onboarding", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "architectonic-test-"));
  try {
    const workspace = initWorkspace(temp);
    assert.equal(fs.existsSync(path.join(workspace, "ONBOARDING.md")), true);
    assert.equal(fs.existsSync(path.join(workspace, "organization", "constitution.md")), true);
    assert.equal(fs.existsSync(path.join(workspace, "organization", "knowledge", "index.md")), true);
    assert.match(fs.readFileSync(path.join(workspace, "AGENTS.md"), "utf8"), /Inspect existing documents and source artifacts before asking the human/i);
    assert.match(fs.readFileSync(path.join(workspace, "ONBOARDING.md"), "utf8"), /ask the human targeted questions tied to those gaps/i);
    assert.equal(run(["onboard", "--dir", workspace, "--json"]).status, 0);
    const heading = fs.readFileSync(path.join(workspace, "README.md"), "utf8").split("\n", 1)[0];
    assert.equal(heading, "# demo");
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test("add constitution installs one layer rather than the full profile", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "architectonic-test-"));
  try {
    const base = makeFixtures(temp);
    const workspace = path.join(temp, "workspace");
    fs.mkdirSync(workspace);
    const result = run(["add", "constitution", "--dir", workspace, "--source", "git"], { env: { ARCHITECTONIC_SOURCE_BASE: base } });
    assert.equal(result.status, 0, result.stderr);
    const manifest = JSON.parse(fs.readFileSync(path.join(workspace, "architectonic.json"), "utf8"));
    assert.deepEqual(Object.keys(manifest.layers), ["constitution"]);
    assert.equal(fs.existsSync(path.join(workspace, "organization", "constitution.md")), true);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test("verify detects a missing canonical entry and returns a failing JSON exit code", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "architectonic-test-"));
  try {
    const workspace = initWorkspace(temp);
    fs.rmSync(path.join(workspace, "knowledge", "knowledge.md"));
    const verified = run(["verify", "--dir", workspace, "--json"]);
    assert.equal(verified.status, 1);
    assert.equal(JSON.parse(verified.stdout).ok, false);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test("verify detects a missing local organization entry and onboard repairs it", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "architectonic-test-"));
  try {
    const workspace = initWorkspace(temp);
    const localEntry = path.join(workspace, "organization", "knowledge", "index.md");
    fs.rmSync(localEntry);
    const failed = run(["verify", "--dir", workspace, "--json"]);
    assert.equal(failed.status, 1);
    assert.equal(JSON.parse(failed.stdout).root_checks.some((entry) => entry.code === "missing_local_entry"), true);
    const repaired = run(["onboard", "--dir", workspace, "--fix", "--json"]);
    assert.equal(repaired.status, 0, repaired.stderr);
    assert.equal(fs.existsSync(localEntry), true);
    assert.equal(run(["verify", "--dir", workspace, "--json"]).status, 0);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test("doctor failure in JSON mode returns a failing process status", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "architectonic-test-"));
  try {
    const workspace = initWorkspace(temp);
    fs.rmSync(path.join(workspace, "doctrine", "package.json"));
    const checked = run(["doctor", "--dir", workspace, "--json"]);
    assert.equal(checked.status, 1);
    assert.equal(JSON.parse(checked.stdout).ok, false);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test("map exposes local organization entries alongside upstream contracts", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "architectonic-test-"));
  try {
    const workspace = initWorkspace(temp);
    const mapped = run(["map", "--dir", workspace, "--json"]);
    assert.equal(mapped.status, 0, mapped.stderr);
    const row = JSON.parse(mapped.stdout).rows.find((entry) => entry.layer === "knowledge");
    assert.equal(row.entry, "./knowledge/knowledge.md");
    assert.equal(row.contract_entry, "./knowledge/knowledge.md");
    assert.equal(row.local_entry, "./organization/knowledge/index.md");
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
