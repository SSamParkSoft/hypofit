import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const toolRoot = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(toolRoot, "../..");
const outputRoot = path.join(repositoryRoot, "docs/store-assets/marketing/export");
const chromeExecutable = await findChromeExecutable();
const targets = [
  ...[1, 2, 3].map((frame) => ({
    format: "apple",
    frame,
    width: 1320,
    height: 2868,
    output: path.join(outputRoot, "app-store", `apple-ko-0${frame}-1320x2868.png`),
  })),
  ...[1, 2, 3, 4].map((frame) => ({
    format: "play",
    frame,
    width: 1080,
    height: 1920,
    output: path.join(outputRoot, "google-play", `play-ko-0${frame}-1080x1920.png`),
  })),
  {
    format: "readme",
    frame: 1,
    width: 1200,
    height: 630,
    pixelRatio: 2,
    output: path.join(outputRoot, "readme", "hypofit-product-showcase-2400x1260.png"),
  },
  {
    format: "feature",
    frame: 1,
    width: 1024,
    height: 500,
    output: path.join(outputRoot, "google-play", "hypofit-feature-graphic-1024x500.png"),
  },
];

await fs.rm(outputRoot, { force: true, recursive: true });

for (const target of targets) {
  await fs.mkdir(path.dirname(target.output), { recursive: true });
  const profileDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "hypofit-creative-"));
  const pageUrl = new URL(pathToFileURL(path.join(toolRoot, "index.html")));
  pageUrl.searchParams.set("format", target.format);
  pageUrl.searchParams.set("frame", String(target.frame));

  try {
    await captureWithChrome([
      "--headless=new",
      "--hide-scrollbars",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--allow-file-access-from-files",
      `--force-device-scale-factor=${target.pixelRatio ?? 1}`,
      `--user-data-dir=${profileDirectory}`,
      `--window-size=${target.width},${target.height}`,
      `--screenshot=${target.output}`,
      "--run-all-compositor-stages-before-draw",
      "--virtual-time-budget=5000",
      pageUrl.href,
    ], target.output);
  } finally {
    await fs.rm(profileDirectory, { force: true, maxRetries: 8, recursive: true, retryDelay: 125 });
  }

  const dimensions = await readPngDimensions(target.output);
  assert(
    dimensions.width === target.width * (target.pixelRatio ?? 1) &&
      dimensions.height === target.height * (target.pixelRatio ?? 1),
    `${path.basename(target.output)}: expected ${target.width * (target.pixelRatio ?? 1)}x${target.height * (target.pixelRatio ?? 1)}, got ${dimensions.width}x${dimensions.height}`,
  );
  console.log(`Exported ${path.relative(repositoryRoot, target.output)}`);
}

console.log(`Validated ${targets.length} store creative assets.`);

async function findChromeExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Continue through supported local Chrome locations.
    }
  }
  throw new Error("Chrome was not found. Set CHROME_PATH to export store creatives.");
}

async function captureWithChrome(args, outputPath) {
  await new Promise((resolve, reject) => {
    const child = spawn(chromeExecutable, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    let settled = false;
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (settled) return;
      if (code === 0) resolve();
      else reject(new Error(`Chrome export failed with exit code ${code}.\n${stderr}`));
    });

    waitForScreenshot(outputPath)
      .then(() => {
        settled = true;
        child.kill("SIGTERM");
        resolve();
      })
      .catch((error) => {
        settled = true;
        child.kill("SIGKILL");
        reject(new Error(`${error.message}\n${stderr}`));
      });
  });
}

async function waitForScreenshot(outputPath) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      const stat = await fs.stat(outputPath);
      if (stat.size > 10_000) return;
    } catch {
      // Chrome has not written the screenshot yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${outputPath}`);
}

async function readPngDimensions(filePath) {
  const handle = await fs.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(24);
    await handle.read(buffer, 0, buffer.length, 0);
    assert(buffer.toString("ascii", 1, 4) === "PNG", `${filePath} is not a PNG`);
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  } finally {
    await handle.close();
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
