#!/usr/bin/env node

/**
 * Compare two api-stats.json files and output a markdown summary.
 * Usage: node compare-stats.mjs <base-stats.json> <pr-stats.json>
 */

import { readFileSync } from "fs";

const [basePath, prPath] = process.argv.slice(2);

if (!basePath || !prPath) {
  console.error("Usage: node compare-stats.mjs <base-stats.json> <pr-stats.json>");
  process.exit(1);
}

let base, pr;
try {
  base = JSON.parse(readFileSync(basePath, "utf8"));
} catch {
  // Base stats not available (e.g. first time adding compat data)
  base = null;
}
pr = JSON.parse(readFileSync(prPath, "utf8"));

// Show these platforms in the table (skip individual clay sub-platforms for readability)
const PLATFORMS = ["android", "ios", "harmony", "web_lynx", "clay"];
const PLATFORM_NAMES = {
  android: "Android",
  ios: "iOS",
  harmony: "HarmonyOS",
  web_lynx: "Web",
  clay: "Clay",
};

// Categories split by group
const PLATFORM_API_CATEGORIES = [
  "elements",
  "css/properties",
  "css/at-rule",
  "css/data-type",
  "lynx-api/global",
  "lynx-api/event",
  "lynx-api/fetch",
  "lynx-api/lynx",
  "lynx-api/selector-query",
  "lynx-api/nodes-ref",
  "lynx-api/intersection-observer",
  "lynx-api/main-thread",
  "lynx-api/performance-api",
];

const OTHER_CATEGORIES = [
  "lynx-native-api",
  "react",
  "devtool",
  "errors",
];

const CATEGORY_NAMES = {
  elements: "Elements",
  "css/properties": "CSS Properties",
  "css/at-rule": "CSS At-Rules",
  "css/data-type": "CSS Data Types",
  "lynx-api/global": "Lynx Global API",
  "lynx-api/event": "Lynx Event API",
  "lynx-api/fetch": "Lynx Fetch API",
  "lynx-api/lynx": "lynx.*",
  "lynx-api/selector-query": "Lynx Selector Query",
  "lynx-api/nodes-ref": "Lynx Nodes Ref",
  "lynx-api/intersection-observer": "Lynx Intersection Observer",
  "lynx-api/main-thread": "Lynx Main Thread API",
  "lynx-api/performance-api": "Lynx Performance API",
  "lynx-native-api": "Native API",
  react: "React",
  devtool: "DevTool",
  errors: "Errors",
};

function fmtDelta(before, after) {
  const d = after - before;
  if (d > 0) return `+${d}`;
  if (d < 0) return `${d}`;
  return "-";
}

function fmtDeltaPct(before, after) {
  const d = after - before;
  if (d > 0) return `+${d}%`;
  if (d < 0) return `${d}%`;
  return "-";
}

let md = "<!-- lynx-compat-data-stats -->\n";
md += "## Lynx Compat Data Stats\n\n";

// Platform API total (used for coverage denominator)
const baseTotal = base?.summary?.platform_api_total ?? base?.summary?.total_apis ?? 0;
const prTotal = pr.summary.platform_api_total ?? pr.summary.total_apis;
const totalDelta = prTotal - baseTotal;
if (totalDelta !== 0) {
  md += `**Lynx Platform API:** ${prTotal} (${totalDelta > 0 ? "+" : ""}${totalDelta})\n\n`;
} else {
  md += `**Lynx Platform API:** ${prTotal}\n\n`;
}

// Platform coverage table
md += "### Platform Coverage\n\n";
md += "| Platform | Supported | Coverage | Δ Supported | Δ Coverage |\n";
md += "|----------|-----------|----------|-------------|------------|\n";

for (const p of PLATFORMS) {
  const bp = base?.summary?.by_platform?.[p];
  const pp = pr.summary.by_platform[p];
  if (!pp) continue;
  const dSupported = fmtDelta(bp?.supported_count ?? 0, pp.supported_count);
  const dCoverage = fmtDeltaPct(bp?.coverage_percent ?? 0, pp.coverage_percent);
  md += `| ${PLATFORM_NAMES[p]} | ${pp.supported_count} | ${pp.coverage_percent}% | ${dSupported} | ${dCoverage} |\n`;
}

md += "\n";

// Helper: render a category table for a list of category keys
function renderCategoryTable(categories) {
  let out = "| Category | Total |";
  for (const p of PLATFORMS) {
    out += ` ${PLATFORM_NAMES[p]} |`;
  }
  out += "\n";
  out += "|----------|-------|";
  for (let i = 0; i < PLATFORMS.length; i++) {
    out += "---------|";
  }
  out += "\n";

  for (const cat of categories) {
    const bc = base?.summary?.by_category?.[cat];
    const pc = pr.summary.by_category[cat];
    if (!pc) continue;

    // Total column with delta
    const catTotalDelta = pc.total - (bc?.total ?? 0);
    const totalStr =
      catTotalDelta !== 0
        ? `${pc.total} (${catTotalDelta > 0 ? "+" : ""}${catTotalDelta})`
        : `${pc.total}`;

    out += `| ${CATEGORY_NAMES[cat] ?? cat} | ${totalStr} |`;

    // Per-platform coverage with delta
    for (const p of PLATFORMS) {
      const prCov = pc.coverage[p];
      if (prCov === null || prCov === undefined) {
        out += ` N/A |`;
        continue;
      }
      const baseCov = bc?.coverage?.[p] ?? 0;
      const covDelta = prCov - baseCov;
      if (covDelta !== 0) {
        out += ` ${prCov}% (${covDelta > 0 ? "+" : ""}${covDelta}) |`;
      } else {
        out += ` ${prCov}% |`;
      }
    }
    out += "\n";
  }

  return out;
}

// Category breakdown: Lynx Platform API
md += "### Lynx Platform API\n\n";
md += renderCategoryTable(PLATFORM_API_CATEGORIES);
md += "\n";

// Category breakdown: Other
md += "### Other\n\n";
md += renderCategoryTable(OTHER_CATEGORIES);
md += "\n";

md += `<sub>Generated at ${pr.generated_at}</sub>\n`;

process.stdout.write(md);
