import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";

const values = new Map();
const calls = [];
let failWrite = false;
let failRead = false;
globalThis.__postingDraftStorage = {
  async getItem(key) {
    calls.push(["get", key]);
    if (failRead) throw new Error("Storage unavailable");
    return values.get(key) ?? null;
  },
  async setItem(key, value) {
    calls.push(["set", key]);
    if (failWrite) throw new Error("Storage unavailable");
    values.set(key, value);
  },
  async removeItem(key) {
    calls.push(["remove", key]);
    values.delete(key);
  },
};

// Mock native modules only; run the real TypeScript storage and migration code.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@react-native-async-storage/async-storage") {
      return { url: "data:text/javascript,export default globalThis.__postingDraftStorage", shortCircuit: true };
    }
    if (specifier === "expo-crypto") {
      return { url: "data:text/javascript,export const randomUUID = () => globalThis.crypto.randomUUID()", shortCircuit: true };
    }
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      const url = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(fileURLToPath(url))) return { url: url.href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

const {
  createInitialPostingCreationDraft,
  loadPostingCreationDraft,
  savePostingCreationDraft,
  clearPostingCreationDraft,
  loadPostingEditDraft,
  savePostingEditDraft,
  clearPostingEditDraft,
} = await import("../src/features/postings/postingCreationDraft.ts");
const legacyKey = "hypofit:posting-creation-draft:v1";
const key = (userId) => `hypofit:posting-creation-draft:v2:${userId}`;
const draft = (title) => ({ ...createInitialPostingCreationDraft(), title });

beforeEach(() => {
  values.clear();
  calls.length = 0;
  failWrite = false;
  failRead = false;
});

test("each account loads only its own creation draft", async () => {
  const a = draft("A의 연구 모집");
  const b = draft("B의 설문 모집");
  await savePostingCreationDraft("user-a", a);
  assert.equal(await loadPostingCreationDraft("user-b"), null);
  await savePostingCreationDraft("user-b", b);
  assert.deepEqual(await loadPostingCreationDraft("user-a"), a);
  assert.deepEqual(await loadPostingCreationDraft("user-b"), b);
});

test("publish cleanup deletes only the submitting account draft", async () => {
  await savePostingCreationDraft("user-a", draft("A"));
  await savePostingCreationDraft("user-b", draft("B"));
  await clearPostingCreationDraft("user-a");
  assert.equal(await loadPostingCreationDraft("user-a"), null);
  assert.equal((await loadPostingCreationDraft("user-b")).title, "B");
});

test("ownerless legacy draft is never read, migrated or deleted", async () => {
  const original = JSON.stringify(draft("기존 공용 초안"));
  values.set(legacyKey, original);
  assert.equal(await loadPostingCreationDraft("user-a"), null);
  assert.equal(await loadPostingCreationDraft("user-b"), null);
  await savePostingCreationDraft("user-a", draft("새 초안"));
  await clearPostingCreationDraft("user-a");
  assert.equal(values.get(legacyKey), original);
  assert.equal(calls.some(([, storageKey]) => storageKey === legacyKey), false);
});

test("missing identity cannot read, write or remove storage", async () => {
  for (const userId of [undefined, null, "", "   "]) {
    await assert.rejects(loadPostingCreationDraft(userId), /user ID/);
    await assert.rejects(savePostingCreationDraft(userId, draft("미인증")), /user ID/);
    await assert.rejects(clearPostingCreationDraft(userId), /user ID/);
  }
  assert.equal(calls.length, 0);
});

test("research and survey fields and submission key survive readback", async () => {
  for (const type of ["interview", "survey", "beta_test", "research_experiment"]) {
    const original = {
      ...draft("유형별 초안"), type,
      externalProvider: "tally", externalUrl: "https://tally.so/r/example",
      scheduleNote: "첫째 줄\n둘째 줄", betaPlatforms: ["ios", "android"],
    };
    await savePostingCreationDraft("user-a", original);
    assert.deepEqual(await loadPostingCreationDraft("user-a"), original);
  }
});

test("account-scoped v1 payload still migrates to schema v2", async () => {
  const original = { ...draft("오래된 payload"), schemaVersion: 1 };
  values.set(key("user-a"), JSON.stringify(original));
  const restored = await loadPostingCreationDraft("user-a");
  assert.equal(restored.schemaVersion, 2);
  assert.equal(restored.title, original.title);
  assert.equal(restored.clientSubmissionId, original.clientSubmissionId);
});

test("unsupported draft type remains intact instead of silently becoming interview", async () => {
  await savePostingCreationDraft("user-a", { ...draft("기타 유형"), type: "other" });
  assert.equal((await loadPostingCreationDraft("user-a")).type, "other");
});

test("failed save leaves the previous persisted draft available for retry", async () => {
  await savePostingCreationDraft("user-a", draft("기존 값"));
  failWrite = true;
  await assert.rejects(savePostingCreationDraft("user-a", draft("새 값")), /unavailable/);
  assert.equal((await loadPostingCreationDraft("user-a")).title, "기존 값");
  failWrite = false;
  await savePostingCreationDraft("user-a", draft("새 값"));
  assert.equal((await loadPostingCreationDraft("user-a")).title, "새 값");
});

test("load failure propagates without clearing the draft", async () => {
  const original = draft("복구 대상");
  await savePostingCreationDraft("user-a", original);
  failRead = true;
  await assert.rejects(loadPostingCreationDraft("user-a"), /unavailable/);
  failRead = false;
  assert.deepEqual(await loadPostingCreationDraft("user-a"), original);
});

test("creation and per-post edit drafts do not overwrite or clear each other", async () => {
  const creation = draft("신규 공고");
  const editing = { baseline: draft("서버 값"), draft: draft("수정 값") };
  await savePostingCreationDraft("user-a", creation);
  await savePostingEditDraft("user-a", "post-a", editing);
  assert.equal(await loadPostingEditDraft("user-b", "post-a"), null);
  assert.equal(await loadPostingEditDraft("user-a", "post-b"), null);
  assert.deepEqual(await loadPostingEditDraft("user-a", "post-a"), editing);
  await clearPostingEditDraft("user-a", "post-a");
  assert.deepEqual(await loadPostingCreationDraft("user-a"), creation);
});
