import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { resolveManagedPath } from "../lib/runtime.js";

const ROOT = path.resolve(import.meta.dirname, "..");
const CLI = path.join(ROOT, "bin", "architectonic.js");

function withTemp(callback) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "architectonic-managed-path-"));
  try { callback(temp); } finally { fs.rmSync(temp, { recursive: true, force: true }); }
}

test("managed paths reject traversal, absolute paths, workspace root, and symlink escapes", () => withTemp((temp) => {
  const workspace = path.join(temp, "workspace");
  const outside = path.join(temp, "outside");
  fs.mkdirSync(path.join(workspace, "layers", "valid"), { recursive: true });
  fs.mkdirSync(outside, { recursive: true });

  assert.throws(() => resolveManagedPath(workspace, "../outside"), /escapes the workspace/);
  assert.throws(() => resolveManagedPath(workspace, outside), /escapes the workspace/);
  assert.throws(() => resolveManagedPath(workspace, "."), /escapes the workspace/);
  assert.equal(resolveManagedPath(workspace, "layers/valid"), path.join(workspace, "layers", "valid"));
  assert.equal(resolveManagedPath(workspace, "layers/missing"), path.join(workspace, "layers", "missing"));

  const link = path.join(workspace, "outside-link");
  fs.symlinkSync(outside, link, process.platform === "win32" ? "junction" : "dir");
  assert.throws(() => resolveManagedPath(workspace, "outside-link"), /through a symlink/);
  assert.throws(() => resolveManagedPath(workspace, "outside-link/missing"), /through a symlink/);
}));

test("--force cannot remove a manifest path outside the workspace", () => withTemp((temp) => {
  const workspace = path.join(temp, "workspace");
  const outside = path.join(temp, "outside");
  fs.mkdirSync(workspace, { recursive: true });
  fs.mkdirSync(outside, { recursive: true });
  fs.writeFileSync(path.join(outside, "sentinel.txt"), "preserve\n");
  fs.writeFileSync(path.join(workspace, "architectonic.json"), `${JSON.stringify({
    schema_version: 3,
    protocol_version: "0.2.0",
    architectonic_version: "0.4.0",
    profiles: [],
    features: [],
    required_layers: ["project"],
    layers: {
      project: {
        source: "npm",
        path: "../outside",
        package_name: "architectonic-project",
      },
    },
  }, null, 2)}\n`);

  const result = spawnSync(process.execPath, [CLI, "remove", "project", "--dir", workspace, "--force"], {
    cwd: ROOT,
    env: { ...process.env, NO_COLOR: "1" },
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /managed path escapes the workspace/);
  assert.equal(fs.existsSync(path.join(outside, "sentinel.txt")), true);
}));
