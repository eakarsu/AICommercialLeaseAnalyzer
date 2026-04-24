#!/bin/bash

# ============================================================
# AI Commercial Lease Analyzer - Start Script
# ============================================================

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PORT=4001
FRONTEND_PORT=3000

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${PURPLE}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║        AI Commercial Lease Analyzer                     ║"
echo "║        Starting Application...                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ---- Clean up used ports ----
echo -e "${YELLOW}[1/6] Cleaning up ports ${BACKEND_PORT} and ${FRONTEND_PORT}...${NC}"

cleanup_port() {
  local port=$1
  local pids=$(lsof -ti :$port 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo -e "${RED}  Killing processes on port $port: $pids${NC}"
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  else
    echo -e "${GREEN}  Port $port is free${NC}"
  fi
}

cleanup_port $BACKEND_PORT
cleanup_port $FRONTEND_PORT

# ---- Check PostgreSQL ----
echo -e "${YELLOW}[2/6] Checking PostgreSQL...${NC}"
if command -v pg_isready &>/dev/null; then
  if pg_isready -q 2>/dev/null; then
    echo -e "${GREEN}  PostgreSQL is running${NC}"
  else
    echo -e "${YELLOW}  Starting PostgreSQL...${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
      brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
    else
      sudo systemctl start postgresql 2>/dev/null || true
    fi
    sleep 2
  fi
else
  echo -e "${YELLOW}  pg_isready not found, assuming PostgreSQL is running${NC}"
fi

# ---- Create database if not exists ----
echo -e "${YELLOW}[3/6] Setting up database...${NC}"
if command -v createdb &>/dev/null; then
  createdb lease_analyzer 2>/dev/null && echo -e "${GREEN}  Database 'lease_analyzer' created${NC}" || echo -e "${GREEN}  Database 'lease_analyzer' already exists${NC}"
else
  echo -e "${YELLOW}  createdb not found, assuming database exists${NC}"
fi

# ---- Install dependencies ----
echo -e "${YELLOW}[4/6] Installing dependencies...${NC}"
cd "$PROJECT_DIR/backend"
if [ ! -d "node_modules" ]; then
  echo -e "${CYAN}  Installing backend dependencies...${NC}"
  npm install --silent 2>&1 | tail -1
else
  echo -e "${GREEN}  Backend dependencies already installed${NC}"
fi

cd "$PROJECT_DIR/frontend"
if [ ! -d "node_modules" ]; then
  echo -e "${CYAN}  Installing frontend dependencies...${NC}"
  npm install --silent 2>&1 | tail -1
else
  echo -e "${GREEN}  Frontend dependencies already installed${NC}"
fi

# ---- Seed database ----
echo -e "${YELLOW}[5/6] Seeding database...${NC}"
cd "$PROJECT_DIR/backend"
node src/seeders/seed.js 2>&1 | while IFS= read -r line; do echo -e "  ${GREEN}$line${NC}"; done

# ---- Start servers with hot reload ----
echo -e "${YELLOW}[6/6] Starting servers with hot reload...${NC}"

# Start backend with nodemon (watches for changes)
cd "$PROJECT_DIR/backend"
echo -e "${CYAN}  Starting backend on port ${BACKEND_PORT} (nodemon)...${NC}"
npx nodemon src/server.js &
BACKEND_PID=$!

# Start frontend (React dev server auto-reloads on changes)
cd "$PROJECT_DIR/frontend"
echo -e "${CYAN}  Starting frontend on port ${FRONTEND_PORT} (React dev server)...${NC}"
BROWSER=none PORT=$FRONTEND_PORT npm start &
FRONTEND_PID=$!

# ---- Trap for cleanup ----
cleanup() {
  echo -e "\n${YELLOW}Shutting down...${NC}"
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  cleanup_port $BACKEND_PORT
  cleanup_port $FRONTEND_PORT
  echo -e "${GREEN}All services stopped.${NC}"
  exit 0
}
trap cleanup SIGINT SIGTERM

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Application is starting!                               ║${NC}"
echo -e "${GREEN}║                                                         ║${NC}"
echo -e "${GREEN}║  Frontend: ${CYAN}http://localhost:${FRONTEND_PORT}${GREEN}                       ║${NC}"
echo -e "${GREEN}║  Backend:  ${CYAN}http://localhost:${BACKEND_PORT}${GREEN}                       ║${NC}"
echo -e "${GREEN}║                                                         ║${NC}"
echo -e "${GREEN}║  Login: admin@leaseanalyzer.com / password123           ║${NC}"
echo -e "${GREEN}║                                                         ║${NC}"
echo -e "${GREEN}║  Press Ctrl+C to stop all services                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Wait for both processes
wait
