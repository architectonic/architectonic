import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "architectonic-pack-"));
const run = (command, args, cwd = root) => spawnSync(command, args, { cwd, encoding: "utf8", stdio: "pipe" });
try {
  const packed = run("npm", ["pack", "--pack-destination", temp]);
  if (packed.status !== 0) throw new Error(packed.stderr || packed.stdout);
  const archive = packed.stdout.trim().split(/\r?\n/).filter(Boolean).pop();
  const extracted = run("tar", ["-xzf", path.join(temp, archive), "-C", temp]);
  if (extracted.status !== 0) throw new Error(extracted.stderr || extracted.stdout);
  const check = run("node", ["bin/architectonic.js", "--self-check"], path.join(temp, "package"));
  if (check.status !== 0) throw new Error(check.stderr || check.stdout);
  console.log(check.stdout.trim());
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
