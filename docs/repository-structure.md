# Repository Structure

## Decision

Hypofit uses a monorepo.

This is appropriate for the MVP because the React web app, Expo React Native
mobile app, Spring API, shared contracts, documentation, and deployment files
still change together. A monorepo makes it easier to keep API contracts,
mobile/web clients, and operational docs aligned in the same pull request.

## Target Structure

```text
hypofit/
  apps/
    web/
      src/
        app/
        pages/
        features/
        shared/
      public/
        manifest.webmanifest
      package.json
      vite.config.ts

    mobile/
      app/
        (auth)/
        (tabs)/
          home/
            _layout.tsx
            index.tsx
          interviews/
            _layout.tsx
            index.tsx
            [postId].tsx
            my-interviews.tsx
            new.tsx
          map/
            _layout.tsx
            index.tsx
          chat/
            _layout.tsx
            index.tsx
            [roomId].tsx
          profile/
            _layout.tsx
            index.tsx
            account.tsx
            role.tsx
            notifications.tsx
            appearance.tsx
            delete-account.tsx
        support/
        legal/
        notifications.tsx
        notice.tsx
      src/
      package.json

    api/
      src/main/java/com/contentruck/hypofit/
        interview/
          controller/
          dto/
          service/
          repository/
          entity/
        common/
      src/main/resources/
        db/migration/
      src/test/
      build.gradle.kts
      gradlew

  packages/
    contracts/

  infra/
    docker-compose.yml  # local PostgreSQL only
    lightsail/          # production Spring container deployment

  docs/
    README.md
    service/
    active/
    reference/
    completed/

  .env.example
  README.md
  Makefile
```

## apps/web

The React web application.

Responsibilities:

- Public web routes, legal pages, support/deletion pages, admin/operator
  surfaces, and web fallback pages.
- UI components.
- API client.
- Supabase client integration for auth.
- PWA manifest/service worker as a web fallback, not the native store path.
- Vercel deployment config.

Internal source ownership:

```text
src/app -> src/pages -> src/features -> src/shared
```

- `src/app`: providers, route manifest/renderer, access policy, and connected
  shell composition.
- `src/pages`: thin route composition modules that choose feature workflows and
  page layout modes.
- `src/features`: domain controllers, models, query keys, mutations, and
  feature-local presentation.
- `src/shared`: product-agnostic API transport, configuration, browser and
  navigation utilities, and reusable UI primitives.

The direction is enforced by
`apps/web/scripts/check-architecture-boundaries.mjs`. Feature-to-feature imports
are allowed only through the explicit directed workflow graph in that script;
new broad allowlists are not an acceptable shortcut.

Web quality commands are independent and meaningful: `typecheck` performs
TypeScript validation, `lint` runs ESLint plus dependency-boundary checks,
`test` and `test:coverage` run Vitest, `bundle:check` enforces the measured
bundle budget, and `test:browser` verifies the public entry and protected auth
bootstrap in a real Chromium browser.

Web production deployment is manual while Vercel Git auto-deploy is disabled.
GitHub push is source publication and backup, not an automatic web deploy
trigger.

## apps/mobile

The Expo React Native application.

Responsibilities:

- App Store and Google Play release target.
- Native navigation, safe-area, permission, push, map, image, and keyboard
  behavior.
- Mobile API client and Supabase auth client.
- NativeWind mobile UI implementation.
- Local iOS IPA and Android AAB build paths.

Do not implement this app as a thin WebView wrapper around `apps/web`.

## apps/api

The Java 21 Spring Boot application.

Responsibilities:

- Feature-first Spring MVC controllers and request/response DTOs.
- Authentication and authorization.
- Services that own use cases, business rules, and transaction boundaries.
- Feature-local repositories and JPA entities.
- OpenAPI contract generation.
- Flyway migrations.

Feature packages use the conventional structure
`controller`, `dto`, `service`, `repository`, and `entity`. Add `client` only
for an actual external provider integration. Keep shared security,
configuration, error handling, and observability under `common`. Hypofit does
not use a separate DDD or hexagonal layer for each use case; unnecessary ports,
adapters, commands, and result wrappers should not be introduced.

## packages/contracts

Shared TypeScript domain contracts and client-facing schema types used by the
web and mobile apps where practical. Manual contracts are currently preferred
for MVP stability; generated OpenAPI clients can be revisited later if contract
drift becomes frequent.

## infra

Operational files.

Expected contents:

- local Docker Compose for PostgreSQL development only.
- Lightsail Docker Compose, deployment script, Nginx configuration, and pinned
  SSH host key.

## docs

Product and engineering documentation.

Current root documents:

- `README.md`
- `architecture.md`
- `development.md`
- `deployment.md`
- `mvp-scope.md`
- `repository-structure.md`

Documentation hierarchy:

- `docs/service/`: service-level source of truth for product philosophy, user
  workflows, feature map, domain model, app surfaces, API/backend map, design
  principles, operations, compliance, and glossary. Read this first.
- `docs/active/`: current implementation plans only.
- `docs/reference/`: standards, runbooks, review-readiness references, design
  guidance, and policy/architecture background.
- `docs/completed/`: finished implementation plans and historical notes.

## When to Split Repositories

The monorepo can be split later if the project grows.

Possible split signals:

- Frontend and backend teams become independent.
- API lifecycle becomes independent from the web/mobile clients.
- Security or deployment ownership differs by service.
- CI becomes too slow or complex.
- The backend becomes a platform for multiple clients.

Until then, the monorepo is the simpler and more practical choice.
