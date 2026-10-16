import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/features/push/pushNotifications.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: false },
});

function harness({ enabled = true, permission = "granted", stored = "true", fetchFails = false } = {}) {
  const calls = { register: [], disable: [], update: [], request: 0, fetch: 0 };
  const storage = new Map([
    ["hypofit.push.preference.user", stored],
    ["hypofit.push.registered_device_id", "device"],
    ["hypofit.installation_id", "installation"],
  ]);
  let master = enabled;
  const modules = {
    "@react-native-async-storage/async-storage": { default: {
      getItem: async (key) => storage.get(key) ?? null,
      setItem: async (key, value) => { storage.set(key, value); },
      removeItem: async (key) => { storage.delete(key); },
    } },
    "expo-application": {},
    "expo-notifications": {
      setNotificationHandler() {},
      getPermissionsAsync: async () => ({ status: permission }),
      requestPermissionsAsync: async () => { calls.request++; return { status: permission }; },
      getDevicePushTokenAsync: async () => ({ data: "test-token" }),
    },
    "react-native": { Platform: { OS: "ios", Version: "test" } },
    "@/features/push/notificationRouting": {},
    "@/features/push/pushApi": { pushApi: {
      getPreferences: async () => {
        calls.fetch++;
        if (fetchFails) throw new Error("offline");
        return { user_id: "user", push_enabled: master };
      },
      updatePreferences: async (input) => {
        calls.update.push(input);
        master = input.push_enabled;
        return { user_id: "user", push_enabled: master };
      },
      registerDevice: async (input) => { calls.register.push(input); return { id: "device" }; },
      disableDevice: async (id) => { calls.disable.push(id); },
    } },
    "@/features/notifications/notificationsApi": {},
    "@/shared/diagnostics/sentry": { addAppBreadcrumb() {}, captureAppError() {} },
    "@/shared/theme/tokens": { colors: { brand: "green" } },
  };
  const service = {};
  runInNewContext(outputText, {
    exports: service, __DEV__: true,
    require(name) { assert.ok(Object.hasOwn(modules, name), name); return modules[name]; },
  });
  return { service, calls, storage };
}

test("foreground sync registers only when server preference and permission allow", async () => {
  const { service, calls } = harness();
  await service.syncPushRegistrationIfAlreadyAllowed("access", "user");
  assert.equal(calls.register.length, 1);
  assert.equal(calls.update.length, 0);
  assert.equal(calls.request, 0);
});

test("server OFF prevents registration despite stale local ON", async () => {
  const { service, calls } = harness({ enabled: false });
  await service.syncPushRegistrationIfAlreadyAllowed("access", "user");
  assert.equal(calls.register.length, 0);
});

test("server ON overrides stale local OFF", async () => {
  const { service, calls } = harness({ stored: "false" });
  await service.syncPushRegistrationIfAlreadyAllowed("access", "user");
  assert.equal(calls.fetch, 1);
  assert.equal(calls.register.length, 1);
});

test("failed preference fetch never silently enables push", async () => {
  const { service, calls } = harness({ fetchFails: true });
  await service.syncPushRegistrationIfAlreadyAllowed("access", "user");
  assert.equal(calls.register.length, 0);
});

test("revoked OS permission disables this device without disabling the account", async () => {
  const { service, calls, storage } = harness({ permission: "denied" });
  await service.syncPushRegistrationIfAlreadyAllowed("access", "user");
  assert.deepEqual(calls.disable, ["device"]);
  assert.equal(calls.update.length, 0);
  assert.equal(calls.request, 0);
  assert.equal(storage.has("hypofit.push.registered_device_id"), false);
});

test("undetermined permission is not requested by passive foreground sync", async () => {
  const { service, calls } = harness({ permission: "undetermined" });
  await service.syncPushRegistrationIfAlreadyAllowed("access", "user");
  assert.equal(calls.register.length, 0);
  assert.equal(calls.request, 0);
});

test("explicit enable registers then updates account preference", async () => {
  const { service, calls } = harness({ enabled: false });
  const result = await service.requestAndRegisterPush("access");
  assert.equal(result.state, "registered");
  assert.equal(calls.register.length, 1);
  assert.equal(calls.update[0].push_enabled, true);
});

test("denied explicit enable does not register or update account", async () => {
  const { service, calls } = harness({ enabled: false, permission: "denied" });
  const result = await service.requestAndRegisterPush("access");
  assert.equal(result.state, "denied");
  assert.equal(calls.register.length, 0);
  assert.equal(calls.update.length, 0);
});
