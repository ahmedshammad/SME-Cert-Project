#!/bin/bash
#
# SME Certificate Trust Platform - Stop All Services
#
# Usage: ./stop_all.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

GREEN='\033[0;32m'
NC='\033[0m'

echo_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

echo "======================================================================"
echo " Stopping SME Certificate Trust Platform"
echo "======================================================================"
echo ""

# Stop application services
echo_info "Stopping application services..."
cd "$PROJECT_ROOT/infra/compose"
docker compose down || true

# Stop Fabric network
echo_info "Stopping Hyperledger Fabric network..."
cd "$PROJECT_ROOT/blockchain/network"
./scripts/network.sh down || true

echo ""
echo_info "Platform stopped successfully"
echo ""
