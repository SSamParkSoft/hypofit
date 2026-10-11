.PHONY: dev-web dev-mobile dev-api test-web test-mobile test-api test-api-integration lint-web lint-mobile lint-api build-web build-api build-mobile-ios-dev build-mobile-android-dev build-mobile-ios-local build-mobile-android-local build-mobile-environment contract-api health-api

API_SCRIPTS := apps/api/scripts

dev-web:
	corepack pnpm --dir apps/web dev

dev-mobile:
	corepack pnpm --dir apps/mobile start

dev-api:
	$(API_SCRIPTS)/run_gradle_task.sh bootRun

test-web:
	corepack pnpm --dir apps/web test

test-mobile:
	corepack pnpm --dir apps/mobile test

test-api:
	@$(error API E2E suite is not configured yet; do not run the historical test task as a substitute)

test-api-integration:
	$(API_SCRIPTS)/run_gradle_task.sh integrationTest

lint-web:
	corepack pnpm --dir apps/web lint

lint-mobile:
	corepack pnpm --dir apps/mobile lint

lint-api:
	$(API_SCRIPTS)/run_gradle_task.sh checkstyleMain

build-web:
	corepack pnpm --dir apps/web build

build-mobile-ios-dev:
	corepack pnpm --dir apps/mobile build:ios:dev

build-mobile-android-dev:
	corepack pnpm --dir apps/mobile build:android:dev

build-mobile-ios-local:
	corepack pnpm --dir apps/mobile build:ios:local

build-mobile-android-local:
	corepack pnpm --dir apps/mobile build:android:local

build-mobile-environment:
	corepack pnpm --dir apps/mobile build:environment

build-api:
	$(API_SCRIPTS)/run_gradle_task.sh bootJar

contract-api:
	OPENAPI_URL="$(OPENAPI_URL)" \
	OPENAPI_FILE="$(OPENAPI_FILE)" \
	$(API_SCRIPTS)/contract_api.sh

health-api:
	curl -fsS http://127.0.0.1:8080/api/v1/health/ready
