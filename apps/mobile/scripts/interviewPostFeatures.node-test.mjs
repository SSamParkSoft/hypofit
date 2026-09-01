import assert from "node:assert/strict";

import {
  INTERVIEW_POST_FEATURES_HEADER,
  INTERVIEW_POST_RECRUITMENT_TYPES_CAPABILITY,
  withInterviewPostFeatures,
} from "../src/shared/api/interviewPostFeatures.ts";

function run() {
  const merged = withInterviewPostFeatures({
    headers: {
      "X-Custom-Trace": "trace-1",
    },
  });

  const mergedHeaders = new Headers(merged.headers);
  assert.equal(
    mergedHeaders.get(INTERVIEW_POST_FEATURES_HEADER),
    INTERVIEW_POST_RECRUITMENT_TYPES_CAPABILITY,
  );
  assert.equal(mergedHeaders.get("X-Custom-Trace"), "trace-1");

  const overridden = withInterviewPostFeatures({
    headers: {
      [INTERVIEW_POST_FEATURES_HEADER]: "old-value",
    },
  });

  const overriddenHeaders = new Headers(overridden.headers);
  assert.equal(
    overriddenHeaders.get(INTERVIEW_POST_FEATURES_HEADER),
    INTERVIEW_POST_RECRUITMENT_TYPES_CAPABILITY,
  );
}

run();
