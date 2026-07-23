import fs from "node:fs";
import path from "node:path";
import {
  exists, finishJson, load, normalizePath, parseDirArg, println, rel, resolveManagedPath, style, writeJson,
} from "./runtime.js";

const EXCLUDED_DIRECTORIES = new Set([
  ".git", ".architectonic", "node_modules", "dist", "reports", "operations", ".sessions", ".archive", "archive",
]);
const QUIET_FILES = new Set(["readme.md", "index.md", "log.md"]);

function walkMarkdown(base, scope, workspace) {
  const files = [];
  if (!exists(base)) return files;
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isDirectory() && EXCLUDED_DIRECTORIES.has(entry.name)) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
        files.push({ absolute, id: normalizePath(path.relative(workspace, absolute)), scope });
      }
    }
  };
  visit(base);
  return files;
}

function parseFrontmatter(text) {
  if (!text.startsWith("---")) return {};
  const end = text.indexOf("\n---", 3);
  if (end < 0) return {};
  const block = text.slice(3, end).trim();
  const result = {};
  for (const line of block.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    const [, key, raw] = match;
    const value = raw.trim().replace(/^['"]|['"]$/g, "");
    if (key === "tags") result[key] = value.replace(/^\[|\]$/g, "").split(",").map((item) => item.trim()).filter(Boolean);
    else result[key] = value;
  }
  return result;
}

function titleFromText(text, fallback) {
  return text.match(/^#\s+(.+)$/m)?.[1]?.trim() || fallback;
}

function extractRawLinks(text) {
  const links = [];
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) links.push({ raw: match[1].trim(), kind: "markdown" });
  for (const match of text.matchAll(/\[\[([^\]]+)\]\]/g)) {
    const raw = match[1].split("|")[0].split("#")[0].trim();
    links.push({ raw, kind: "wikilink" });
  }
  return links;
}

function cleanTarget(raw) {
  const value = raw.replace(/^<|>$/g, "").split("#")[0].split("?")[0].trim();
  if (!value || /^(?:[a-z]+:|#)/i.test(value)) return null;
  try { return decodeURIComponent(value); } catch { return value; }
}

function buildIndexes(nodes) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const byStem = new Map();
  for (const node of nodes) {
    const stem = path.basename(node.id, path.extname(node.id)).toLowerCase();
    const values = byStem.get(stem) || [];
    values.push(node.id);
    byStem.set(stem, values);
  }
  return { byId, byStem };
}

function resolveLink(sourceId, raw, kind, indexes) {
  const cleaned = cleanTarget(raw);
  if (!cleaned) return { ignored: true };
  const sourceDir = path.posix.dirname(sourceId);
  const candidates = [];
  const normalized = normalizePath(cleaned);
  if (normalized.startsWith("/")) candidates.push(normalized.slice(1));
  else candidates.push(path.posix.normalize(path.posix.join(sourceDir, normalized)));
  if (!path.posix.extname(normalized)) {
    candidates.push(`${candidates[0]}.md`);
    candidates.push(path.posix.join(candidates[0], "index.md"));
  }
  for (const candidate of candidates) if (indexes.byId.has(candidate)) return { target: candidate, ambiguous: false };
  if (kind === "wikilink") {
    const stem = path.posix.basename(normalized).toLowerCase();
    const matches = indexes.byStem.get(stem) || [];
    if (matches.length === 1) return { target: matches[0], ambiguous: false };
    if (matches.length > 1) return { target: null, ambiguous: true, candidates: matches };
  }
  return { target: null, ambiguous: false, candidates };
}

function buildGraph(workspace, manifest, includeContracts) {
  const roots = [{ absolute: path.join(workspace, "organization"), scope: "organization" }];
  if (includeContracts) {
    for (const [layer, item] of Object.entries(manifest.layers || {})) {
      roots.push({ absolute: resolveManagedPath(workspace, item.path || `./${layer}`), scope: `contract:${layer}` });
    }
  }
  const files = roots.flatMap((root) => walkMarkdown(root.absolute, root.scope, workspace));
  const nodes = files.map((file) => {
    const text = fs.readFileSync(file.absolute, "utf8");
    const metadata = parseFrontmatter(text);
    return {
      id: file.id,
      title: metadata.title || titleFromText(text, path.basename(file.id, ".md")),
      type: metadata.type || "Document",
      status: metadata.status || "unclassified",
      tags: metadata.tags || [],
      scope: file.scope,
      canonical: true,
      _text: text,
    };
  });
  const indexes = buildIndexes(nodes);
  const edges = [];
  const broken = [];
  const seen = new Set();
  for (const node of nodes) {
    for (const link of extractRawLinks(node._text)) {
      const resolved = resolveLink(node.id, link.raw, link.kind, indexes);
      if (resolved.ignored) continue;
      if (!resolved.target) {
        broken.push({ source: node.id, target: link.raw, kind: link.kind, ambiguous: Boolean(resolved.ambiguous), candidates: resolved.candidates || [] });
        continue;
      }
      const key = `${node.id}\0${resolved.target}\0${link.kind}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ source: node.id, target: resolved.target, relation: "links_to", kind: link.kind, status: "extracted" });
    }
  }
  for (const node of nodes) delete node._text;

  const degree = new Map(nodes.map((node) => [node.id, 0]));
  for (const edge of edges) {
    degree.set(edge.source, (degree.get(edge.source) || 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) || 0) + 1);
  }
  const orphans = nodes
    .filter((node) => (degree.get(node.id) || 0) === 0 && !QUIET_FILES.has(path.basename(node.id).toLowerCase()))
    .map((node) => node.id);
  const gravityThreshold = Math.max(8, Math.ceil(nodes.length * 0.25));
  const gravityWells = nodes
    .map((node) => ({ id: node.id, degree: degree.get(node.id) || 0 }))
    .filter((node) => node.degree >= gravityThreshold)
    .sort((a, b) => b.degree - a.degree);

  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    canonical: false,
    projection_policy: "This graph is derived from explicit Markdown and wikilinks. It must be rebuildable and must not replace canonical documents or source evidence.",
    roots: roots.map((root) => ({ path: rel(workspace, root.absolute), scope: root.scope })),
    nodes,
    edges,
    findings: {
      broken_links: broken,
      orphans,
      gravity_wells: gravityWells,
    },
  };
}

function dotEscape(value) { return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " "); }

function toDot(graph) {
  const lines = ["digraph architectonic {", "  rankdir=LR;", "  node [shape=box];"];
  for (const node of graph.nodes) lines.push(`  "${dotEscape(node.id)}" [label="${dotEscape(node.title)}\\n${dotEscape(node.type)}"];`);
  for (const edge of graph.edges) lines.push(`  "${dotEscape(edge.source)}" -> "${dotEscape(edge.target)}" [label="${dotEscape(edge.relation)}"];`);
  lines.push("}");
  return `${lines.join("\n")}\n`;
}

export function graphCommand(tokens) {
  const parsed = parseDirArg(tokens);
  if (!new Set(["json", "dot", "both"]).has(parsed.format)) throw new Error("graph --format must be json, dot, or both");
  const manifest = load(parsed.dir);
  const graph = buildGraph(parsed.dir, manifest, parsed.includeContracts);
  const outputDir = parsed.output || path.join(parsed.dir, ".architectonic", "derived");
  fs.mkdirSync(outputDir, { recursive: true });
  const files = [];
  if (parsed.format === "json" || parsed.format === "both") {
    const target = path.join(outputDir, "graph.json");
    writeJson(target, graph);
    files.push(rel(parsed.dir, target));
  }
  if (parsed.format === "dot" || parsed.format === "both") {
    const target = path.join(outputDir, "graph.dot");
    fs.writeFileSync(target, toDot(graph), "utf8");
    files.push(rel(parsed.dir, target));
  }
  const summary = {
    command: "graph",
    root: parsed.dir,
    canonical: false,
    include_contracts: parsed.includeContracts,
    nodes: graph.nodes.length,
    edges: graph.edges.length,
    broken_links: graph.findings.broken_links.length,
    orphans: graph.findings.orphans.length,
    gravity_wells: graph.findings.gravity_wells.length,
    files,
  };
  if (parsed.json) return finishJson(summary, true);
  println(`${style.bold("architectonic graph")} ${style.dim(`root: ${parsed.dir}`)}`);
  println();
  println(`  nodes          ${summary.nodes}`);
  println(`  explicit edges ${summary.edges}`);
  println(`  broken links   ${summary.broken_links}`);
  println(`  orphans        ${summary.orphans}`);
  println();
  for (const file of files) println(`  wrote ${file}`);
  println();
  println(style.dim("  Derived projection only. Obsidian may visualize the Markdown directly; Graphify or GraphRAG may create richer inferred projections with provenance."));
}
