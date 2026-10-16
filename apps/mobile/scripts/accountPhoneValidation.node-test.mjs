import assert from "node:assert/strict";
import { test } from "node:test";
import { getPhoneValidationError } from "../../../packages/contracts/src/formatting/phone.ts";

test("optional phone can be unset or cleared", () => {
  for (const value of [null, undefined, "", "   "]) {
    assert.equal(getPhoneValidationError(value), null);
  }
});

test("current API domestic number lengths and 82 prefix remain accepted", () => {
  for (const value of ["01012345678", "010-1234-5678", "02-1234-5678", "031-123-4567", "03112345678", "+82 10-1234-5678"]) {
    assert.equal(getPhoneValidationError(value), null, value);
  }
});

test("partial or overlong numbers show the existing API length error", () => {
  for (const value of ["010-123", "010", "02-123-4567", "010123456789"]) {
    assert.equal(getPhoneValidationError(value), "전화번호는 10~11자리 국내 번호로 입력하세요.", value);
  }
});

test("non-domestic prefix shows the existing API prefix error", () => {
  for (const value of ["1234567890", "+1 2345678900", "abc"]) {
    assert.equal(getPhoneValidationError(value), "전화번호는 0으로 시작하는 국내 번호를 입력하세요.", value);
  }
});

test("the existing API maximum raw length is enforced before stripping formatting", () => {
  assert.equal(getPhoneValidationError("01012345678" + " ".repeat(30) + "x"), "전화번호는 40자 이하로 입력해 주세요.");
});
