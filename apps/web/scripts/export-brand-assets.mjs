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

const colors = {
  brand: "#176B5D",
  text: "#1D2522",
  warmWhite: "#F7F5EF",
  signal: "#F5A623",
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

async function createSocialImage() {
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
      <rect x="54" y="54" width="1092" height="522" rx="44" fill="${colors.brand}"/>
      <g transform="translate(90 59) scale(1)">
        <path d="M124 119H169C180 119 185 123 192 133L226 180C236 194 236 209 227 221C216 236 209 244 209 256C209 268 216 276 227 291C236 303 236 318 226 332L192 379C185 389 180 393 169 393H124C110 393 102 385 102 371V141C102 127 110 119 124 119Z" fill="${colors.warmWhite}"/>
        <path d="M388 119H343C332 119 327 123 320 133L286 180C276 194 276 209 285 221C296 236 303 244 303 256C303 268 296 276 285 291C276 303 276 318 286 332L320 379C327 389 332 393 343 393H388C402 393 410 385 410 371V141C410 127 402 119 388 119Z" fill="${colors.warmWhite}"/>
        <circle cx="256" cy="256" r="33" fill="${colors.signal}"/>
      </g>
      <text x="570" y="286" fill="${colors.warmWhite}" font-family="Hypofit, Arial, sans-serif" font-size="96" font-weight="700">Hypofit</text>
      <text x="574" y="350" fill="#D7E6E1" font-family="Hypofit, Arial, sans-serif" font-size="34" font-weight="700">실제 고객과 시작하는 검증 인터뷰</text>
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

  const mark = path.join(brandDirectory, "hypofit-mark.svg");
  const inverseMark = path.join(brandDirectory, "hypofit-mark-inverse.svg");
  const logo = path.join(brandDirectory, "hypofit-logo.svg");
  const appIcon = path.join(iconDirectory, "icon.svg");
  const maskableIcon = path.join(iconDirectory, "icon-maskable.svg");
  const favicon = path.join(iconDirectory, "favicon.svg");
  const adaptiveForeground = path.join(brandDirectory, "hypofit-app-foreground.svg");
  const adaptiveMonochrome = path.join(brandDirectory, "hypofit-app-monochrome.svg");

  await renderSquare(mark, path.join(brandDirectory, "hypofit-mark-preview.png"), 1024, { alpha: true });
  await renderFixed(logo, path.join(brandDirectory, "hypofit-logo-preview.png"), 1000, 280, { alpha: true });

  const favicon16 = path.join(iconDirectory, "favicon-16.png");
  const favicon32 = path.join(iconDirectory, "favicon-32.png");
  await renderSquare(favicon, favicon16, 16, { alpha: true });
  await renderSquare(favicon, favicon32, 32, { alpha: true });
  await writeFile(path.join(iconDirectory, "favicon.ico"), await pngToIco([favicon16, favicon32]));

  await renderSquare(appIcon, path.join(iconDirectory, "apple-touch-icon.png"), 180, { opaque: true });
  await renderSquare(appIcon, path.join(iconDirectory, "icon-192.png"), 192, { opaque: true });
  await renderSquare(appIcon, path.join(iconDirectory, "icon-512.png"), 512, { opaque: true });
  await renderSquare(maskableIcon, path.join(iconDirectory, "icon-maskable-192.png"), 192, { opaque: true });
  await renderSquare(maskableIcon, path.join(iconDirectory, "icon-maskable-512.png"), 512, { opaque: true });

  await renderSquare(appIcon, path.join(mobileAssetDirectory, "icon.png"), 1024, { opaque: true });
  await renderSquare(adaptiveForeground, path.join(mobileAssetDirectory, "adaptive-icon.png"), 1024, { alpha: true });
  await renderSquare(adaptiveMonochrome, path.join(mobileAssetDirectory, "adaptive-icon-monochrome.png"), 1024, { alpha: true });
  await renderSquare(adaptiveMonochrome, path.join(mobileAssetDirectory, "notification-icon.png"), 96, { alpha: true });
  await renderSquare(mark, path.join(mobileAssetDirectory, "hypofit-mark.png"), 1024, { alpha: true });
  await renderSquare(inverseMark, path.join(mobileAssetDirectory, "hypofit-mark-inverse.png"), 1024, { alpha: true });
  await renderSquare(inverseMark, path.join(mobileAssetDirectory, "splash-static.png"), 1024, { alpha: true });
  await renderSquare(inverseMark, path.join(mobileAssetDirectory, "splash.png"), 1024, { alpha: true });

  const appleStoreIcon = path.join(storeBrandDirectory, "export/apple/hypofit-app-icon-1024.png");
  const playStoreIcon = path.join(storeBrandDirectory, "export/google-play/hypofit-play-icon-512.png");
  const kakaoServiceLogo = path.join(
    storeBrandDirectory,
    "export/social-login/hypofit-kakao-service-logo-128.png",
  );
  await renderSquare(appIcon, appleStoreIcon, 1024, { opaque: true });
  await renderSquare(appIcon, playStoreIcon, 512, { alpha: true, maxBytes: 1024 * 1024 });
  await renderSquare(appIcon, kakaoServiceLogo, 128, { opaque: true, maxBytes: 250 * 1024 });
  await createSocialImage();

  await validateOutputs();
  console.log(`Generated and validated ${expectedOutputs.length} Hypofit brand assets.`);
}

await main();
