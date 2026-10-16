import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/features/auth/social/socialAuthService.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: false,
  },
});
const storageKey = "hypofit.social-auth.pending.v1";
const callback = "hypofit://auth/social-callback";
const validAttempt = {
  attemptId: "test-attempt",
  attemptSecret: "test-secret",
  expiresAt: "2099-01-01T00:00:00Z",
  provider: "google",
  platform: "ios",
  returnPath: null,
};

class ApiError extends Error {
  constructor(code, userMessage, status) {
    super(userMessage);
    Object.assign(this, { code, userMessage, status });
  }
}

// Isolate each service instance; only native and external boundaries are mocked.
function createHarness({ attempt = validAttempt, apiError } = {}) {
  let pending = attempt === null ? null : JSON.stringify(attempt);
  const calls = { exchange: [], restore: [], complete: [], remove: [] };
  const response = { next_step: "signed_in", return_path: null };
  const session = { access_token: "test-access-token" };
  const mocks = {
    "@react-native-async-storage/async-storage": { default: {
      async getItem(key) {
        assert.equal(key, storageKey);
        return pending;
      },
      async removeItem(key) {
        assert.equal(key, storageKey);
        calls.remove.push(key);
        pending = null;
      },
    } },
    "expo-apple-authentication": {},
    "expo-crypto": {},
    "expo-web-browser": { maybeCompleteAuthSession() {} },
    "react-native": { Platform: { OS: "ios" } },
    "@/shared/api/client": { ApiError, NetworkError: class extends Error {} },
    "@/features/auth/social/socialAuthApi": { socialAuthApi: {
      async completeAttempt(payload, accessToken) {
        calls.complete.push({ ...payload, accessToken });
        if (apiError) throw apiError;
        return response;
      },
    } },
    "@/shared/diagnostics/sentry": { addAppBreadcrumb() {}, captureAppError() {} },
    "@/shared/navigation/backNavigation": { getSafeReturnTo: (value) => value },
    "@/shared/api/supabase": { getSupabaseClient: () => ({ auth: {
      async exchangeCodeForSession(code) {
        calls.exchange.push(code);
        return { data: { session }, error: null };
      },
      async setSession(tokens) {
        calls.restore.push({ ...tokens });
        return { data: { session }, error: null };
      },
    } }) },
  };
  const service = {};
  runInNewContext(outputText, {
    exports: service,
    require(name) {
      assert.ok(Object.hasOwn(mocks, name), `Unexpected dependency: ${name}`);
      return mocks[name];
    },
    URL, URLSearchParams, Date,
  }, { filename: "socialAuthService.transpiled.cjs" });
  return { service, calls, response, pending: () => pending };
}

test("Naver is absent from public mobile providers", () => {
  const { service } = createHarness();
  assert.deepEqual(Array.from(service.getPublicMobileSocialProviderIds("ios")), ["kakao", "apple", "google"]);
  assert.deepEqual(Array.from(service.getPublicMobileSocialProviderIds("android")), ["kakao", "google"]);
});

test("Naver login and linking stop before external calls", async () => {
  const { service } = createHarness();
  for (const action of [() => service.startSocialAuth("naver"), () => service.startSocialIdentityLink("naver", "test-token")]) {
    await assert.rejects(action, (error) => service.getSocialAuthDiagnosticCode(error) === "social_provider_disabled");
  }
});

test("pending Naver callbacks are cleared without exchanging credentials", async () => {
  const harness = createHarness({ attempt: { ...validAttempt, provider: "naver" } });
  await assertCallbackError(harness, `${callback}?code=test-code`, "social_provider_disabled");
  assert.equal(harness.calls.exchange.length, 0);
  assert.equal(harness.calls.restore.length, 0);
  assert.equal(harness.calls.complete.length, 0);
});

async function assertCallbackError(harness, url, code, phase = "provider_callback") {
  await assert.rejects(harness.service.completeSocialAuthFromCallback(url), (error) => {
    assert.equal(harness.service.getSocialAuthDiagnosticCode(error), code);
    assert.equal(error.phase, phase);
    assert.equal(error.message.includes("private-provider-detail"), false);
    return true;
  });
  assert.equal(harness.pending(), null);
}

function assertNoExternalCalls(harness) {
  assert.equal(harness.calls.exchange.length, 0);
  assert.equal(harness.calls.restore.length, 0);
  assert.equal(harness.calls.complete.length, 0);
}

for (const params of [
  "?error=server_error&error_description=private-provider-detail",
  "#error_code=unexpected_failure&error_description=private-provider-detail",
  "?error=server_error&code=test-code",
]) {
  test(`valid pending provider failure is an exchange failure: ${params.split("&")[0]}`, async () => {
    const harness = createHarness();
    await assertCallbackError(harness, callback + params, "social_code_exchange_failed");
    assert.equal(harness.calls.remove.length, 1);
    assertNoExternalCalls(harness);
  });
}

for (const url of [undefined, callback, `${callback}#access_token=test-access-token`]) {
  test(`valid pending callback without complete credentials is not expired: ${url ?? "undefined"}`, async () => {
    const harness = createHarness();
    await assertCallbackError(harness, url, "social_code_exchange_failed");
    assert.equal(harness.calls.remove.length, 1);
    assertNoExternalCalls(harness);
  });
}

for (const params of ["?error=access_denied", "#error_code=access_denied&error=server_error"]) {
  test(`cancellation takes precedence over provider failure: ${params}`, async () => {
    const harness = createHarness();
    await assertCallbackError(harness, callback + params, "social_authorization_cancelled");
    assert.equal(harness.calls.remove.length, 1);
    assertNoExternalCalls(harness);
  });
}

for (const attempt of [null, { ...validAttempt, expiresAt: "2000-01-01T00:00:00Z" }]) {
  test(`${attempt === null ? "missing" : "expired"} pending attempt remains a callback expiry`, async () => {
    const harness = createHarness({ attempt });
    await assertCallbackError(harness, `${callback}?code=test-code`, "social_callback_expired");
    assert.equal(harness.calls.remove.length, attempt === null ? 0 : 1);
    assertNoExternalCalls(harness);
  });
}

for (const tokenCallback of [false, true]) {
  test(`valid ${tokenCallback ? "token" : "code"} callback completes and clears pending`, async () => {
    const harness = createHarness();
    const url = tokenCallback
      ? `${callback}#access_token=test-access-token&refresh_token=test-refresh-token`
      : `${callback}?code=test-code`;
    assert.equal(await harness.service.completeSocialAuthFromCallback(url), harness.response);
    assert.deepEqual(harness.calls.exchange, tokenCallback ? [] : ["test-code"]);
    assert.deepEqual(harness.calls.restore, tokenCallback
      ? [{ access_token: "test-access-token", refresh_token: "test-refresh-token" }] : []);
    assert.deepEqual(harness.calls.complete, [{
      attempt_id: validAttempt.attemptId,
      attempt_secret: validAttempt.attemptSecret,
      accessToken: "test-access-token",
    }]);
    assert.equal(harness.pending(), null);
    assert.equal(harness.calls.remove.length, 1);
  });
}

test("API callback expiry retains its diagnostic code and identity-resolution phase", async () => {
  const harness = createHarness({ apiError: new ApiError("social_callback_expired", "Test expiry", 410) });
  await assertCallbackError(harness, `${callback}?code=test-code`, "social_callback_expired", "api_identity_resolve");
  assert.equal(harness.calls.exchange.length, 1);
  assert.equal(harness.calls.complete.length, 1);
});
