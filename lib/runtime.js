import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PKG = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const LAYER_DOCUMENT = JSON.parse(fs.readFileSync(path.join(root, "protocol", "layers.json"), "utf8"));
const PROFILE_DOCUMENT = JSON.parse(fs.readFileSync(path.join(root, "protocol", "profiles.json"), "utf8"));

export const VERSION = PKG.version;
export const PROTOCOL_VERSION = LAYER_DOCUMENT.protocol_version;
export const LAYERS = LAYER_DOCUMENT.layers;
export const LAYER_NAMES = Object.keys(LAYERS);
export const PROFILES = PROFILE_DOCUMENT.profiles;
export const PROFILE_ALIASES = PROFILE_DOCUMENT.profile_aliases || {};
export const LEGACY_PRESET_ALIASES = PROFILE_DOCUMENT.legacy_preset_aliases || {};
export const REPO_URL = PKG.repository?.url?.replace(/^git\+/, "").replace(/\.git$/, "")
  || "https://github.com/architectonic/architectonic";
export const COMMANDS = [
  "init", "add", "list", "doctor", "verify", "map", "status", "diff", "update", "upgrade", "remove", "agent",
];

const noColor = "NO_COLOR" in process.env && process.env.NO_COLOR !== "0";
const useColor = Boolean(!noColor && process.stdout.isTTY && process.env.TERM !== "dumb" && !process.env.CI)
  || Boolean(process.env.FORCE_COLOR && process.env.FORCE_COLOR !== "0");
const esc = (n, value) => (useColor ? `\x1b[${n}m${value}\x1b[0m` : value);
export const style = {
  bold: (value) => esc("1", value),
  dim: (value) => esc("2", value),
  cyan: (value) => esc("36", value),
  green: (value) => esc("32", value),
  yellow: (value) => esc("33", value),
  red: (value) => esc("31", value),
};

export function icon(kind) {
  if (!useColor) return `[${kind}]`;
  const map = {
    ok: style.green("✓"), fail: style.red("✗"), warn: style.yellow("!"),
    info: style.dim("·"), skip: style.dim("–"), plan: style.cyan("→"),
  };
  return map[kind] || style.dim("·");
}

export function println(value = "") { console.log(value); }
export function printErr(value) { console.error(value); }
export function padEnd(value, length) { return value.length >= length ? value : value + " ".repeat(length - value.length); }
export function exists(target) { return fs.existsSync(target); }
export function readJson(target) { return JSON.parse(fs.readFileSync(target, "utf8")); }
export function writeJson(target, value) { fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, "utf8"); }
export function manifestPath(dir) { return path.join(dir, "architectonic.json"); }
export function layerPath(dir, layer) { return path.join(dir, layer); }
export function rel(base, target) { return `./${path.relative(base, target).replace(/\\/g, "/")}`; }
export function shortSha(sha) { return sha ? sha.slice(0, 12) : null; }
export function unique(items) { return [...new Set(items)]; }
export function protocolMinor(version) { return String(version || "").split(".").slice(0, 2).join("."); }

export function run(command, args, options = {}) {
  return spawnSync(command, args, { encoding: "utf8", stdio: "pipe", shell: false, ...options });
}
export function git(cwd, args) { return run("git", args, { cwd }); }
export function gitHead(dir) {
  const result = git(dir, ["rev-parse", "HEAD"]);
  return result.status === 0 ? (result.stdout || "").trim() : null;
}
export function branch(dir) {
  const result = git(dir, ["rev-parse", "--abbrev-ref", "HEAD"]);
  return result.status === 0 ? (result.stdout || "").trim() : null;
}
export function dirty(dir) {
  const result = git(dir, ["status", "--short"]);
  return result.status === 0 ? (result.stdout || "").trim() : null;
}
export function pkgName(dir) {
  try { return readJson(path.join(dir, "package.json")).name || null; } catch { return null; }
}
export function pkgVersion(dir) {
  try { return readJson(path.join(dir, "package.json")).version || null; } catch { return null; }
}
export function ensure(command, message) {
  if (run(command, ["--version"]).status !== 0) throw new Error(message);
}
export function ensureSource(source) {
  if (source === "git") return ensure("git", "git is required on PATH for --source git.");
  if (source === "npm") {
    ensure("npm", "npm is required on PATH for --source npm.");
    ensure("tar", "tar is required on PATH for --source npm.");
    return;
  }
  throw new Error(`Unsupported source: ${source}. Use git or npm.`);
}

export function hashDirectory(directory) {
  if (!exists(directory)) return null;
  const hash = crypto.createHash("sha256");
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name === ".git") continue;
      const absolute = path.join(dir, entry.name);
      const relative = path.relative(directory, absolute).replace(/\\/g, "/");
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) {
        hash.update(relative);
        hash.update("\0");
        hash.update(fs.readFileSync(absolute));
        hash.update("\0");
      }
    }
  };
  visit(directory);
  return `sha256:${hash.digest("hex")}`;
}

export function parse(tokens) {
  const parsed = {
    targets: [], dir: process.cwd(), source: process.env.ARCHITECTONIC_ADD_SOURCE || "git", preset: "full",
    fix: false, force: false, dryRun: false, json: false, spec: null, output: null,
  };
  const valueOptions = new Map([
    ["--dir", "dir"], ["--out", "dir"], ["--source", "source"], ["--preset", "preset"],
    ["--spec", "spec"], ["--output", "output"],
  ]);
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === "--fix") parsed.fix = true;
    else if (token === "--force") parsed.force = true;
    else if (token === "--dry-run") parsed.dryRun = true;
    else if (token === "--json") parsed.json = true;
    else if (valueOptions.has(token)) {
      const value = tokens[++index];
      if (!value) throw new Error(`Missing value for ${token}`);
      const key = valueOptions.get(token);
      parsed[key] = key === "dir" || key === "output" ? path.resolve(value) : value;
    } else if (["--dir=", "--out=", "--source=", "--preset=", "--spec=", "--output="].some((prefix) => token.startsWith(prefix))) {
      const [rawKey, ...rest] = token.split("=");
      const key = valueOptions.get(rawKey);
      const value = rest.join("=");
      parsed[key] = key === "dir" || key === "output" ? path.resolve(value) : value;
    } else if (token === "--help" || token === "-h") continue;
    else if (token.startsWith("-")) throw new Error(`Unknown option: ${token}`);
    else parsed.targets.push(token);
  }
  return parsed;
}

export function parseDirArg(tokens) {
  const parsed = parse(tokens);
  if (parsed.targets.length === 1 && /[\\/]/.test(parsed.targets[0])) {
    parsed.dir = path.resolve(parsed.targets[0]);
    parsed.targets = [];
  }
  return parsed;
}

export function profileName(input, { preset = false } = {}) {
  const legacy = preset ? LEGACY_PRESET_ALIASES[input] : null;
  return legacy || PROFILE_ALIASES[input] || input;
}
export function resolvePreset(input) {
  const name = profileName(input || "full", { preset: true });
  if (!PROFILES[name]) throw new Error(`Unknown preset: ${input}. Use ${Object.keys(PROFILES).join(", ")}.`);
  return { name, layers: [...PROFILES[name]], legacyAlias: LEGACY_PRESET_ALIASES[input] ? input : null };
}
export function resolveAddTargets(targets) {
  const resolved = [];
  for (const target of targets.length ? targets : ["full"]) {
    if (LAYERS[target]) resolved.push(target);
    else {
      const name = profileName(target);
      if (!PROFILES[name]) throw new Error(`Unknown layer or profile: ${target}.`);
      resolved.push(...PROFILES[name]);
    }
  }
  return unique(resolved);
}

export function repoUrl(layer) {
  const base = (process.env.ARCHITECTONIC_SOURCE_BASE || "https://github.com/architectonic").replace(/\\/g, "/");
  return /^(?:[A-Za-z]:\/|\/|\.{1,2}\/)/.test(base) ? path.resolve(base, layer) : `${base}/${layer}.git`;
}
export function packageSpec(layer) {
  const packageName = LAYERS[layer]?.packageName;
  if (!packageName) throw new Error(`No npm package mapping for ${layer}`);
  const base = (process.env.ARCHITECTONIC_NPM_BASE || "").replace(/\\/g, "/");
  if (!base) return packageName;
  return /^(?:[A-Za-z]:\/|\/|\.{1,2}\/)/.test(base)
    ? path.resolve(base, layer)
    : base.endsWith("/") ? `${base}${packageName}` : `${base}/${packageName}`;
}

export function readManifest(dir) {
  return exists(manifestPath(dir)) ? readJson(manifestPath(dir)) : {
    schema_version: 2,
    protocol_version: PROTOCOL_VERSION,
    architectonic_version: VERSION,
    installed_at: new Date().toISOString(),
    profiles: [],
    required_layers: [],
    layers: {},
  };
}
export function writeManifest(dir, manifest) { writeJson(manifestPath(dir), manifest); }
export function load(dir) {
  if (!exists(manifestPath(dir))) throw new Error(`No architectonic.json found in ${dir}`);
  return readJson(manifestPath(dir));
}
export function finishJson(payload, ok = true) {
  if (!ok) process.exitCode = 1;
  println(JSON.stringify(payload, null, 2));
}
