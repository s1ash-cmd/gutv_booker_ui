.PHONY: install dev-web dev-api build-web build-api test-web test-api lint-web check-api

install:
	npm --prefix apps/web ci

dev-web:
	npm --prefix apps/web run dev

dev-api:
	cd apps/api && go run ./cmd/server

build-web:
	npm --prefix apps/web run build

build-api:
	cd apps/api && go build -o bin/server ./cmd/server

test-web:
	npm --prefix apps/web test

test-api:
	cd apps/api && go test ./...

lint-web:
	npm --prefix apps/web run lint

check-api:
	cd apps/api && go vet ./...
