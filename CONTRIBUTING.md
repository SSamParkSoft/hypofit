# Contributing

This is a private internal repository for Hypofit. We are not accepting
external open source contributions.

## Working Style

- Keep scope narrow.
- Prefer the smallest shippable change that solves the requested problem.
- Update docs in the same change when behavior, operations, or architecture
  changes.
- Do not commit secrets, local build artifacts, or store-upload binaries.

## Local Commands

Use the root `Makefile` commands that already exist in this repository:

```bash
make dev-web
make dev-mobile
make dev-api

make test-web
make test-mobile
make test-api
make test-api-integration

make lint-web
make lint-mobile
make lint-api

make build-web
make build-api
```

## Validation Expectations

Run the checks that match your change:

- web UI or web state changes: `make test-web`, `make lint-web`, `make build-web`
- mobile app changes: `make test-mobile`, `make lint-mobile`
- API changes: `make test-api`, `make lint-api`
- API contract, persistence, or integration-sensitive changes:
  `make test-api-integration`

Do not expand validation beyond the touched surface unless the change crosses
multiple layers.

## Pull Requests

Before opening a pull request:

1. make sure the branch is scoped to one coherent change
2. summarize what changed and why
3. list the commands you ran
4. note any follow-up work or known limitations
5. include screenshots for visible UI changes when helpful

Keep the PR description factual. Avoid speculative roadmap language.
