import {
  NEED_RULES, PROFILE_METADATA, PROFILES, finishJson, padEnd, parse, println, style, unique,
} from "./runtime.js";

function containsSignal(text, signal) {
  return text.includes(signal.toLowerCase());
}

function setContains(container, required) {
  const values = new Set(container);
  return required.every((value) => values.has(value));
}

function chooseProfile(requiredLayers, requiredFeatures) {
  const candidates = Object.entries(PROFILES)
    .map(([name, layers]) => ({
      name,
      layers,
      features: PROFILE_METADATA[name]?.features || [],
      extra: layers.filter((layer) => !requiredLayers.includes(layer)).length,
    }))
    .filter((candidate) => setContains(candidate.layers, requiredLayers) && setContains(candidate.features, requiredFeatures))
    .sort((a, b) => a.extra - b.extra || a.layers.length - b.layers.length || a.name.localeCompare(b.name));
  const best = candidates[0];
  if (!best) return null;
  const tolerance = Math.max(1, Math.floor(requiredLayers.length * 0.25));
  return best.extra <= tolerance ? best : null;
}

function customPreset(layers) { return layers.join("+"); }

function warningsFor(features, rules) {
  const warnings = [];
  if (features.includes("graph")) warnings.push("Graphs are rebuildable projections. Canonical Markdown and recoverable sources remain authoritative.");
  if (features.includes("work-graph")) warnings.push("Use one canonical work ledger. Backlog, queue, now, status, and dashboards remain projections.");
  if (features.includes("loops")) warnings.push("A loop needs durable state, a budget, a verifier, a stop condition, and a human-controlled authority gate.");
  if (rules.some((rule) => rule.id === "living-knowledge" || rule.id === "llm-wiki")) warnings.push("Use living knowledge only when correctness decays as external sources change; otherwise use ordinary knowledge.");
  if (rules.some((rule) => rule.id === "agents" || rule.id === "loops")) warnings.push("Installing an agent or skill does not grant runtime authority. Permissions and external effects remain local decisions.");
  return warnings;
}

export function recommend(tokens) {
  const parsed = parse(tokens);
  const need = (parsed.need || parsed.targets.join(" ")).trim();

  if (!need) {
    const rows = Object.entries(PROFILES).map(([name, layers]) => ({
      profile: name,
      layers,
      summary: PROFILE_METADATA[name]?.summary || "",
      use_when: PROFILE_METADATA[name]?.use_when || "",
    }));
    if (parsed.json) return finishJson({ command: "recommend", need: null, profiles: rows }, true);
    println(`${style.bold("architectonic recommend")} ${style.dim("available adaptive profiles")}`);
    println();
    for (const row of rows) {
      println(`  ${style.bold(padEnd(row.profile, 24))}${row.summary}`);
      println(style.dim(`    ${row.layers.join(" + ")}`));
    }
    println();
    println(style.dim("  Pass a need: architectonic recommend --need \"changing regulatory corpus\""));
    return;
  }

  const normalized = need.toLowerCase();
  const matched = NEED_RULES.filter((rule) => (rule.signals || []).some((signal) => containsSignal(normalized, signal)));
  const substantive = matched.filter((rule) => !rule.no_install);
  const oneOff = matched.find((rule) => rule.no_install);

  if (oneOff) {
    const result = {
      command: "recommend",
      need,
      profile: null,
      layers: [],
      features: [],
      install: false,
      reasons: [oneOff.reason],
      next: "Use the repository's existing instructions or a small AGENTS.md; do not install structure that will not change future action.",
      warnings: [],
    };
    if (parsed.json) return finishJson(result, true);
    println(`${style.bold("architectonic recommend")} ${style.dim(need)}`);
    println();
    println("  No Architectonic profile is justified yet.");
    println(style.dim(`  ${result.reasons[0]}`));
    println();
    println(`  ${result.next}`);
    return;
  }

  const effective = substantive.length ? substantive : [{
    id: "bounded-project",
    layers: ["project"],
    features: [],
    reason: "No specialized signal was found, so start with the smallest durable operating unit rather than the full system.",
  }];
  const requiredLayers = unique(effective.flatMap((rule) => rule.layers || []));
  const requiredFeatures = unique(effective.flatMap((rule) => rule.features || []));
  const profile = chooseProfile(requiredLayers, requiredFeatures);
  const layers = profile ? [...profile.layers] : requiredLayers;
  const profileName = profile?.name || "custom";
  const preset = profile ? profile.name : customPreset(layers);
  const warnings = warningsFor(requiredFeatures, effective);
  const result = {
    command: "recommend",
    need,
    profile: profileName,
    preset,
    layers,
    required_layers: requiredLayers,
    features: requiredFeatures,
    install: true,
    reasons: effective.map((rule) => rule.reason),
    warnings,
    next: `npx architectonic@latest init my-workspace --preset ${preset} --source npm`,
  };

  if (parsed.json) return finishJson(result, true);
  println(`${style.bold("architectonic recommend")} ${style.dim(need)}`);
  println();
  println(`  ${style.bold("Profile")}   ${profileName}`);
  println(`  ${style.bold("Layers")}    ${layers.join(" + ")}`);
  if (requiredFeatures.length) println(`  ${style.bold("Features")}  ${requiredFeatures.join(", ")}`);
  println();
  for (const reason of result.reasons) println(`  - ${reason}`);
  if (warnings.length) {
    println();
    for (const warning of warnings) println(style.dim(`  ! ${warning}`));
  }
  println();
  println(`  ${result.next}`);
}
