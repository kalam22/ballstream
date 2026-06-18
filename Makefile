# Makefile for ballstream Docker workflow
# Usage: make <target>

.PHONY: help setup build up down logs ps restart clean nuke prod-prod-up prod-build prod-down

# Default target
help:
	@echo ""
	@echo "  ballstream Docker commands"
	@echo "  ───────────────────────────────────────────────"
	@echo "  make setup      Copy .env.example → .env (first time)"
	@echo "  make build      Build all Docker images"
	@echo "  make up         Start all services (detached)"
	@echo "  make down       Stop all services"
	@echo "  make logs       Follow logs for all services"
	@echo "  make ps         Show running containers"
	@echo "  make restart    Rebuild + restart all services"
	@echo "  make clean      Remove containers + networks (keep volumes)"
	@echo "  make nuke       Remove everything including volumes ⚠️"
	@echo "  ───────────────────────────────────────────────"
	@echo "  Production (Ubuntu):"
	@echo "  make prod-up     Start with prod compose override"
	@echo "  make prod-build  Build for production"
	@echo "  make prod-down   Stop production services"
	@echo ""

setup:
	@bash -c 'if [ ! -f .env ]; then cp .env.example .env && echo "✅ .env created — fill in your secrets!"; else echo "⚠️  .env already exists, skipping."; fi'

build:
	docker compose build --parallel

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

ps:
	docker compose ps

restart: build
	docker compose up -d --force-recreate

clean:
	docker compose down --remove-orphans

nuke:
	docker compose down -v --remove-orphans
	docker image prune -f

# Production targets (Ubuntu / CI)
prod-build:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml build --parallel

prod-up:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

prod-down:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml down
