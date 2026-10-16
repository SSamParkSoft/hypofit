import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/screens/postings/creation/CreationDateFields.tsx", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
});
const today = "2026-10-16";
const existing = "2026-10-20";
const changed = "2026-10-23";
class FixedDate extends Date {
  constructor(...args) {
    super(...(args.length ? args : [2026, 9, 16, 12]));
  }
}
const formatDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

// Run the real row and DateField handlers; native rendering and the clock are mocked.
function harness({ platform = "ios", deadline = "" } = {}) {
  const states = [];
  const calls = [];
  let cursor = 0;
  const props = {
    enabled: Boolean(deadline), deadline,
    onChange(value) {
      calls.push(value);
      props.enabled = true;
      props.deadline = value;
    },
  };
  const jsx = (type, props) => typeof type === "function" ? type(props) : { type, props };
  const modules = {
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in states)) states[index] = initial;
        return [states[index], (value) => { states[index] = value; }];
      },
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": {
      Keyboard: { dismiss() {} }, Platform: { OS: platform },
      Modal: "Modal", Pressable: "Pressable", ScrollView: "ScrollView", Text: "Text", View: "View",
    },
    "@expo/vector-icons": { Feather: "Feather" },
    "@react-native-community/datetimepicker": { __esModule: true, default: "Picker" },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 0, bottom: 34 }) },
    "@/shared/theme/tokens": { colors: {} },
    "./creationDateFormatting": { formatDate, isIsoDate: (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) },
    "./CreationFormControls": { InlineError: "InlineError" },
  };
  const fields = {};
  runInNewContext(outputText, {
    exports: fields, Date: FixedDate,
    require(name) { assert.ok(Object.hasOwn(modules, name), name); return modules[name]; },
  });
  function nodes() {
    cursor = 0;
    const result = [];
    function collect(node) {
      if (Array.isArray(node)) return node.forEach(collect);
      if (!node?.props) return;
      result.push(node);
      collect(node.props.children);
    }
    collect(fields.DeadlineSettingRow(props));
    return result;
  }
  function find(predicate) {
    const node = nodes().find(predicate);
    assert.ok(node, "expected control to be rendered");
    return node.props;
  }
  return {
    calls, props, find,
    open: () => find((node) => node.type === "Pressable" && node.props.accessibilityState).onPress(),
    picker: () => find((node) => node.type === "Picker"),
    confirm: (date) => find((node) => node.props.accessibilityLabel === `마감일 설정 ${date} 선택`).onPress(),
    assertClosed() {
      assert.equal(nodes().some((node) => node.type === "Picker" || node.type === "Modal"), false);
    },
  };
}

test("empty deadline confirms today without a picker change event", () => {
  const h = harness();
  h.open();
  assert.equal(formatDate(h.picker().value), today);
  assert.deepEqual(h.calls, []);
  assert.equal(h.props.enabled, false);
  h.confirm(today);
  assert.deepEqual(h.calls, [today]);
  assert.equal(h.props.deadline, today);
  assert.equal(h.props.enabled, true);
  h.assertClosed();
});

test("iOS cancel paths preserve the committed date and discard temporary selection", () => {
  const cancelActions = [
    (h) => h.find((node) => node.props.accessibilityLabel === "날짜 선택 취소").onPress(),
    (h) => h.find((node) => node.type === "Modal").onRequestClose(),
    (h) => h.find((node) => node.type === "Pressable" && node.props.accessible === false).onPress(),
    (h) => h.find((node) => node.props.accessibilityViewIsModal).onAccessibilityEscape(),
  ];
  for (const deadline of ["", existing]) {
    for (const cancel of cancelActions) {
      const h = harness({ deadline });
      h.open();
      h.picker().onChange({ type: "set" }, new Date(`${changed}T12:00:00`));
      assert.deepEqual(h.calls, []);
      cancel(h);
      assert.deepEqual(h.calls, []);
      assert.equal(h.props.deadline, deadline);
      assert.equal(h.props.enabled, Boolean(deadline));
      h.assertClosed();
      h.open();
      assert.equal(formatDate(h.picker().value), deadline || today);
    }
  }
});

test("changed iOS date is committed only on explicit confirmation", () => {
  const h = harness({ deadline: existing });
  h.open();
  h.picker().onChange({ type: "set" }, new Date(`${changed}T12:00:00`));
  assert.equal(formatDate(h.picker().value), changed);
  assert.equal(h.props.deadline, existing);
  assert.deepEqual(h.calls, []);
  h.confirm(changed);
  assert.deepEqual(h.calls, [changed]);
  assert.equal(h.props.deadline, changed);
  h.assertClosed();
  h.open();
  assert.equal(formatDate(h.picker().value), changed);
});

test("Android dismiss ignores a supplied date and preserves the previous value", () => {
  for (const deadline of ["", existing]) {
    const h = harness({ platform: "android", deadline });
    h.open();
    h.picker().onChange({ type: "dismissed" }, new Date(`${changed}T12:00:00`));
    assert.deepEqual(h.calls, []);
    assert.equal(h.props.deadline, deadline);
    assert.equal(h.props.enabled, Boolean(deadline));
    h.assertClosed();
    h.open();
    assert.equal(formatDate(h.picker().value), deadline || today);
  }
});
