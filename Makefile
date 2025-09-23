.PHONY: help install dev build clean docker-up docker-down docker-build test lint format docker-logs logs-web-api logs-llm logs-rag logs-asr logs-web logs-all status setup-complete restart rebuild dev-desktop dev-services build-desktop

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
RED := \033[0;31m
YELLOW := \033[0;33m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "${BLUE}CueMate - Available Commands${NC}"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "${GREEN}%-20s${NC} %s\n", $$1, $$2}'

install: ## Install all dependencies
	@echo "${BLUE}Installing dependencies...${NC}"
	pnpm install
	@echo "${GREEN}Dependencies installed successfully!${NC}"

dev: ## Start web frontend in development mode
	@echo "${BLUE}Starting web frontend...${NC}"
	cd apps/web && pnpm dev

dev-desktop: ## Start desktop app in development mode
	@echo "${BLUE}Starting desktop app...${NC}"
	cd apps/desktop-client && pnpm electron:dev

dev-services: ## Start all backend services with Docker
	@echo "${BLUE}Starting all backend services with Docker...${NC}"
	@make docker-up
	@echo "${GREEN}All services started!${NC}"

build: ## Build all applications
	@echo "${BLUE}Building all applications...${NC}"
	pnpm build
	@echo "${GREEN}Build completed!${NC}"

build-desktop: ## Build desktop application for production
	@echo "${BLUE}Building desktop app...${NC}"
	cd apps/desktop-client && pnpm build && pnpm dist
	@echo "${GREEN}Desktop app built! Check apps/desktop-client/release/${NC}"

build-docker: ## Build and start all Docker services
	@echo "${BLUE}Building Docker images and starting services...${NC}"
	cd infra/docker && env VERSION=0.1.0 docker compose -f docker-compose.yml build && env VERSION=0.1.0 docker compose -f docker-compose.yml up -d
	@echo "${GREEN}Docker services built and started!${NC}"

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


docker-up: ## Start all Docker services
	@echo "${BLUE}Starting all Docker services...${NC}"
	cd infra/docker && env VERSION=0.1.0 docker compose -f docker-compose.yml up -d
	@echo "${GREEN}All services started!${NC}"
	@echo "${YELLOW}Service URLs:${NC}"
	@echo "Web API: http://localhost:3001"
	@echo "LLM Router: http://localhost:3002"
	@echo "RAG Service: http://localhost:3003"
	@echo "ChromaDB: http://localhost:8000"
	@echo "ASR Service: ws://localhost:10095"
	@echo "Web Frontend: http://localhost:80"

docker-down: ## Stop all Docker services
	@echo "${BLUE}Stopping Docker services...${NC}"
	cd infra/docker && env VERSION=0.1.0 docker compose -f docker-compose.yml down
	@echo "${GREEN}Services stopped!${NC}"

docker-logs: ## Show Docker logs for all services
	@echo "${BLUE}Available services for logs:${NC}"
	@echo "  make logs-web-api     - Web API service logs"
	@echo "  make logs-llm         - LLM Router service logs"
	@echo "  make logs-rag         - RAG Service logs"
	@echo "  make logs-asr         - ASR Service logs"
	@echo "  make logs-web         - Web Frontend logs"
	@echo "  make logs-all         - All services logs"

logs-web-api: ## Show Web API logs
	cd infra/docker && env VERSION=0.1.0 docker compose -f docker-compose.yml logs -f web-api

logs-llm: ## Show LLM Router logs
	cd infra/docker && env VERSION=0.1.0 docker compose -f docker-compose.yml logs -f llm-router

logs-rag: ## Show RAG Service logs
	cd infra/docker && env VERSION=0.1.0 docker compose -f docker-compose.yml logs -f rag-service

logs-asr: ## Show ASR Service logs
	cd infra/docker && env VERSION=0.1.0 docker compose -f docker-compose.yml logs -f cuemate-asr

logs-web: ## Show Web Frontend logs
	cd infra/docker && env VERSION=0.1.0 docker compose -f docker-compose.yml logs -f web

logs-all: ## Show all services logs
	cd infra/docker && env VERSION=0.1.0 docker compose -f docker-compose.yml logs -f

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
	@curl -s http://localhost:3001/health >/dev/null 2>&1 && echo "${GREEN}✓ Web API (3001)${NC}" || echo "${RED}✗ Web API (3001)${NC}"
	@curl -s http://localhost:3002/health >/dev/null 2>&1 && echo "${GREEN}✓ LLM Router (3002)${NC}" || echo "${RED}✗ LLM Router (3002)${NC}"
	@curl -s http://localhost:3003/health >/dev/null 2>&1 && echo "${GREEN}✓ RAG Service (3003)${NC}" || echo "${RED}✗ RAG Service (3003)${NC}"
	@curl -s http://localhost:8000/api/v1/heartbeat >/dev/null 2>&1 && echo "${GREEN}✓ ChromaDB (8000)${NC}" || echo "${RED}✗ ChromaDB (8000)${NC}"
	@curl -s http://localhost:10095/ >/dev/null 2>&1 && echo "${GREEN}✓ ASR Service (10095)${NC}" || echo "${RED}✗ ASR Service (10095)${NC}"
	@curl -s http://localhost:80/ >/dev/null 2>&1 && echo "${GREEN}✓ Web Frontend (80)${NC}" || echo "${RED}✗ Web Frontend (80)${NC}"

setup-complete: ## Complete setup including Docker services
	@echo "${BLUE}Setting up CueMate complete environment...${NC}"
	@echo "1. Installing dependencies..."
	@make install
	@echo "2. Building and starting Docker services..."
	@make build-docker
	@echo "3. Checking service status..."
	@sleep 10
	@make status
	@echo "${GREEN}Complete setup finished!${NC}"
	@echo "${YELLOW}Next steps:${NC}"
	@echo "  - Desktop app: make dev-desktop"
	@echo "  - Web frontend: make dev"
	@echo "  - Check logs: make docker-logs"

restart: ## Restart all Docker services
	@echo "${BLUE}Restarting all services...${NC}"
	@make docker-down
	@sleep 2
	@make docker-up
	@echo "${GREEN}All services restarted!${NC}"

rebuild: ## Rebuild and restart all Docker services
	@echo "${BLUE}Rebuilding and restarting all services...${NC}"
	@make docker-down
	@make build-docker
	@echo "${GREEN}All services rebuilt and restarted!${NC}"
