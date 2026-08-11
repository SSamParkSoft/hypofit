import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDirectory, "..");
const previewHost = "127.0.0.1";
const previewPort = Number(process.env.HYPOFIT_WEB_SMOKE_PORT ?? "4173");
const previewOrigin = `http://${previewHost}:${previewPort}`;
const chromeExecutable = await findChromeExecutable();
const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "hypofit-web-smoke-"));
const viteExecutable = path.join(webRoot, "node_modules", "vite", "bin", "vite.js");
const previewProcess = spawn(
  process.execPath,
  [viteExecutable, "preview", "--host", previewHost, "--port", String(previewPort), "--strictPort"],
  { cwd: webRoot, stdio: ["ignore", "pipe", "pipe"] },
);

let previewOutput = "";
previewProcess.stdout.on("data", (chunk) => {
  previewOutput += chunk.toString();
});
previewProcess.stderr.on("data", (chunk) => {
  previewOutput += chunk.toString();
});

try {
  await waitForHttp(`${previewOrigin}/`);

  const routes = [
    { path: "/", requiredText: ["Hypofit", "실제 타깃 고객"] },
    { path: "/support", requiredText: ["무엇을 도와드릴까요?", "계정 삭제"] },
    {
      path: "/app",
      requiredText: ["로그인", "사용 중인 소셜 계정으로 바로 시작할 수 있어요."],
      settleMs: 5_000,
    },
  ];

  for (const route of routes) {
    const html = await dumpRenderedDom(route.path, route.settleMs ?? 1_500);
    for (const requiredText of route.requiredText) {
      assert(
        html.includes(requiredText),
        `${route.path} did not render required text: ${requiredText}`,
      );
    }
    if (route.path === "/app") {
      assert(!html.includes('aria-busy="true"'), "/app remained in the auth bootstrap state");
    }
  }

  const mobileScreenshotPath = path.join(temporaryDirectory, "support-mobile.png");
  await captureScreenshot("/support", mobileScreenshotPath, 390, 844);
  const dimensions = await readPngDimensions(mobileScreenshotPath);
  assert(
    dimensions.width === 390 && dimensions.height === 844,
    `mobile smoke screenshot has unexpected dimensions: ${dimensions.width}x${dimensions.height}`,
  );

  console.log("Browser smoke passed for landing, support, protected auth entry, and 390x844 viewport.");
} finally {
  previewProcess.kill("SIGTERM");
  await fs.rm(temporaryDirectory, { force: true, recursive: true });
}

async function findChromeExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Continue through supported local Chrome locations.
    }
  }

  throw new Error("Chrome was not found. Set CHROME_PATH to run the browser smoke.");
}

async function waitForHttp(url) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const status = await new Promise((resolve, reject) => {
        const request = http.get(url, (response) => {
          response.resume();
          resolve(response.statusCode ?? 0);
        });
        request.on("error", reject);
        request.setTimeout(1_000, () => request.destroy(new Error("preview timeout")));
      });
      if (status >= 200 && status < 500) return;
    } catch {
      await delay(100);
    }
  }
  throw new Error(`Vite preview did not become ready.\n${previewOutput}`);
}

async function dumpRenderedDom(routePath, settleMs) {
  return withChromePage(routePath, { settleMs }, async (client) => {
    const result = await client.send("Runtime.evaluate", {
      expression: "document.documentElement.outerHTML",
      returnByValue: true,
    });
    return result.result?.result?.value ?? "";
  });
}

async function captureScreenshot(routePath, outputPath, width, height) {
  await withChromePage(
    routePath,
    { height, settleMs: 1_500, width },
    async (client) => {
      const result = await client.send("Page.captureScreenshot", {
        captureBeyondViewport: false,
        format: "png",
        fromSurface: true,
      });
      assert(result.result?.data, "Chrome did not return screenshot data");
      await fs.writeFile(outputPath, Buffer.from(result.result.data, "base64"));
    },
  );
}

async function withChromePage(
  routePath,
  { height = 900, settleMs, width = 1440 },
  callback,
) {
  const profileDirectory = path.join(
    temporaryDirectory,
    `profile-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const child = spawn(
    chromeExecutable,
    [
      "--headless=new",
      "--disable-background-networking",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-default-browser-check",
      "--no-first-run",
      "--remote-debugging-port=0",
      `--user-data-dir=${profileDirectory}`,
      `--window-size=${width},${height}`,
      `${previewOrigin}${routePath}`,
    ],
    { cwd: webRoot, stdio: ["ignore", "ignore", "pipe"] },
  );

  let stderr = "";
  let client;
  try {
    const browserWebSocketUrl = await waitForDebuggerUrl(child, (chunk) => {
      stderr += chunk;
    });
    const debuggerPort = new URL(browserWebSocketUrl).port;
    const target = await waitForPageTarget(debuggerPort, `${previewOrigin}${routePath}`);
    client = await createCdpClient(target.webSocketDebuggerUrl);
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Emulation.setDeviceMetricsOverride", {
      deviceScaleFactor: 1,
      height,
      mobile: width <= 600,
      width,
    });
    await client.send("Page.reload", { ignoreCache: true });
    await waitForDocumentReady(client);
    await delay(settleMs);
    return await callback(client);
  } catch (error) {
    const detail = stderr.trim() ? `\nChrome stderr:\n${stderr}` : "";
    throw new Error(`${error instanceof Error ? error.message : String(error)}${detail}`);
  } finally {
    client?.close();
    await stopChild(child);
  }
}

async function waitForDebuggerUrl(child, onStderr) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Chrome DevTools did not become ready within 10 seconds"));
    }, 10_000);

    function cleanup() {
      clearTimeout(timeout);
      child.stderr.off("data", handleData);
      child.off("error", handleError);
      child.off("close", handleClose);
    }

    function handleData(chunk) {
      const text = chunk.toString();
      onStderr(text);
      const match = text.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (!match) return;
      cleanup();
      resolve(match[1]);
    }

    function handleError(error) {
      cleanup();
      reject(error);
    }

    function handleClose(code) {
      cleanup();
      reject(new Error(`Chrome exited before DevTools was ready with code ${code}`));
    }

    child.stderr.on("data", handleData);
    child.on("error", handleError);
    child.on("close", handleClose);
  });
}

async function waitForPageTarget(port, expectedUrl) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await response.json();
      const pageTarget = targets.find(
        (target) => target.type === "page" && target.url.startsWith(expectedUrl),
      );
      if (pageTarget?.webSocketDebuggerUrl) return pageTarget;
    } catch {
      // Chrome can expose the debugger port before the first page target exists.
    }
    await delay(50);
  }
  throw new Error(`Chrome did not expose a page target for ${expectedUrl}`);
}

async function createCdpClient(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  const pendingCommands = new Map();
  let commandId = 0;

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("CDP WebSocket connection timed out")), 10_000);
    socket.addEventListener("open", () => {
      clearTimeout(timeout);
      resolve();
    }, { once: true });
    socket.addEventListener("error", () => {
      clearTimeout(timeout);
      reject(new Error("CDP WebSocket connection failed"));
    }, { once: true });
  });

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (!message.id) return;
    const pending = pendingCommands.get(message.id);
    if (!pending) return;
    pendingCommands.delete(message.id);
    if (message.error) pending.reject(new Error(message.error.message));
    else pending.resolve(message);
  });

  return {
    close() {
      for (const pending of pendingCommands.values()) {
        pending.reject(new Error("CDP connection closed"));
      }
      pendingCommands.clear();
      socket.close();
    },
    send(method, params = {}) {
      const id = ++commandId;
      return new Promise((resolve, reject) => {
        pendingCommands.set(id, { reject, resolve });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
  };
}

async function waitForDocumentReady(client) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const result = await client.send("Runtime.evaluate", {
      expression: "document.readyState",
      returnByValue: true,
    });
    if (result.result?.result?.value === "complete") return;
    await delay(50);
  }
  throw new Error("Chrome page did not reach document.readyState=complete");
}

async function stopChild(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const closed = new Promise((resolve) => child.once("close", resolve));
  child.kill("SIGTERM");
  const exited = await Promise.race([closed.then(() => true), delay(1_000).then(() => false)]);
  if (!exited && child.exitCode === null && child.signalCode === null) {
    child.kill("SIGKILL");
    await closed;
  }
}

async function readPngDimensions(filePath) {
  const file = await fs.readFile(filePath);
  assert(file.subarray(1, 4).toString("ascii") === "PNG", "browser smoke did not create a PNG");
  return { width: file.readUInt32BE(16), height: file.readUInt32BE(20) };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
