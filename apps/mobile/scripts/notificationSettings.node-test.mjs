import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/screens/settings/NotificationSettingsScreen.tsx", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
});

// Exercise the screen's switch handlers with native UI and network boundaries mocked.
function harness({ enabled = true, permission = "denied" } = {}) {
  const preference = { push_enabled: enabled, chat_push_enabled: true };
  const states = [preference, { status: permission }, false, false, null, null];
  const calls = { updates: [], disable: 0, settings: 0, enable: 0 };
  let cursor = 0;
  const jsx = (type, props) => typeof type === "function" ? type(props) : { type, props };
  const modules = {
    react: {
      useState: () => { const index = cursor++; return [states[index], (value) => { states[index] = value; }]; },
      useRef: (current) => ({ current }),
      useCallback: (fn) => fn,
      useEffect() {},
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": {
      ActivityIndicator: "ActivityIndicator", Switch: "Switch", View: "View", Text: "Text", Pressable: "Pressable",
      Linking: { openSettings: async () => { calls.settings++; } },
    },
    "@/features/auth/AuthProvider": { useAuth: () => ({ accessToken: "access", user: { id: "user" } }) },
    "@/features/push/pushNotifications": {
      disableRegisteredPushDevice: async () => { calls.disable++; },
      getPushPermissionSummary: async () => ({ status: permission }),
      requestAndRegisterPush: async () => { calls.enable++; return { message: "enabled" }; },
    },
    "@/features/push/pushApi": { pushApi: {
      getPreferences: async () => preference,
      updatePreferences: async (input) => { calls.updates.push(input); return { ...preference, ...input }; },
    } },
    "@/shared/ui/AppScreen": { AppScreen: "AppScreen" },
    "@/shared/theme/tokens": { colors: {} },
    "@/shared/hooks/useAppActive": { useAppActive: () => true },
  };
  const screen = {};
  runInNewContext(outputText, {
    exports: screen,
    require(name) { assert.ok(Object.hasOwn(modules, name), name); return modules[name]; },
  });
  const nodes = [];
  function collect(node) {
    if (Array.isArray(node)) return node.forEach(collect);
    if (!node?.props) return;
    nodes.push(node);
    collect(node.props.children);
  }
  collect(screen.NotificationSettingsScreen());
  return { calls, nodes, switchFor: (label) => nodes.find((node) => node.type === "Switch" && node.props.accessibilityLabel === label).props };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

test("OS denial does not hide account ON and account can still be disabled", async () => {
  const { calls, switchFor } = harness();
  const master = switchFor("알림 받기");
  assert.equal(master.value, true);
  assert.equal(master.disabled, false);
  master.onValueChange(false);
  await settle();
  assert.equal(calls.updates[0].push_enabled, false);
  assert.equal(calls.disable, 1);
  assert.equal(calls.settings, 0);
});

test("account category preferences remain editable while this device denies push", async () => {
  const { calls, switchFor } = harness();
  const category = switchFor("채팅 메시지");
  assert.equal(category.disabled, false);
  category.onValueChange(false);
  await settle();
  assert.equal(calls.updates[0].chat_push_enabled, false);
});

test("device permission has a separate settings action when account is ON", async () => {
  const { calls, nodes } = harness();
  const button = nodes.find((node) => node.type === "Pressable");
  assert.ok(button);
  button.props.onPress();
  await settle();
  assert.equal(calls.settings, 1);
  assert.equal(calls.updates.length, 0);
});

test("account OFF disables categories and enabling denied permission opens settings", async () => {
  const { calls, switchFor } = harness({ enabled: false });
  assert.equal(switchFor("알림 받기").value, false);
  assert.equal(switchFor("채팅 메시지").disabled, true);
  switchFor("알림 받기").onValueChange(true);
  await settle();
  assert.equal(calls.settings, 1);
  assert.equal(calls.updates.length, 0);
});

test("granted permission keeps existing explicit enable flow", async () => {
  const { calls, switchFor, nodes } = harness({ enabled: false, permission: "granted" });
  assert.equal(nodes.some((node) => node.type === "Pressable"), false);
  switchFor("알림 받기").onValueChange(true);
  await settle();
  assert.equal(calls.enable, 1);
});
