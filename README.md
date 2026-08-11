# Hypofit

Hypofit is an interview matching service for pre-founders and early-stage founders. Founders post paid customer interview opportunities, and respondents apply after checking whether their experience, location, availability, and expected reward match the request.

The first product goal is not to build a large research platform. The MVP should quickly validate whether founders are willing to pay for customer interviews, whether real target customers are willing to participate, and whether the matching and attendance flow can reduce friction and no-shows.

## Current Architecture Decision

The repository is a monorepo because the React web app, Expo React Native mobile app, shared contracts, and Spring Boot backend are developed together during the MVP phase.

```text
hypofit/
  apps/
    web/        # React/Vite web app and public legal/install pages, deployed to Vercel
    mobile/     # Expo React Native app for native iOS and Android releases
    api/        # Java 21 Spring Boot API
  infra/        # local Postgres and Lightsail deployment assets
  docs/         # Product, architecture, deployment, and API notes
```

## Deployment Decision

```text
Browser / Web app or Expo mobile app
  -> Vercel web hosting where applicable
  -> https://hypofit-api.bukae.co.kr
  -> Lightsail static IPv4 54.116.198.195
  -> host Nginx on 80/443
  -> Spring Boot container on 127.0.0.1:8080
  -> Supabase Postgres/Auth
```

The school GPU server has been returned and is not a runtime or rollback target.
As of 2026-08-11, the topology above is active. The immutable Spring image,
production secrets, Flyway baseline, Nginx, TLS, and canonical DNS are deployed.
Public health, readiness, CORS, and authentication boundaries are verified;
authenticated product-flow smoke and stabilization remain. Supabase remains
the durable system of record.

Native mobile distribution is handled through `apps/mobile` with Expo React
Native. iOS `1.0.0` is the reviewed/released baseline, and follow-up mobile
uploads should use `1.0.1` or later. Android/Google Play readiness remains an
active release track.

## Documentation

- [Service Knowledge Base](docs/service/README.md)
- [Agent Start Here](docs/service/00-agent-start-here.md)
- [Current MVP Execution Roadmap](docs/active/current-mvp-execution-roadmap.md)
- [Cross-Platform Social Login and Identity Governance Plan](docs/active/cross-platform-social-login-authentication-plan.md)
- [AI-Assisted Design Workflow](docs/service/15-ai-assisted-design-workflow.md)
- [Brand Logo and Icon System Migration Plan](docs/active/hypofit-brand-logo-icon-system-migration-plan.md)
- [FastAPI to Spring Boot Backend Migration History](docs/completed/fastapi-to-spring-boot-backend-migration-plan.md)
- [AI Interview and Applicant Summary Plan](docs/active/ai-interview-and-applicant-summary-plan.md)
- [Desktop Web Service UI Advancement Plan](docs/active/desktop-web-service-ui-advancement-plan.md)
- [React Web Architecture and Modularization Refactoring Plan](docs/completed/react-web-architecture-modularization-refactoring-plan.md)
- [Architecture](docs/architecture.md)
- [MVP Scope](docs/mvp-scope.md)
- [Deployment](docs/deployment.md)
- [Repository Structure](docs/repository-structure.md)

## Local Development

The scaffold is intentionally split by app.

Frontend:

```bash
cd apps/web
pnpm install
pnpm dev
```

Mobile:

```bash
cd apps/mobile
pnpm install
pnpm ios
pnpm android
pnpm typecheck
```

Backend:

```bash
docker compose -f infra/docker-compose.yml up -d
make dev-api
```

The initial API exposes:

```text
GET  /health
GET  /api/v1/health
POST /api/v1/me/sync
GET  /api/v1/interview-posts/
POST /api/v1/interview-posts/
GET  /api/v1/applications/
POST /api/v1/applications/
GET  /api/v1/sessions/
POST /api/v1/sessions/
```

Create operations that depend on user ownership expect a Supabase bearer token.

Local Postgres:

```bash
docker compose -f infra/docker-compose.yml up -d
```

Repository integration tests use Testcontainers and require Docker:

```bash
make test-api-integration
```

The root compose file remains for local integration development. The Lightsail
production runtime uses a separate minimal compose definition for one Spring
container and must bind the application only to `127.0.0.1:8080` behind Nginx.

Root helper commands are also available through `make` once dependencies are installed:

```bash
make dev-web
make dev-mobile
make dev-api
make build-web
make test-mobile
make test-api
```
