import fs from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

import { build } from "vite";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, "..");
const distRoot = path.join(webRoot, "dist");
const manifestPath = path.join(distRoot, ".bundle-manifest.json");
const baselinePath = path.join(scriptDir, "bundle-budget.baseline.json");

const defaultBudgets = {
  largestDynamicJsChunkGzipBytes: { minExtraBytes: 2048, percent: 0.15 },
  largestDynamicJsChunkRawBytes: { minExtraBytes: 8192, percent: 0.15 },
  largestJsAssetGzipBytes: { minExtraBytes: 8192, percent: 0.1 },
  largestJsAssetRawBytes: { minExtraBytes: 32768, percent: 0.1 },
  totalCssGzipBytes: { minExtraBytes: 2048, percent: 0.1 },
  totalCssRawBytes: { minExtraBytes: 8192, percent: 0.1 },
};

async function main() {
  const command = getCommand(process.argv.slice(2));

  await build({
    clearScreen: false,
    configFile: path.join(webRoot, "vite.config.ts"),
    root: webRoot,
    build: {
      emptyOutDir: true,
      manifest: ".bundle-manifest.json",
    },
  });

  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  const report = await createBundleReport(manifest);

  printReport(report);

  if (command === "write-baseline") {
    const baseline = {
      version: 1,
      measuredAt: "2026-07-16",
      metrics: report.metrics,
      notes: {
        largestDynamicJsChunkFile: report.largestDynamicJsChunk?.file ?? null,
        largestJsAssetFile: report.largestJsAsset.file,
        topCssFile: report.cssAssets[0]?.file ?? null,
      },
      budgets: defaultBudgets,
    };
    await fs.writeFile(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);
    console.log(`Wrote bundle baseline to ${path.relative(webRoot, baselinePath)}.`);
    return;
  }

  const baseline = await readBaselineIfPresent();
  if (!baseline) {
    console.log("No bundle baseline is present yet. Run the script with --write-baseline to capture one.");
    return;
  }

  printBaselineDelta(report.metrics, baseline.metrics);

  if (command !== "check") {
    return;
  }

  const failures = getBudgetFailures(report.metrics, baseline.metrics, baseline.budgets);
  if (failures.length === 0) {
    console.log("Bundle budgets passed.");
    return;
  }

  console.error("Bundle budget failures:");
  for (const failure of failures) {
    console.error(
      `- ${failure.metric}: current ${formatBytes(failure.current)} > budget ${formatBytes(failure.allowed)} (baseline ${formatBytes(
        failure.baseline,
      )})`,
    );
  }

  process.exitCode = 1;
}

function getCommand(args) {
  if (args.includes("--write-baseline")) {
    return "write-baseline";
  }
  if (args.includes("--check")) {
    return "check";
  }
  return "report";
}

async function createBundleReport(manifest) {
  const assetDirectory = path.join(distRoot, "assets");
  const assetNames = await fs.readdir(assetDirectory);
  const jsAssets = [];
  const cssAssets = [];

  for (const assetName of assetNames.sort()) {
    const assetPath = path.join(assetDirectory, assetName);
    const contents = await fs.readFile(assetPath);
    const asset = {
      file: `assets/${assetName}`,
      gzipBytes: gzipSync(contents).length,
      rawBytes: contents.length,
    };

    if (assetName.endsWith(".js")) {
      jsAssets.push(asset);
    } else if (assetName.endsWith(".css")) {
      cssAssets.push(asset);
    }
  }

  const dynamicJsFiles = new Set(
    Object.values(manifest)
      .filter((entry) => entry?.isDynamicEntry && typeof entry.file === "string" && entry.file.endsWith(".js"))
      .map((entry) => entry.file),
  );

  const dynamicJsAssets = jsAssets
    .filter((asset) => dynamicJsFiles.has(asset.file))
    .sort((left, right) => right.rawBytes - left.rawBytes || right.gzipBytes - left.gzipBytes);

  const largestJsAsset = [...jsAssets].sort((left, right) => right.rawBytes - left.rawBytes || right.gzipBytes - left.gzipBytes)[0];
  const largestDynamicJsChunk = dynamicJsAssets[0] ?? null;

  return {
    cssAssets: [...cssAssets].sort((left, right) => right.rawBytes - left.rawBytes || right.gzipBytes - left.gzipBytes),
    dynamicChunkCount: dynamicJsAssets.length,
    largestDynamicJsChunk,
    largestJsAsset,
    metrics: {
      largestDynamicJsChunkGzipBytes: largestDynamicJsChunk?.gzipBytes ?? 0,
      largestDynamicJsChunkRawBytes: largestDynamicJsChunk?.rawBytes ?? 0,
      largestJsAssetGzipBytes: largestJsAsset.gzipBytes,
      largestJsAssetRawBytes: largestJsAsset.rawBytes,
      totalCssGzipBytes: cssAssets.reduce((sum, asset) => sum + asset.gzipBytes, 0),
      totalCssRawBytes: cssAssets.reduce((sum, asset) => sum + asset.rawBytes, 0),
    },
  };
}

async function readBaselineIfPresent() {
  try {
    return JSON.parse(await fs.readFile(baselinePath, "utf8"));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function getBudgetFailures(currentMetrics, baselineMetrics, budgetConfig) {
  return Object.entries(budgetConfig)
    .map(([metric, budget]) => {
      const baseline = baselineMetrics[metric];
      const current = currentMetrics[metric];
      const percentageLimit = Math.ceil(baseline * (1 + budget.percent));
      const absoluteLimit = baseline + budget.minExtraBytes;
      const allowed = Math.max(percentageLimit, absoluteLimit);
      return { allowed, baseline, current, metric };
    })
    .filter((result) => result.current > result.allowed);
}

function printReport(report) {
  const rows = [
    {
      file: report.largestJsAsset.file,
      gzip: formatBytes(report.largestJsAsset.gzipBytes),
      metric: "largestJsAsset",
      raw: formatBytes(report.largestJsAsset.rawBytes),
    },
    {
      file: report.largestDynamicJsChunk?.file ?? "-",
      gzip: formatBytes(report.largestDynamicJsChunk?.gzipBytes ?? 0),
      metric: "largestDynamicJsChunk",
      raw: formatBytes(report.largestDynamicJsChunk?.rawBytes ?? 0),
    },
    {
      file: report.cssAssets[0]?.file ?? "-",
      gzip: formatBytes(report.metrics.totalCssGzipBytes),
      metric: "totalCss",
      raw: formatBytes(report.metrics.totalCssRawBytes),
    },
  ];

  console.log("Bundle report:");
  console.table(rows);
  console.log(`Dynamic chunk count: ${report.dynamicChunkCount}`);
}

function printBaselineDelta(currentMetrics, baselineMetrics) {
  console.log("Bundle delta versus baseline:");
  console.table(
    Object.keys(currentMetrics).map((metric) => ({
      baseline: formatBytes(baselineMetrics[metric]),
      current: formatBytes(currentMetrics[metric]),
      delta: formatSignedBytes(currentMetrics[metric] - baselineMetrics[metric]),
      metric,
    })),
  );
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(2)} KiB`;
}

function formatSignedBytes(bytes) {
  const prefix = bytes > 0 ? "+" : "";
  return `${prefix}${formatBytes(bytes)}`;
}

await main();
