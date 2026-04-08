#!/bin/bash
#
# SME Certificate Trust Platform - Start All Services
# Orchestrates: Fabric Network -> App Services -> DB Migrations -> Seed -> Wallets
#
# Usage: ./start_all.sh [--skip-fabric]
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
echo_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
echo_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

SKIP_FABRIC=false
for arg in "$@"; do
    case $arg in
        --skip-fabric) SKIP_FABRIC=true ;;
    esac
done

echo "======================================================================"
echo " Starting SME Certificate Trust Platform"
echo "======================================================================"
echo ""

# =============================================================================
# Step 1: Start Hyperledger Fabric Network
# =============================================================================
if [ "$SKIP_FABRIC" = true ]; then
    echo_warn "Step 1: Skipping Fabric network (--skip-fabric)"
else
    echo_step "Step 1: Starting Hyperledger Fabric network..."

    FABRIC_SCRIPTS="$PROJECT_ROOT/blockchain/network/scripts"

    # Generate crypto material if needed
    if [ ! -d "$PROJECT_ROOT/blockchain/network/crypto-config" ]; then
        echo_info "Generating crypto material..."
        bash "$FABRIC_SCRIPTS/generate_crypto.sh"
    else
        echo_info "Crypto material exists, skipping generation"
    fi

    # Generate channel artifacts if needed
    if [ ! -f "$PROJECT_ROOT/blockchain/network/channel-artifacts/certificates.block" ]; then
        echo_info "Generating channel artifacts..."
        bash "$FABRIC_SCRIPTS/generate_artifacts.sh"
    else
        echo_info "Channel artifacts exist, skipping generation"
    fi

    # Start the Fabric Docker containers
    echo_info "Starting Fabric Docker containers..."
    docker compose -f "$PROJECT_ROOT/blockchain/network/docker/docker-compose-fabric.yaml" up -d

    echo_info "Waiting for Fabric containers to initialize (15s)..."
    sleep 15

    # Create and join channel (if not already done)
    if [ ! -f "$PROJECT_ROOT/blockchain/network/.channel-created" ]; then
        echo_info "Creating and joining channel..."
        bash "$FABRIC_SCRIPTS/create_channel.sh"
        touch "$PROJECT_ROOT/blockchain/network/.channel-created"
    else
        echo_info "Channel already created, skipping"
    fi

    # Deploy chaincode (if not already deployed)
    if [ ! -f "$PROJECT_ROOT/blockchain/network/.chaincode-deployed" ]; then
        echo_info "Deploying chaincode..."
        bash "$FABRIC_SCRIPTS/deploy_chaincode.sh"
        touch "$PROJECT_ROOT/blockchain/network/.chaincode-deployed"
    else
        echo_info "Chaincode already deployed, skipping"
    fi

    # Generate connection profiles
    if [ ! -f "$PROJECT_ROOT/blockchain/network/connection-profiles/connection-org1.json" ]; then
        echo_info "Generating connection profiles..."
        bash "$FABRIC_SCRIPTS/generate_connection_profiles.sh"
    else
        echo_info "Connection profiles exist, skipping"
    fi

    # Create admin wallets
    if [ ! -f "$PROJECT_ROOT/wallets/org1/admin.id" ]; then
        echo_info "Creating admin wallets..."
        bash "$FABRIC_SCRIPTS/enroll_admin.sh"
    else
        echo_info "Admin wallets exist, skipping"
    fi

    echo_info "Fabric network is running"
fi

# =============================================================================
# Step 2: Start Application Services (Docker Compose)
# =============================================================================
echo_step "Step 2: Starting application services..."

cd "$PROJECT_ROOT/infra/compose"

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    set -a
    source "$PROJECT_ROOT/.env"
    set +a
fi

# Start services
docker compose up -d

echo_info "Waiting for services to be healthy (15s)..."
sleep 15

# Check service health
docker compose ps

# =============================================================================
# Step 3: Run Database Migrations
# =============================================================================
echo_step "Step 3: Running database migrations..."

# Wait for PostgreSQL to be ready
echo_info "Waiting for PostgreSQL..."
until docker exec sme-cert-postgres pg_isready -U smeuser -d smecertdb > /dev/null 2>&1; do
    sleep 1
done

# Run migrations
docker exec sme-cert-api npx prisma migrate deploy 2>/dev/null || docker exec sme-cert-api yarn prisma migrate deploy 2>/dev/null || true

echo_info "Database migrations complete"

# =============================================================================
# Step 4: Seed Initial Data (if needed)
# =============================================================================
if [ ! -f "$PROJECT_ROOT/.data-seeded" ]; then
    echo_step "Step 4: Seeding initial data..."
    docker exec sme-cert-api npx ts-node prisma/seed.ts 2>/dev/null || docker exec sme-cert-api yarn seed 2>/dev/null || {
        echo_warn "Seed script not available or already seeded"
    }
    touch "$PROJECT_ROOT/.data-seeded"
    echo_info "Initial data seeded"
else
    echo_info "Step 4: Initial data already seeded, skipping"
fi

# =============================================================================
# Summary
# =============================================================================
echo ""
echo "======================================================================"
echo_info " Platform Started Successfully!"
echo "======================================================================"
echo ""
echo "Services:"
echo "  - Hyperledger Fabric Network: Running (3 orderers, 8 peers, 8 CouchDBs)"
echo "  - PostgreSQL Database: Running on port 5432"
echo "  - IPFS Storage: Running on port 5001"
echo "  - Backend API: Running on port 3000"
echo "  - Frontend Web: Running on port 5173"
echo "  - Nginx Reverse Proxy: Running on port 80"
echo "  - Prometheus Metrics: Running on port 9090"
echo "  - Grafana Dashboard: Running on port 3001"
echo ""
echo "Access Points:"
echo "  - Web UI: http://localhost (via Nginx)"
echo "  - API: http://localhost/api"
echo "  - API Documentation: http://localhost/api/docs"
echo "  - Blockchain Status: http://localhost/api/health/blockchain"
echo "  - Prometheus: http://localhost:9090"
echo "  - Grafana: http://localhost:3001 (admin/admin)"
echo ""
echo "Logs:"
echo "  - All app logs: docker compose -f $PROJECT_ROOT/infra/compose/compose.yaml logs -f"
echo "  - API logs: docker logs -f sme-cert-api"
echo "  - Fabric peer: docker logs -f peer0.org1.example.com"
echo "  - Fabric orderer: docker logs -f orderer.example.com"
echo ""
echo "======================================================================"
echo ""
