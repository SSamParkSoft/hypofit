# API Contract Tooling

This directory retains the reviewed API surface from the retired FastAPI
implementation as a frozen compatibility baseline for the canonical Spring
API.

Tracked files:

- `baselines/legacy-openapi.normalized.json`: frozen normalized legacy API
  surface.
- `approved-openapi-differences.json`: explicit reviewed differences that may
  remain in the Spring contract.

Generated files under `generated/` are ignored and may be recreated locally.

Run the comparison against a running API:

```bash
make contract-api OPENAPI_URL=http://127.0.0.1:8080/v3/api-docs
```

Or compare an exported document:

```bash
make contract-api OPENAPI_FILE=/tmp/hypofit-openapi.json
```

The normalizer removes framework-only metadata and generated validation noise
while keeping paths, methods, status codes, security, request constraints, and
runtime response shapes comparable. The legacy file is a compatibility
artifact, not an executable backend or a schema-migration source.
