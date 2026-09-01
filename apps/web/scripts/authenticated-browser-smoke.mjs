import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDirectory, "..");

const usage = `
Usage:
  WEB_BASE_URL=http://127.0.0.1:5173 \\
  VITE_SUPABASE_URL=https://<project>.supabase.co \\
  VITE_SUPABASE_ANON_KEY=<anon-key> \\
  REVIEW_EMAIL=review@example.com \\
  REVIEW_PASSWORD=<password> \\
  node ./scripts/authenticated-browser-smoke.mjs

Required environment variables:
  WEB_BASE_URL
  VITE_SUPABASE_URL or SUPABASE_URL
  VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY
  REVIEW_EMAIL
  REVIEW_PASSWORD
`.trim();

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(usage);
  process.exit(0);
}

await main();

function readConfiguration() {
  const webBaseUrl = process.env.WEB_BASE_URL ?? process.env.HYPOFIT_WEB_SMOKE_BASE_URL;
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  const reviewEmail = process.env.REVIEW_EMAIL;
  const reviewPassword = process.env.REVIEW_PASSWORD;

  const missing = [];
  if (!webBaseUrl) missing.push("WEB_BASE_URL");
  if (!supabaseUrl) missing.push("VITE_SUPABASE_URL or SUPABASE_URL");
  if (!supabaseAnonKey) missing.push("VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY");
  if (!reviewEmail) missing.push("REVIEW_EMAIL");
  if (!reviewPassword) missing.push("REVIEW_PASSWORD");

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}\n\n${usage}`);
  }

  const normalizedBaseUrl = new URL(webBaseUrl);

  return {
    origin: normalizedBaseUrl.origin,
    reviewEmail,
    reviewPassword,
    supabaseAnonKey,
    supabaseUrl: new URL(supabaseUrl).href.replace(/\/$/, ""),
  };
}

async function signInWithSupabase({
  reviewEmail,
  reviewPassword,
  supabaseAnonKey,
  supabaseUrl,
}) {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: reviewEmail,
      password: reviewPassword,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const code =
      typeof payload?.error_code === "string"
        ? payload.error_code
        : typeof payload?.error === "string"
          ? payload.error
          : `http_${response.status}`;
    throw new Error(`Supabase REST sign-in failed (${code}).`);
  }

  if (!payload?.access_token || !payload?.refresh_token || !payload?.user) {
    throw new Error("Supabase REST sign-in did not return a usable session.");
  }

  return {
    access_token: payload.access_token,
    expires_at:
      typeof payload.expires_at === "number"
        ? payload.expires_at
        : Math.floor(Date.now() / 1000) + Number(payload.expires_in ?? 0),
    expires_in: payload.expires_in,
    refresh_token: payload.refresh_token,
    token_type: payload.token_type ?? "bearer",
    user: payload.user,
  };
}

async function main() {
  let temporaryDirectory = null;
  let chromeProcess = null;
  let client = null;

  try {
    const configuration = readConfiguration();
    const chromeExecutable = await findChromeExecutable();
    temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "hypofit-auth-browser-smoke-"));
    const session = await signInWithSupabase(configuration);
    const browser = await launchChrome({
      chromeExecutable,
      temporaryDirectory,
    });
    chromeProcess = browser.child;
    client = browser.client;

    await client.send("Page.enable");
    await client.send("Runtime.enable");
    const storageKey = buildSupabaseStorageKey(configuration.supabaseUrl);
    const storageSeedSource = buildStorageSeedSource({
      origin: configuration.origin,
      session,
      storageKey,
    });

    await client.send("Page.addScriptToEvaluateOnNewDocument", { source: storageSeedSource });
    await navigate(client, `${configuration.origin}/app`);
    await evaluate(client, storageSeedSource);
    await client.send("Page.reload", { ignoreCache: true });
    await waitForDocumentReady(client);

    const routes = [
      {
        path: "/app",
        requiredText: ["내 진행 상황", "최근 올라온 인터뷰", "맞춤 추천"],
      },
      {
        path: "/interviews",
        requiredText: [
          "인터뷰",
          "검색과 필터를 조정하면서 조건이 맞는 인터뷰를 바로 비교하고 신청할 수 있어요.",
        ],
      },
      {
        path: "/chat",
        requiredText: ["채팅", "이름, 모집글 검색"],
      },
      {
        path: "/profile",
        requiredText: ["프로필", "계정 정보"],
      },
      {
        path: "/map",
        requiredText: [],
      },
    ];

    const viewports = [
      { height: 844, label: "phone", width: 390 },
      { height: 932, label: "large-phone", width: 430 },
      { height: 900, label: "mobile-edge", width: 767 },
      { height: 1024, label: "compact-tall", width: 768 },
      { height: 768, label: "compact-wide", width: 1024 },
      { height: 800, label: "compact-edge", width: 1199 },
      { height: 800, label: "desktop-boundary", width: 1200 },
      { height: 720, label: "desktop-short", width: 1280 },
      { height: 832, label: "desktop-entry", width: 1280 },
      { height: 900, label: "desktop", width: 1440 },
      { height: 1117, label: "wide-desktop", width: 1728 },
    ];

    for (const viewport of viewports) {
      await setViewport(client, viewport);

      for (const route of routes) {
        await navigate(client, `${configuration.origin}${route.path}`);
        await waitForRouteState(client, route);
        await assertResponsiveLayout(client, route.path, viewport);
      }
    }

    console.log(
      "Authenticated responsive browser smoke passed for /app, /interviews, /map, /chat, and /profile.",
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  } finally {
    client?.close();
    await stopChild(chromeProcess);
    if (temporaryDirectory) {
      await fs.rm(temporaryDirectory, { force: true, recursive: true });
    }
  }
}

async function setViewport(client, { height, width }) {
  await client.send("Emulation.setDeviceMetricsOverride", {
    deviceScaleFactor: 1,
    height,
    mobile: width < 768,
    width,
  });
}

async function assertResponsiveLayout(client, routePath, viewport) {
  const metrics = await evaluate(
    client,
    `(() => {
      const isVisible = (element) => {
        if (!element) return false;
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      };
      const topNavigation = document.querySelector('[data-app-shell-region="top-navigation"]');
      const mobileNavigation = document.querySelector('nav[aria-label="Hypofit mobile navigation"]');
      return {
        clientWidth: document.documentElement.clientWidth,
        mobileNavigationVisible: isVisible(mobileNavigation),
        scrollWidth: document.documentElement.scrollWidth,
        topNavigationVisible: isVisible(topNavigation),
      };
    })()`,
  );

  if (metrics.scrollWidth > metrics.clientWidth + 1) {
    throw new Error(
      `${routePath} overflowed horizontally at ${viewport.label} (${viewport.width}x${viewport.height}): ${metrics.scrollWidth}px > ${metrics.clientWidth}px`,
    );
  }

  const expectsMobileNavigation = viewport.width < 768;
  if (metrics.mobileNavigationVisible !== expectsMobileNavigation) {
    throw new Error(
      `${routePath} mobile navigation visibility was incorrect at ${viewport.label}.`,
    );
  }
  if (metrics.topNavigationVisible === expectsMobileNavigation) {
    throw new Error(
      `${routePath} top navigation visibility was incorrect at ${viewport.label}.`,
    );
  }
}

function buildSupabaseStorageKey(supabaseUrl) {
  const baseUrl = new URL(supabaseUrl);
  return `sb-${baseUrl.hostname.split(".")[0]}-auth-token`;
}

function buildStorageSeedSource({ origin, session, storageKey }) {
  return `
    (() => {
      if (window.location.origin !== ${JSON.stringify(origin)}) {
        return;
      }
      const storageKey = ${JSON.stringify(storageKey)};
      const session = ${JSON.stringify(session)};
      window.localStorage.setItem(storageKey, JSON.stringify(session));
      window.localStorage.removeItem(storageKey + "-code-verifier");
      window.localStorage.removeItem(storageKey + "-user");
    })();
  `;
}

async function waitForRouteState(client, route) {
  const requiredText = [
    "홈",
    "인터뷰",
    "지도",
    "채팅",
    "프로필",
    ...route.requiredText,
  ];
  const forbiddenText = [
    "사용 중인 소셜 계정으로 바로 시작할 수 있어요.",
    "로그인 상태를 확인하지 못했어요",
    "Supabase 브라우저 환경 변수가 설정되지 않았습니다.",
    "모집글을 불러오지 못했습니다.",
    "채팅방을 불러오지 못했습니다.",
    "내 인터뷰를 불러오지 못했습니다.",
    "인터뷰를 불러오지 못했습니다.",
    "API 연결 상태를 확인한 뒤 다시 시도하세요.",
    "네트워크 연결을 확인해 주세요.",
    "요청한 정보를 찾지 못했어요.",
  ];
  const deadline = Date.now() + 20_000;

  while (Date.now() < deadline) {
    const currentPath = await evaluate(client, "window.location.pathname");
    const html = await evaluate(client, "document.documentElement.outerHTML");

    if (currentPath === route.path) {
      const hasAllRequiredText = requiredText.every((text) => html.includes(text));
      const hasForbiddenText = forbiddenText.some((text) => html.includes(text));
      const isBusy = html.includes('aria-busy="true"');
      if (hasAllRequiredText && !hasForbiddenText && !isBusy) {
        return;
      }
    }

    await delay(250);
  }

  const currentPath = await evaluate(client, "window.location.pathname");
  const snapshot = await evaluate(client, "document.body.innerText");
  throw new Error(
    `Authenticated route smoke failed for ${route.path}. Final path: ${currentPath}. Snapshot: ${truncate(snapshot, 500)}`,
  );
}

async function navigate(client, url) {
  await client.send("Page.navigate", { url });
  await waitForDocumentReady(client);
  await delay(1_000);
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
  });
  return result.result?.result?.value ?? null;
}

async function launchChrome({ chromeExecutable, temporaryDirectory }) {
  const profileDirectory = path.join(temporaryDirectory, "profile");
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
      "--window-size=1440,960",
      "about:blank",
    ],
    { cwd: webRoot, stdio: ["ignore", "ignore", "pipe"] },
  );

  let stderr = "";
  const browserWebSocketUrl = await waitForDebuggerUrl(child, (chunk) => {
    stderr += chunk;
  });
  const debuggerPort = new URL(browserWebSocketUrl).port;
  const target = await waitForPageTarget(debuggerPort, "about:blank");

  try {
    const cdpClient = await createCdpClient(target.webSocketDebuggerUrl);
    return { child, client: cdpClient };
  } catch (error) {
    await stopChild(child);
    const detail = stderr.trim() ? `\nChrome stderr:\n${stderr}` : "";
    throw new Error(`${error instanceof Error ? error.message : String(error)}${detail}`);
  }
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

  throw new Error("Chrome was not found. Set CHROME_PATH to run the authenticated browser smoke.");
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

async function waitForPageTarget(port, expectedUrlPrefix) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await response.json();
      const pageTarget = targets.find(
        (target) => target.type === "page" && target.url.startsWith(expectedUrlPrefix),
      );
      if (pageTarget?.webSocketDebuggerUrl) return pageTarget;
    } catch {
      // Chrome can expose the debugger port before the first page target exists.
    }
    await delay(50);
  }
  throw new Error(`Chrome did not expose a page target for ${expectedUrlPrefix}`);
}

async function createCdpClient(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  const pendingCommands = new Map();
  let commandId = 0;

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("CDP WebSocket connection timed out")), 10_000);
    socket.addEventListener(
      "open",
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true },
    );
    socket.addEventListener(
      "error",
      () => {
        clearTimeout(timeout);
        reject(new Error("CDP WebSocket connection failed"));
      },
      { once: true },
    );
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
    const state = await evaluate(client, "document.readyState");
    if (state === "complete") return;
    await delay(50);
  }
  throw new Error("Chrome page did not reach document.readyState=complete");
}

async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const closed = new Promise((resolve) => child.once("close", resolve));
  child.kill("SIGTERM");
  const exited = await Promise.race([closed.then(() => true), delay(1_000).then(() => false)]);
  if (!exited && child.exitCode === null && child.signalCode === null) {
    child.kill("SIGKILL");
    await closed;
  }
}

function truncate(value, limit) {
  if (typeof value !== "string") {
    return "";
  }
  return value.length > limit ? `${value.slice(0, limit)}...` : value;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
