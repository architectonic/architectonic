import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const ROOT = path.resolve(import.meta.dirname, "..");
const CLI = path.join(ROOT, "bin", "architectonic.js");

function run(args, environment = {}) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: ROOT,
    env: { ...process.env, NO_COLOR: "1", ...environment },
    encoding: "utf8",
  });
}

function createLayerRepository(base, layer) {
  const directory = path.join(base, layer);
  fs.mkdirSync(directory, { recursive: true });
  const packageName = layer === "project" ? "architectonic-project" : "architectonic-rail";
  fs.writeFileSync(
    path.join(directory, "package.json"),
    `${JSON.stringify({ name: packageName, version: "0.3.0" }, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(directory, "architectonic.protocol.json"),
    `${JSON.stringify({
      schema_version: 1,
      protocol_version: "0.2.0",
      package_version: "0.3.0",
      package_name: packageName,
      layer,
      canonical_entry: layer === "project" ? "START_HERE.md" : "rail.md",
      status: "experimental",
    }, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(directory, layer === "project" ? "START_HERE.md" : "rail.md"),
    `# ${layer}\n`,
  );

  if (layer === "rail") {
    fs.mkdirSync(path.join(directory, "templates"), { recursive: true });
    fs.writeFileSync(
      path.join(directory, "templates", "ledger.json"),
      `${JSON.stringify({
        schema_version: "1.0",
        project: "replace-with-project-id",
        updated: "YYYY-MM-DD",
        items: [],
      }, null, 2)}\n`,
    );
  }

  spawnSync("git", ["init", "-q"], { cwd: directory });
  spawnSync("git", ["add", "."], { cwd: directory });
  const committed = spawnSync(
    "git",
    ["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "fixture"],
    { cwd: directory, encoding: "utf8" },
  );
  assert.equal(committed.status, 0, committed.stderr || committed.stdout);
}

function withTemp(callback) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "architectonic-init-rollback-"));
  try {
    callback(temporary);
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

test("failed init removes a newly created partial target and can be retried", () => withTemp((temporary) => {
  const sources = path.join(temporary, "sources");
  fs.mkdirSync(sources, { recursive: true });
  createLayerRepository(sources, "project");

  const target = path.join(temporary, "workspace");
  const environment = { ARCHITECTONIC_SOURCE_BASE: sources };
  const failed = run(
    ["init", "workspace", "--dir", temporary, "--preset", "project+rail", "--source", "git"],
    environment,
  );

  assert.notEqual(failed.status, 0);
  assert.match(`${failed.stderr}\n${failed.stdout}`, /Failed to clone/);
  assert.equal(fs.existsSync(target), false, "new target should be removed after rollback");

  createLayerRepository(sources, "rail");
  const retried = run(
    ["init", "workspace", "--dir", temporary, "--preset", "project+rail", "--source", "git"],
    environment,
  );

  assert.equal(retried.status, 0, retried.stderr || retried.stdout);
  assert.equal(fs.existsSync(path.join(target, "architectonic.json")), true);
  assert.equal(fs.existsSync(path.join(target, "operations", "ledger.json")), true);
}));

test("failed init preserves a pre-existing empty target as empty", () => withTemp((temporary) => {
  const sources = path.join(temporary, "sources");
  fs.mkdirSync(sources, { recursive: true });
  createLayerRepository(sources, "project");

  const target = path.join(temporary, "workspace");
  fs.mkdirSync(target);
  const failed = run(
    ["init", "workspace", "--dir", temporary, "--preset", "project+rail", "--source", "git"],
    { ARCHITECTONIC_SOURCE_BASE: sources },
  );

  assert.notEqual(failed.status, 0);
  assert.equal(fs.existsSync(target), true);
  assert.deepEqual(fs.readdirSync(target), []);
}));
