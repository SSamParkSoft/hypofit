import assert from "node:assert/strict";

import {
  POSTING_FEATURES_HEADER,
  POSTING_RECRUITMENT_TYPES_CAPABILITY,
  RESEARCH_RECRUITMENT_CAPABILITY,
  withPostingFeatures,
} from "../src/features/postings/postingFeatureHeaders.ts";

function run() {
  const merged = withPostingFeatures({
    headers: {
      "X-Custom-Trace": "trace-1",
    },
  });

  const mergedHeaders = new Headers(merged.headers);
  assert.equal(
    mergedHeaders.get(POSTING_FEATURES_HEADER),
    `${POSTING_RECRUITMENT_TYPES_CAPABILITY},${RESEARCH_RECRUITMENT_CAPABILITY}`,
  );
  assert.equal(mergedHeaders.get("X-Custom-Trace"), "trace-1");

  const overridden = withPostingFeatures({
    headers: {
      [POSTING_FEATURES_HEADER]: "old-value",
    },
  });

  const overriddenHeaders = new Headers(overridden.headers);
  assert.equal(
    overriddenHeaders.get(POSTING_FEATURES_HEADER),
    `${POSTING_RECRUITMENT_TYPES_CAPABILITY},${RESEARCH_RECRUITMENT_CAPABILITY}`,
  );
}

run();
