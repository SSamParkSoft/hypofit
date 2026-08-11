import { describe, expect, it } from "vitest";

import { ApiError } from "./client";
import { getApiErrorMessage, getApiErrorPresentation } from "./errorPresentation";

describe("API error presentation", () => {
  it("preserves a safe code and request ID from structured API errors", () => {
    const error = new ApiError({
      code: "support_ticket_conflict",
      kind: "http",
      message: "이미 처리된 문의예요.",
      method: "PATCH",
      path: "/api/v1/support/tickets/1",
      requestId: "req_support_1",
      status: 409,
    });

    expect(getApiErrorPresentation(error, "문의를 처리하지 못했어요.")).toEqual({
      code: "support_ticket_conflict",
      message: "이미 처리된 문의예요.",
      requestId: "req_support_1",
    });
    expect(getApiErrorMessage(error, "문의를 처리하지 못했어요.")).toBe(
      "이미 처리된 문의예요. 요청 ID: req_support_1",
    );
  });

  it("uses the fallback for unknown failures without inventing diagnostics", () => {
    expect(getApiErrorPresentation({}, "다시 시도해 주세요.")).toEqual({
      code: null,
      message: "다시 시도해 주세요.",
      requestId: null,
    });
  });
});
