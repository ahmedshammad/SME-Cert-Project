#!/bin/bash
#
# Master bootstrap script for the SME Certificate Trust Platform Fabric Network
# Runs the complete setup: crypto → artifacts → containers → channel → chaincode → profiles → wallets
#
# Usage:
#   ./bootstrap.sh              # Full setup (default)
#   ./bootstrap.sh quick        # Skip chaincode deployment
#   ./bootstrap.sh teardown     # Tear down everything
#   ./bootstrap.sh restart      # Restart containers only (preserves data)
#   ./bootstrap.sh status       # Show network status
#
# Environment variables (all optional — defaults are production-ready):
#   CHANNEL_NAME          Channel name                (default: certificates)
#   CC_NAME               Chaincode name              (default: certificate_contract)
#   CC_VERSION            Chaincode version           (default: 1.0)
#   CONTAINER_WAIT        Seconds to wait after start (default: 15)
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$NETWORK_DIR/docker"
COMPOSE_FILE="$DOCKER_DIR/docker-compose-fabric.yaml"
PROJECT_ROOT="$(dirname "$(dirname "$NETWORK_DIR")")"

# Configurable parameters (with defaults)
CHANNEL_NAME="${CHANNEL_NAME:-certificates}"
CC_NAME="${CC_NAME:-certificate_contract}"
CC_VERSION="${CC_VERSION:-1.0}"
CONTAINER_WAIT="${CONTAINER_WAIT:-15}"

# Set FABRIC_CFG_PATH so the peer CLI can find core.yaml
export FABRIC_CFG_PATH="${FABRIC_CFG_PATH:-$NETWORK_DIR/config}"
if [ ! -f "$FABRIC_CFG_PATH/core.yaml" ]; then
    if [ -f "$PROJECT_ROOT/config/core.yaml" ]; then
        export FABRIC_CFG_PATH="$PROJECT_ROOT/config"
    fi
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

banner() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}  $1"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

success() { echo -e "  ${GREEN}✓${NC} $1"; }
warn()    { echo -e "  ${YELLOW}!${NC} $1"; }
fail()    { echo -e "  ${RED}✗${NC} $1"; }
info()    { echo -e "  ${CYAN}→${NC} $1"; }

# =========================================================================
# Prerequisite checks
# =========================================================================
checkPrereqs() {
    banner "Checking Prerequisites"

    local MISSING=0

    if command -v docker &> /dev/null; then
        success "Docker: $(docker --version | head -1)"
    else
        fail "Docker not found"
        MISSING=1
    fi

    if docker compose version &> /dev/null 2>&1; then
        success "Docker Compose: $(docker compose version --short 2>/dev/null || echo 'available')"
    else
        fail "Docker Compose not found"
        MISSING=1
    fi

    if command -v cryptogen &> /dev/null; then
        success "cryptogen: $(which cryptogen)"
    else
        fail "cryptogen not found"
        echo ""
        echo "  Install Fabric binaries:"
        echo "    curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh"
        echo "    chmod +x install-fabric.sh"
        echo "    ./install-fabric.sh binary"
        MISSING=1
    fi

    if command -v configtxgen &> /dev/null; then
        success "configtxgen: $(which configtxgen)"
    else
        fail "configtxgen not found"
        MISSING=1
    fi

    if command -v peer &> /dev/null; then
        success "peer: $(which peer)"
    else
        fail "peer CLI not found"
        MISSING=1
    fi

    if command -v osnadmin &> /dev/null; then
        success "osnadmin: $(which osnadmin)"
    else
        fail "osnadmin not found"
        MISSING=1
    fi

    if command -v go &> /dev/null; then
        success "Go: $(go version)"
    else
        warn "Go not installed (needed for chaincode compilation)"
    fi

    # Check Docker daemon is running
    if docker info &> /dev/null; then
        success "Docker daemon: running"
    else
        fail "Docker daemon not running"
        MISSING=1
    fi

    if [ "$MISSING" -eq 1 ]; then
        echo ""
        fail "Missing prerequisites. Please install them before continuing."
        exit 1
    fi

    success "All prerequisites satisfied"
}

# =========================================================================
# Wait for container health with timeout
# =========================================================================
waitForContainers() {
    local MAX_WAIT=${1:-60}
    local ELAPSED=0
    local EXPECTED_MIN=${2:-10}

    info "Waiting for containers to initialize (timeout: ${MAX_WAIT}s)..."

    while [ $ELAPSED -lt $MAX_WAIT ]; do
        local RUNNING=$(docker compose -f "$COMPOSE_FILE" ps --status running -q 2>/dev/null | wc -l)
        if [ "$RUNNING" -ge "$EXPECTED_MIN" ]; then
            success "$RUNNING containers running"
            return 0
        fi
        sleep 5
        ELAPSED=$((ELAPSED + 5))
        info "  $RUNNING containers up after ${ELAPSED}s..."
    done

    local RUNNING=$(docker compose -f "$COMPOSE_FILE" ps --status running -q 2>/dev/null | wc -l)
    if [ "$RUNNING" -ge "$EXPECTED_MIN" ]; then
        success "$RUNNING containers running"
        return 0
    else
        warn "Only $RUNNING containers running after ${MAX_WAIT}s (expected >= $EXPECTED_MIN)"
        docker compose -f "$COMPOSE_FILE" ps
        return 1
    fi
}

# =========================================================================
# Full Bootstrap
# =========================================================================
fullBootstrap() {
    local SKIP_CC=${1:-false}
    local START_TIME=$(date +%s)

    banner "SME Certificate Trust Platform — Fabric Network Bootstrap"

    checkPrereqs

    # Step 1: Generate crypto material
    banner "Step 1/7: Generating Crypto Material"
    if [ -d "$NETWORK_DIR/crypto-config" ] && [ "$(ls -A "$NETWORK_DIR/crypto-config" 2>/dev/null)" ]; then
        warn "Crypto material already exists — regenerating..."
    fi
    bash "$SCRIPT_DIR/generate_crypto.sh"
    if [ ! -d "$NETWORK_DIR/crypto-config/ordererOrganizations" ]; then
        fail "Crypto material generation failed — orderer certs missing"
        exit 1
    fi
    success "Crypto material generated"

    # Step 2: Generate channel artifacts
    banner "Step 2/7: Generating Channel Artifacts"
    bash "$SCRIPT_DIR/generate_artifacts.sh"
    if [ ! -f "$NETWORK_DIR/channel-artifacts/${CHANNEL_NAME}.block" ]; then
        fail "Channel genesis block not found after generation"
        exit 1
    fi
    success "Channel genesis block created"

    # Step 3: Start Docker containers
    banner "Step 3/7: Starting Fabric Docker Containers"
    # Stop any existing containers first (idempotent)
    docker compose -f "$COMPOSE_FILE" down 2>/dev/null || true
    docker compose -f "$COMPOSE_FILE" up -d
    echo ""
    waitForContainers 60 10

    # Step 4: Create channel and join peers
    banner "Step 4/7: Creating Channel and Joining Peers"
    # Wait a bit more for orderers to be fully ready
    sleep "$CONTAINER_WAIT"
    bash "$SCRIPT_DIR/create_channel.sh"
    success "Channel '${CHANNEL_NAME}' created, all peers joined"

    # Step 5: Deploy chaincode
    if [ "$SKIP_CC" = "true" ]; then
        banner "Step 5/7: Chaincode Deployment (SKIPPED)"
        warn "Skipped — run deploy_chaincode.sh manually when ready"
    else
        banner "Step 5/7: Deploying Chaincode"
        bash "$SCRIPT_DIR/deploy_chaincode.sh"
        success "Chaincode '${CC_NAME}' v${CC_VERSION} deployed"
    fi

    # Step 6: Generate connection profiles
    banner "Step 6/7: Generating Connection Profiles"
    bash "$SCRIPT_DIR/generate_connection_profiles.sh"
    if [ ! -f "$NETWORK_DIR/connection-profiles/connection-org1.json" ]; then
        fail "Connection profile not generated"
        exit 1
    fi
    success "Connection profiles generated for all 4 orgs"

    # Step 7: Create admin wallets
    banner "Step 7/7: Creating Admin Wallets"
    bash "$SCRIPT_DIR/enroll_admin.sh"
    if [ ! -f "$PROJECT_ROOT/wallets/org1/admin.id" ]; then
        fail "Wallet identity not created"
        exit 1
    fi
    success "Admin wallet identities created for all 4 orgs"

    # Calculate elapsed time
    local END_TIME=$(date +%s)
    local ELAPSED=$((END_TIME - START_TIME))

    # Final status
    banner "Bootstrap Complete! (${ELAPSED}s)"

    echo -e "  ${GREEN}Network Status:${NC}"
    echo "    Orderers:    3 (Raft consensus)"
    echo "    Peers:       8 (2 per org, CouchDB state)"
    echo "    Orgs:        4 (MinTrade, MSMEDA, Training, Auditors)"
    echo "    Channel:     ${CHANNEL_NAME}"
    if [ "$SKIP_CC" != "true" ]; then
        echo "    Chaincode:   ${CC_NAME} v${CC_VERSION}"
    fi
    echo ""
    echo -e "  ${GREEN}Generated Artifacts:${NC}"
    echo "    Crypto:      blockchain/network/crypto-config/"
    echo "    Channel:     blockchain/network/channel-artifacts/"
    echo "    Profiles:    blockchain/network/connection-profiles/"
    echo "    Wallets:     wallets/"
    echo ""
    echo -e "  ${GREEN}Next Steps:${NC}"
    echo "    1. Rebuild the API container to pick up connection profiles + wallets:"
    echo "       cd infra/compose && docker compose build --no-cache api && docker compose up -d api"
    echo "    2. The API will automatically connect to the Fabric network on startup"
    echo "    3. Certificate issuance will now record on-chain + off-chain"
    echo ""
    echo -e "  ${GREEN}Validation:${NC}"
    echo "    Run:  ./scripts/fabric-health.sh"
    echo ""
}

# =========================================================================
# Teardown
# =========================================================================
teardown() {
    banner "Tearing Down Fabric Network"

    if [ -f "$COMPOSE_FILE" ]; then
        docker compose -f "$COMPOSE_FILE" down -v 2>/dev/null || true
        success "Docker containers and volumes removed"
    fi

    rm -rf "$NETWORK_DIR/crypto-config"
    success "Crypto material removed"

    rm -rf "$NETWORK_DIR/channel-artifacts"
    rm -rf "$NETWORK_DIR/system-genesis-block"
    success "Channel artifacts removed"

    rm -rf "$NETWORK_DIR/connection-profiles"
    success "Connection profiles removed"

    rm -rf "$PROJECT_ROOT/wallets"
    success "Wallets removed"

    # Clean up any leftover chaincode packages
    rm -f "$NETWORK_DIR"/*.tar.gz 2>/dev/null || true
    success "Chaincode packages cleaned"

    # Remove chaincode Docker images
    docker images --format '{{.Repository}}:{{.Tag}}' | grep 'dev-peer' | xargs -r docker rmi -f 2>/dev/null || true
    success "Chaincode Docker images removed"

    docker volume prune -f 2>/dev/null || true
    success "Docker volumes pruned"

    banner "Teardown Complete"
}

# =========================================================================
# Restart (preserves crypto + data volumes)
# =========================================================================
restart() {
    banner "Restarting Fabric Network Containers"

    if [ ! -d "$NETWORK_DIR/crypto-config" ]; then
        fail "No crypto material found — run full bootstrap first"
        exit 1
    fi

    docker compose -f "$COMPOSE_FILE" down 2>/dev/null || true
    docker compose -f "$COMPOSE_FILE" up -d
    echo ""
    waitForContainers 60 10

    banner "Restart Complete"
    echo "  Containers restarted. Channel and chaincode state preserved in volumes."
    echo ""
}

# =========================================================================
# Status
# =========================================================================
showStatus() {
    banner "Fabric Network Status"

    echo -e "  ${CYAN}Containers:${NC}"
    docker compose -f "$COMPOSE_FILE" ps 2>/dev/null || warn "Compose file not found or containers not running"

    echo ""
    echo -e "  ${CYAN}Crypto Material:${NC}"
    if [ -d "$NETWORK_DIR/crypto-config" ]; then
        success "Present at blockchain/network/crypto-config/"
    else
        fail "Not found"
    fi

    echo -e "  ${CYAN}Channel Artifacts:${NC}"
    if [ -f "$NETWORK_DIR/channel-artifacts/${CHANNEL_NAME}.block" ]; then
        success "Genesis block present for channel '${CHANNEL_NAME}'"
    else
        fail "Not found"
    fi

    echo -e "  ${CYAN}Connection Profiles:${NC}"
    for i in 1 2 3 4; do
        if [ -f "$NETWORK_DIR/connection-profiles/connection-org${i}.json" ]; then
            success "Org${i} profile present"
        else
            fail "Org${i} profile missing"
        fi
    done

    echo -e "  ${CYAN}Wallets:${NC}"
    for i in 1 2 3 4; do
        if [ -f "$PROJECT_ROOT/wallets/org${i}/admin.id" ]; then
            success "Org${i} admin wallet present"
        else
            fail "Org${i} admin wallet missing"
        fi
    done

    echo ""
    echo "  For detailed health checks, run: ./scripts/fabric-health.sh"
    echo ""
}

# =========================================================================
# Main
# =========================================================================
case "${1:-}" in
    quick)
        fullBootstrap true
        ;;
    teardown|down|clean)
        teardown
        ;;
    restart)
        restart
        ;;
    status)
        showStatus
        ;;
    ""|up|full)
        fullBootstrap false
        ;;
    *)
        echo "Usage: $0 [full|quick|teardown|restart|status]"
        echo ""
        echo "Commands:"
        echo "  full      Full bootstrap with chaincode deployment (default)"
        echo "  quick     Bootstrap without chaincode (for testing)"
        echo "  teardown  Remove all containers, volumes, crypto, and wallets"
        echo "  restart   Restart containers only (preserves state)"
        echo "  status    Show current network status"
        echo ""
        echo "Environment variables:"
        echo "  CHANNEL_NAME       Channel name (default: certificates)"
        echo "  CC_NAME            Chaincode name (default: certificate_contract)"
        echo "  CC_VERSION         Chaincode version (default: 1.0)"
        echo "  CONTAINER_WAIT     Wait seconds after start (default: 15)"
        exit 1
        ;;
esac
