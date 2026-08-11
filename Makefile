.PHONY: dev-web dev-mobile dev-api test-web test-mobile test-api test-api-integration lint-web lint-mobile lint-api build-web build-api contract-api health-api

API_SCRIPTS := apps/api/scripts

dev-web:
	cd apps/web && npm run dev

dev-mobile:
	cd apps/mobile && npm run start

dev-api:
	$(API_SCRIPTS)/run_gradle_task.sh bootRun

test-web:
	cd apps/web && npm run test

test-mobile:
	cd apps/mobile && npm run typecheck

test-api:
	$(API_SCRIPTS)/run_gradle_task.sh test

test-api-integration:
	$(API_SCRIPTS)/run_gradle_task.sh integrationTest

lint-web:
	cd apps/web && npm run lint

lint-mobile:
	cd apps/mobile && npm run typecheck

lint-api:
	$(API_SCRIPTS)/run_gradle_task.sh check

build-web:
	cd apps/web && npm run build

build-api:
	$(API_SCRIPTS)/run_gradle_task.sh build

contract-api:
	OPENAPI_URL="$(OPENAPI_URL)" \
	OPENAPI_FILE="$(OPENAPI_FILE)" \
	$(API_SCRIPTS)/contract_api.sh

health-api:
	curl -fsS http://127.0.0.1:8080/api/v1/health/ready
