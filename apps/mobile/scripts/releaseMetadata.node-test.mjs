import assert from "node:assert/strict";

import {
  CLIENT_BUILD_HEADER,
  CLIENT_REVISION_HEADER,
  CLIENT_VERSION_HEADER,
  buildClientReleaseHeaders,
} from "../src/shared/api/releaseMetadata.ts";

function run() {
  const fullHeaders = buildClientReleaseHeaders({
    version: " 1.0.1 ",
    build: 42,
    revision: " abc123def456 ",
  });

  assert.deepEqual(fullHeaders, {
    [CLIENT_VERSION_HEADER]: "1.0.1",
    [CLIENT_BUILD_HEADER]: "42",
    [CLIENT_REVISION_HEADER]: "abc123def456",
  });

  const partialHeaders = buildClientReleaseHeaders({
    version: "",
    build: null,
    revision: "   ",
  });

  assert.deepEqual(partialHeaders, {});
}

run();
