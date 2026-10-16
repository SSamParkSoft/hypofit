import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pngToIco from "png-to-ico";
import sharp from "sharp";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const webDirectory = path.resolve(scriptDirectory, "..");
const repositoryRoot = path.resolve(webDirectory, "../..");
const publicDirectory = path.join(webDirectory, "public");
const brandDirectory = path.join(publicDirectory, "brand");
const iconDirectory = path.join(publicDirectory, "icons");
const mobileAssetDirectory = path.join(repositoryRoot, "apps/mobile/assets");
const storeBrandDirectory = path.join(repositoryRoot, "docs/store-assets/brand");
const iconSource = path.join(storeBrandDirectory, "source/hypofit-icon-2026-09-29.png");

const colors = {
  brand: "#0F7A4D",
  splash: "#58C96B",
  text: "#18211C",
  warmWhite: "#F6F7F8",
};

const expectedOutputs = [];

async function ensureDirectories() {
  await Promise.all([
    mkdir(iconDirectory, { recursive: true }),
    mkdir(mobileAssetDirectory, { recursive: true }),
    mkdir(path.join(storeBrandDirectory, "export/apple"), { recursive: true }),
    mkdir(path.join(storeBrandDirectory, "export/google-play"), { recursive: true }),
    mkdir(path.join(storeBrandDirectory, "export/social-login"), { recursive: true }),
    mkdir(path.join(storeBrandDirectory, "export/social"), { recursive: true }),
    mkdir(path.join(storeBrandDirectory, "export/github"), { recursive: true }),
    mkdir(path.join(storeBrandDirectory, "review"), { recursive: true }),
    mkdir(path.join(storeBrandDirectory, "source"), { recursive: true }),
  ]);
}

async function renderSquare(source, output, size, options = {}) {
  let pipeline = sharp(source, { density: 512 }).resize(size, size, {
    fit: "fill",
    kernel: sharp.kernel.lanczos3,
  });

  if (options.opaque) {
    pipeline = pipeline.flatten({ background: options.background ?? colors.brand }).removeAlpha();
  } else if (options.alpha) {
    pipeline = pipeline.ensureAlpha();
  }

  await pipeline.png({ compressionLevel: 9, palette: false }).toFile(output);
  expectedOutputs.push({
    output,
    width: size,
    height: size,
    alpha: options.opaque ? false : options.alpha,
    maxBytes: options.maxBytes,
  });
}

async function renderFixed(source, output, width, height, options = {}) {
  let pipeline = sharp(source, { density: 512 }).resize(width, height, {
    fit: "fill",
    kernel: sharp.kernel.lanczos3,
  });

  if (options.opaque) {
    pipeline = pipeline.flatten({ background: options.background ?? colors.warmWhite }).removeAlpha();
  }

  await pipeline.png({ compressionLevel: 9, palette: false }).toFile(output);
  expectedOutputs.push({
    output,
    width,
    height,
    alpha: options.opaque ? false : options.alpha,
    maxBytes: options.maxBytes,
  });
}

async function extractSymbol(source) {
  const sourceMetadata = await sharp(source).metadata();
  if (
    sourceMetadata.format !== "png" ||
    sourceMetadata.width !== sourceMetadata.height ||
    sourceMetadata.width < 1024 ||
    sourceMetadata.hasAlpha
  ) {
    throw new Error("The source app icon must be an opaque square PNG of at least 1024px.");
  }

  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const color = Buffer.from(data);
  const white = Buffer.from(data);
  const green = Buffer.from(data);

  for (let pixel = 0; pixel < info.width * info.height; pixel += 1) {
    const offset = pixel * info.channels;
    // The source has a green background (red channel below 120) and a near-white symbol.
    const alpha = Math.max(0, Math.min(255, Math.round((data[offset] - 120) * 2.7)));

    for (const output of [color, white, green]) {
      output[offset + 3] = alpha;
    }
    white[offset] = 255;
    white[offset + 1] = 255;
    white[offset + 2] = 255;
    green[offset] = 15;
    green[offset + 1] = 122;
    green[offset + 2] = 77;
  }

  const toPng = (buffer) => sharp(buffer, { raw: info }).png().toBuffer();
  return {
    color: await toPng(color),
    white: await toPng(white),
    green: await toPng(green),
  };
}

async function writeRasterSvg(output, source, size = 512) {
  const image = await sharp(source).resize(size, size).png().toBuffer();
  await writeFile(
    output,
    `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><image width="1024" height="1024" href="data:image/png;base64,${image.toString("base64")}"/></svg>\n`,
  );
}

async function createSplashWordmark() {
  const fontPath = path.join(mobileAssetDirectory, "fonts/SpoqaHanSansNeo-Bold.ttf");
  const fontData = (await readFile(fontPath)).toString("base64");
  const svg = `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
    <style>@font-face { font-family: Hypofit; src: url(data:font/ttf;base64,${fontData}); font-weight: 700; }</style>
    <text x="512" y="567" text-anchor="middle" fill="#0B5C3A" font-family="Hypofit" font-size="172" font-weight="700">Hypofit</text>
  </svg>`;
  return Buffer.from(svg);
}

async function createBrandLogo(symbol) {
  const mark = (await sharp(symbol).resize(280).png().toBuffer()).toString("base64");
  const svg = `<svg width="1000" height="280" viewBox="0 0 1000 280" xmlns="http://www.w3.org/2000/svg">
    <image width="280" height="280" href="data:image/png;base64,${mark}"/>
    <text x="260" y="198" fill="${colors.text}" font-family="Spoqa Han Sans Neo, Arial, sans-serif" font-size="165" font-weight="700">Hypofit</text>
  </svg>`;
  const output = path.join(brandDirectory, "hypofit-logo.svg");
  await writeFile(output, svg);
  await renderFixed(Buffer.from(svg), path.join(brandDirectory, "hypofit-logo-preview.png"), 1000, 280, { alpha: true });
}

async function createSocialImage(symbol) {
  const fontPath = path.join(repositoryRoot, "apps/mobile/assets/fonts/SpoqaHanSansNeo-Bold.ttf");
  const fontData = (await readFile(fontPath)).toString("base64");
  const svg = `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <style>
        @font-face {
          font-family: Hypofit;
          src: url(data:font/ttf;base64,${fontData});
          font-weight: 700;
        }
      </style>
      <rect width="1200" height="630" fill="${colors.warmWhite}"/>
      <rect x="54" y="54" width="1092" height="522" rx="44" fill="${colors.splash}"/>
      <image x="92" y="76" width="440" height="440" href="data:image/png;base64,${(await sharp(symbol).resize(440).png().toBuffer()).toString("base64")}"/>
      <text x="570" y="286" fill="${colors.warmWhite}" font-family="Hypofit, Arial, sans-serif" font-size="96" font-weight="700">Hypofit</text>
      <text x="574" y="350" fill="#FFFFFF" font-family="Hypofit, Arial, sans-serif" font-size="34" font-weight="700">실제 고객과 시작하는 검증 인터뷰</text>
    </svg>
  `;
  const output = path.join(brandDirectory, "hypofit-social-1200x630.png");
  await renderFixed(Buffer.from(svg), output, 1200, 630, { opaque: true });
  await writeFile(path.join(storeBrandDirectory, "export/social/hypofit-social-1200x630.png"), await readFile(output));
  expectedOutputs.push({
    output: path.join(storeBrandDirectory, "export/social/hypofit-social-1200x630.png"),
    width: 1200,
    height: 630,
    alpha: false,
  });

  const githubOutput = path.join(
    storeBrandDirectory,
    "export/github/hypofit-repository-social-preview-1280x640.png",
  );
  const githubCanvas = await sharp(output)
    .extend({
      left: 30,
      right: 30,
      top: 0,
      bottom: 0,
      background: colors.warmWhite,
    })
    .toBuffer();
  await sharp(githubCanvas)
    .resize(1280, 640, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .removeAlpha()
    .png({ compressionLevel: 9, palette: false })
    .toFile(githubOutput);
  expectedOutputs.push({
    output: githubOutput,
    width: 1280,
    height: 640,
    alpha: false,
    maxBytes: 1024 * 1024,
  });
}

async function validateOutputs() {
  const errors = [];

  for (const expected of expectedOutputs) {
    const metadata = await sharp(expected.output).metadata();
    const outputStat = await stat(expected.output);

    if (metadata.width !== expected.width || metadata.height !== expected.height) {
      errors.push(`${expected.output}: expected ${expected.width}x${expected.height}, received ${metadata.width}x${metadata.height}`);
    }

    if (typeof expected.alpha === "boolean" && Boolean(metadata.hasAlpha) !== expected.alpha) {
      errors.push(`${expected.output}: expected alpha=${expected.alpha}, received alpha=${Boolean(metadata.hasAlpha)}`);
    }

    if (expected.maxBytes && outputStat.size > expected.maxBytes) {
      errors.push(`${expected.output}: ${outputStat.size} bytes exceeds ${expected.maxBytes}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Brand asset validation failed:\n${errors.join("\n")}`);
  }
}

async function main() {
  await ensureDirectories();
  const symbol = await extractSymbol(iconSource);
  const splashWordmark = await createSplashWordmark();

  await writeRasterSvg(path.join(brandDirectory, "hypofit-mark.svg"), symbol.green);
  await writeRasterSvg(path.join(brandDirectory, "hypofit-mark-inverse.svg"), symbol.white);
  await writeRasterSvg(path.join(brandDirectory, "hypofit-mark-mono.svg"), symbol.green);
  await writeRasterSvg(path.join(brandDirectory, "hypofit-mark-small.svg"), symbol.green);
  await writeRasterSvg(path.join(brandDirectory, "hypofit-app-foreground.svg"), symbol.color);
  await writeRasterSvg(path.join(brandDirectory, "hypofit-app-monochrome.svg"), symbol.white);
  await writeRasterSvg(path.join(iconDirectory, "icon.svg"), iconSource);
  await writeRasterSvg(path.join(iconDirectory, "icon-maskable.svg"), iconSource);
  await writeRasterSvg(path.join(iconDirectory, "favicon.svg"), iconSource, 256);

  await renderSquare(symbol.green, path.join(brandDirectory, "hypofit-mark-preview.png"), 1024, { alpha: true });
  await createBrandLogo(symbol.green);

  const favicon16 = path.join(iconDirectory, "favicon-16.png");
  const favicon32 = path.join(iconDirectory, "favicon-32.png");
  await renderSquare(iconSource, favicon16, 16, { opaque: true });
  await renderSquare(iconSource, favicon32, 32, { opaque: true });
  await writeFile(path.join(iconDirectory, "favicon.ico"), await pngToIco([favicon16, favicon32]));

  await renderSquare(iconSource, path.join(iconDirectory, "apple-touch-icon.png"), 180, { opaque: true });
  await renderSquare(iconSource, path.join(iconDirectory, "icon-192.png"), 192, { opaque: true });
  await renderSquare(iconSource, path.join(iconDirectory, "icon-512.png"), 512, { opaque: true });
  await renderSquare(iconSource, path.join(iconDirectory, "icon-maskable-192.png"), 192, { opaque: true });
  await renderSquare(iconSource, path.join(iconDirectory, "icon-maskable-512.png"), 512, { opaque: true });

  await renderSquare(iconSource, path.join(mobileAssetDirectory, "icon.png"), 1024, { opaque: true });
  await renderSquare(iconSource, path.join(mobileAssetDirectory, "ios-icon.png"), 1024, { opaque: true });
  await renderSquare(symbol.color, path.join(mobileAssetDirectory, "adaptive-icon.png"), 1024, { alpha: true });
  await renderSquare(symbol.white, path.join(mobileAssetDirectory, "adaptive-icon-monochrome.png"), 1024, { alpha: true });
  await renderSquare(symbol.white, path.join(mobileAssetDirectory, "notification-icon.png"), 96, { alpha: true });
  await renderSquare(symbol.green, path.join(mobileAssetDirectory, "hypofit-mark.png"), 1024, { alpha: true });
  await renderSquare(symbol.white, path.join(mobileAssetDirectory, "hypofit-mark-inverse.png"), 1024, { alpha: true });
  await renderSquare(splashWordmark, path.join(mobileAssetDirectory, "splash-static.png"), 1024, { alpha: true });
  await renderSquare(splashWordmark, path.join(mobileAssetDirectory, "splash.png"), 1024, { alpha: true });

  const appleStoreIcon = path.join(storeBrandDirectory, "export/apple/hypofit-app-icon-1024.png");
  const playStoreIcon = path.join(storeBrandDirectory, "export/google-play/hypofit-play-icon-512.png");
  const kakaoServiceLogo = path.join(
    storeBrandDirectory,
    "export/social-login/hypofit-kakao-service-logo-128.png",
  );
  await renderSquare(iconSource, appleStoreIcon, 1024, { opaque: true });
  await renderSquare(iconSource, playStoreIcon, 512, { alpha: true, maxBytes: 1024 * 1024 });
  await renderSquare(iconSource, kakaoServiceLogo, 128, { opaque: true, maxBytes: 250 * 1024 });
  await createSocialImage(symbol.white);

  await validateOutputs();
  console.log(`Generated and validated ${expectedOutputs.length} Hypofit brand assets.`);
}

await main();
