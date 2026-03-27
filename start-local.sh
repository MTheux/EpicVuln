#!/bin/bash
# ============================================
# EpicVuln - Start without Docker
# Requires: Node.js 20+, PostgreSQL
# ============================================

echo "========================================="
echo "  EpicVuln - Local Setup (sem Docker)"
echo "========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check Node
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js nao encontrado. Instale Node.js 20+${NC}"
    exit 1
fi
echo -e "${GREEN}Node.js:${NC} $(node -v)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm nao encontrado.${NC}"
    exit 1
fi

# Database config - adjust these for your environment
DB_USER="${DB_USER:-postgres}"
DB_PASS="${DB_PASS:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-epicvuln}"

DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"

echo ""
echo -e "${YELLOW}Database:${NC} ${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo -e "${YELLOW}User:${NC} ${DB_USER}"
echo ""

# Try to create database if psql is available
if command -v psql &> /dev/null; then
    echo -e "${GREEN}Criando database ${DB_NAME}...${NC}"
    PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -tc "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'" | grep -q 1 || \
    PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE ${DB_NAME}" 2>/dev/null
fi

# ---- Backend Setup ----
echo ""
echo -e "${GREEN}[1/5] Instalando dependencias do backend...${NC}"
cd backend
npm install

# Create .env for local
cat > .env << ENVEOF
DATABASE_URL="${DATABASE_URL}"
JWT_SECRET="epicvuln-secret-key-local"
JWT_EXPIRES_IN="8h"
JWT_REFRESH_SECRET="epicvuln-refresh-secret-local"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=9001
NODE_ENV=development
FRONTEND_URL=http://localhost:9000
UPLOAD_MAX_SIZE_MB=10
UPLOAD_DIR=./uploads
ENVEOF

echo -e "${GREEN}[2/5] Configurando banco de dados...${NC}"
npx prisma generate
npx prisma db push --accept-data-loss
npx prisma db seed 2>/dev/null

echo -e "${GREEN}[3/5] Iniciando backend na porta 9001...${NC}"
npx tsx src/index.ts &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

cd ..

# Wait for backend to start
sleep 3

# ---- Frontend Setup ----
echo -e "${GREEN}[4/5] Instalando dependencias do frontend...${NC}"
npm install

echo -e "${GREEN}[5/5] Iniciando frontend na porta 9000...${NC}"
NEXT_PUBLIC_API_URL=http://localhost:9001 npx next dev -p 9000 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

echo ""
echo "========================================="
echo -e "${GREEN}  EpicVuln rodando!${NC}"
echo "========================================="
echo -e "  Frontend: ${GREEN}http://localhost:9000${NC}"
echo -e "  Backend:  ${GREEN}http://localhost:9001${NC}"
echo -e "  Login:    ${GREEN}admin@unisys.com / admin@123${NC}"
echo ""
echo "  Para parar: kill $BACKEND_PID $FRONTEND_PID"
echo "========================================="

# Wait for both
wait
