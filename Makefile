.PHONY: help install dev build clean docker-up docker-down docker-build test lint format

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
RED := \033[0;31m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "${BLUE}CueMate - Available Commands${NC}"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "${GREEN}%-20s${NC} %s\n", $$1, $$2}'

install: ## Install all dependencies
	@echo "${BLUE}Installing dependencies...${NC}"
	pnpm install
	@echo "${GREEN}Dependencies installed successfully!${NC}"

dev: ## Start all services in development mode
	@echo "${BLUE}Starting development servers...${NC}"
	pnpm dev

dev-desktop: ## Start desktop app in development mode
	@echo "${BLUE}Starting desktop app...${NC}"
	cd apps/desktop-tauri && pnpm tauri:dev

dev-services: ## Start backend services
	@echo "${BLUE}Starting backend services...${NC}"
	cd services/web-api && pnpm dev &
	cd services/llm-router && pnpm dev &
	cd services/rag-service && pnpm dev &

build: ## Build all applications
	@echo "${BLUE}Building all applications...${NC}"
	pnpm build
	@echo "${GREEN}Build completed!${NC}"

build-desktop: ## Build desktop application
	@echo "${BLUE}Building desktop app...${NC}"
	cd apps/desktop-tauri && pnpm tauri:build

build-docker: ## Build Docker images
	@echo "${BLUE}Building Docker images...${NC}"
	docker-compose build
	@echo "${GREEN}Docker images built!${NC}"

clean: ## Clean all build artifacts
	@echo "${BLUE}Cleaning build artifacts...${NC}"
	pnpm clean
	rm -rf node_modules
	rm -rf apps/*/node_modules
	rm -rf services/*/node_modules
	rm -rf packages/*/node_modules
	rm -rf apps/*/dist
	rm -rf services/*/dist
	rm -rf packages/*/dist
	@echo "${GREEN}Cleaned successfully!${NC}"


docker-up: ## Start core services with Docker (web-api only)
	@echo "${BLUE}Starting Docker services...${NC}"
	docker compose -f infra/docker/docker-compose.yml up -d web-api
	@echo "${GREEN}Services started!${NC}"
	@echo "Web API: http://localhost:3001"
	@echo "LLM Router: http://localhost:3002"
	@echo "RAG Service: http://localhost:3003"
	@echo "CueMate ASR: ws://localhost:10095/asr"

docker-down: ## Stop Docker services (web-api)
	@echo "${BLUE}Stopping Docker services...${NC}"
	docker compose -f infra/docker/docker-compose.yml down
	@echo "${GREEN}Services stopped!${NC}"

docker-logs: ## Show Docker logs (web-api)
	docker compose -f infra/docker/docker-compose.yml logs -f web-api

docker-clean: ## Clean Docker volumes and images
	@echo "${RED}Warning: This will delete all data!${NC}"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo ""; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v; \
		docker system prune -af; \
		echo "${GREEN}Docker cleaned!${NC}"; \
	fi

test: ## Run all tests
	@echo "${BLUE}Running tests...${NC}"
	pnpm test

test-watch: ## Run tests in watch mode
	@echo "${BLUE}Running tests in watch mode...${NC}"
	pnpm test:watch

lint: ## Lint all code
	@echo "${BLUE}Linting code...${NC}"
	pnpm lint

format: ## Format all code
	@echo "${BLUE}Formatting code...${NC}"
	pnpm format

setup: ## Initial setup for the project
	@echo "${BLUE}Setting up CueMate...${NC}"
	@echo "1. Copying environment file..."
	@if [ ! -f .env ]; then \
		cp .env.example .env 2>/dev/null || echo "Please create .env file from .env.example"; \
	fi
	@echo "2. Installing dependencies..."
	@make install
	@echo "3. Building services..."
	@make build
	@echo "${GREEN}Setup completed! Edit .env file with your API keys.${NC}"

check-deps: ## Check if all required tools are installed
	@echo "${BLUE}Checking dependencies...${NC}"
	@command -v node >/dev/null 2>&1 || { echo "${RED}Node.js is required but not installed.${NC}" >&2; exit 1; }
	@command -v pnpm >/dev/null 2>&1 || { echo "${RED}pnpm is required but not installed.${NC}" >&2; exit 1; }
	@command -v docker >/dev/null 2>&1 || { echo "${RED}Docker is required but not installed.${NC}" >&2; exit 1; }
	@command -v docker-compose >/dev/null 2>&1 || { echo "${RED}docker-compose is required but not installed.${NC}" >&2; exit 1; }
	@echo "${GREEN}All dependencies are installed!${NC}"

status: ## Check status of all services
	@echo "${BLUE}Service Status:${NC}"
	@curl -s http://localhost:3001/health >/dev/null 2>&1 && echo "${GREEN}✓ Web API${NC}" || echo "${RED}✗ Web API${NC}"
	@curl -s http://localhost:3002/health >/dev/null 2>&1 && echo "${GREEN}✓ LLM Router${NC}" || echo "${RED}✗ LLM Router${NC}"
	@curl -s http://localhost:3003/health >/dev/null 2>&1 && echo "${GREEN}✓ RAG Service${NC}" || echo "${RED}✗ RAG Service${NC}"
	@curl -s http://localhost:10095/ >/dev/null 2>&1 && echo "${GREEN}✓ CueMate ASR${NC}" || echo "${RED}✗ CueMate ASR${NC}"
