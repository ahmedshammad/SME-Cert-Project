#!/bin/bash
# =============================================================================
#  SME Certificate Trust Platform — Restart After VM Reboot
#
#  Usage:
#    bash ~/sme_app/scripts/restart.sh
#
#  When to use:
#    - After the VM has been rebooted / stopped and started again
#    - After running "docker compose down" manually
#    - Fabric ledger and PostgreSQL data are preserved in Docker volumes
#
#  What this does NOT do:
#    - Does NOT regenerate crypto material
#    - Does NOT re-run chaincode deployment
#    - Does NOT touch your .env file
#    - Does NOT run database migrations (schema is already applied)
# =============================================================================

set -euo pipefail

# ── Colors ─────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

ok()     { echo -e "  ${GREEN}✓${NC} $*"; }
warn()   { echo -e "  ${YELLOW}⚠${NC}  $*"; }
fail()   { echo -e "\n  ${RED}✗ FATAL:${NC} $*\n"; exit 1; }
info()   { echo -e "  ${CYAN}→${NC} $*"; }
banner() {
  echo ""
  echo -e "${BLUE}${BOLD}╔══════════════════════════════════════════════════════════════════╗${NC}"
  printf "${BLUE}${BOLD}║${NC}  ${BOLD}%-64s${NC}${BLUE}${BOLD}║${NC}\n" "$*"
  echo -e "${BLUE}${BOLD}╚══════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
}

# ── Paths ──────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
NETWORK_DIR="$APP_DIR/blockchain/network"
COMPOSE_DIR="$APP_DIR/infra/compose"
FABRIC_COMPOSE="$NETWORK_DIR/docker/docker-compose-fabric.yaml"
APP_COMPOSE="$COMPOSE_DIR/compose.yaml"
ENV_FILE="$COMPOSE_DIR/.env"

export PATH="$PATH:/usr/local/bin:/usr/local/go/bin:$HOME/go/bin"

banner "SME Certificate Trust Platform — Restart"

# =============================================================================
# Pre-flight checks
# =============================================================================

# Must not be root
[ "$EUID" -eq 0 ] && fail "Run as the 'opc' user, not root."

# Project files must exist
[ -f "$FABRIC_COMPOSE" ] || fail "Fabric compose not found at $FABRIC_COMPOSE"
[ -f "$APP_COMPOSE" ]    || fail "App compose not found at $APP_COMPOSE"

# .env must exist — restart does not regenerate secrets
[ -f "$ENV_FILE" ] || fail ".env not found at $ENV_FILE\nThis VM has not been set up yet. Run install.sh first."

# Crypto material must exist — if missing the ledger is gone and you need a fresh install
[ -d "$NETWORK_DIR/crypto-config/ordererOrganizations" ] \
  || fail "Crypto material missing at $NETWORK_DIR/crypto-config/\nThe ledger data was lost. Run install.sh for a fresh setup."

# =============================================================================
# Step 1: Ensure Docker daemon is running
# =============================================================================
banner "Step 1/4 — Docker Daemon"

if ! docker info &>/dev/null; then
  info "Starting Docker daemon..."
  sudo systemctl start docker
  sleep 3
fi

docker info &>/dev/null || fail "Docker daemon failed to start. Check: sudo systemctl status docker"
ok "Docker daemon is running"

# =============================================================================
# Step 2: Start Hyperledger Fabric Network
# =============================================================================
banner "Step 2/4 — Fabric Network (20 containers)"

info "Starting Fabric containers (orderers, peers, CouchDBs)..."
docker compose -f "$FABRIC_COMPOSE" up -d

info "Waiting for Fabric containers to initialize (up to 90s)..."
ELAPSED=0
while [ "$ELAPSED" -lt 90 ]; do
  RUNNING=$(docker compose -f "$FABRIC_COMPOSE" ps --status running -q 2>/dev/null | wc -l || echo 0)
  [ "$RUNNING" -ge 10 ] && { ok "$RUNNING Fabric containers running"; break; }
  sleep 5; ELAPSED=$((ELAPSED + 5))
  [ $((ELAPSED % 20)) -eq 0 ] && info "  $RUNNING containers up after ${ELAPSED}s..."
done

if [ "$RUNNING" -lt 10 ]; then
  warn "Only $RUNNING containers running (expected ≥10)"
  warn "Check: docker compose -f $FABRIC_COMPOSE ps"
fi

# Give Raft time to elect a leader before app stack tries to connect
info "Waiting 15s for Raft leader election..."
sleep 15

# Quick orderer health check
for PORT in 9443 9444 9445; do
  if curl -sfk --max-time 3 "https://localhost:${PORT}/healthz" &>/dev/null; then
    ok "Orderer :${PORT} healthy"
  else
    warn "Orderer :${PORT} not yet responding (may still be starting)"
  fi
done

# =============================================================================
# Step 3: Start Application Stack
# =============================================================================
banner "Step 3/4 — Application Stack (8 services)"

info "Starting app services (postgres, ipfs, api, web, nginx, prometheus, grafana, otel)..."
cd "$COMPOSE_DIR"
docker compose up -d
ok "App stack containers started"

info "Waiting for PostgreSQL to be ready..."
ELAPSED=0
until docker compose exec -T postgres pg_isready -U smeuser -d smecertdb &>/dev/null; do
  sleep 3; ELAPSED=$((ELAPSED + 3))
  [ "$ELAPSED" -ge 60 ] && {
    warn "PostgreSQL not ready after 60s — check: docker logs sme-cert-postgres"
    break
  }
done
docker compose exec -T postgres pg_isready -U smeuser -d smecertdb &>/dev/null && ok "PostgreSQL ready"

info "Waiting for NestJS API to become healthy (up to 120s)..."
ELAPSED=0; API_UP=false
while [ "$ELAPSED" -lt 120 ]; do
  curl -sf http://localhost:3000/api/health &>/dev/null && { API_UP=true; break; }
  sleep 5; ELAPSED=$((ELAPSED + 5))
  [ $((ELAPSED % 30)) -eq 0 ] && info "  API not ready yet... ${ELAPSED}s elapsed"
done
$API_UP && ok "NestJS API is healthy" \
         || warn "API did not respond in 120s — check: docker logs sme-cert-api --tail 50"

cd "$APP_DIR"

# =============================================================================
# Step 4: Health Summary
# =============================================================================
banner "Step 4/4 — Health Check"

VM_IP=$(curl -s --max-time 5 http://checkip.amazonaws.com 2>/dev/null \
        || hostname -I | awk '{print $1}')

check_service() {
  local NAME="$1" URL="$2"
  if curl -sf --max-time 5 "$URL" &>/dev/null; then
    echo -e "    ${GREEN}✓${NC} $NAME"
  else
    echo -e "    ${YELLOW}⚠${NC}  $NAME  (starting...)"
  fi
}

echo -e "  ${CYAN}Service Status:${NC}"
check_service "Nginx           :80"   "http://localhost:80/"
check_service "NestJS API      :3000" "http://localhost:3000/api/health"
check_service "Prometheus      :9090" "http://localhost:9090/-/healthy"
check_service "Grafana         :3001" "http://localhost:3001/api/health"

echo ""
echo -e "  ${CYAN}Fabric Containers:${NC}"
FABRIC_UP=$(docker compose -f "$FABRIC_COMPOSE" ps --status running -q 2>/dev/null | wc -l || echo 0)
APP_UP=$(docker compose -f "$APP_COMPOSE" ps --status running -q 2>/dev/null | wc -l || echo 0)
echo -e "    ${GREEN}✓${NC} Fabric: $FABRIC_UP containers running"
echo -e "    ${GREEN}✓${NC} App stack: $APP_UP containers running"

echo ""
echo -e "  ${GREEN}${BOLD}Platform is up:${NC}  http://${VM_IP}"
echo ""
echo -e "  ${CYAN}Useful commands:${NC}"
echo "    All app logs:     docker compose -f $APP_COMPOSE logs -f"
echo "    API logs:         docker logs sme-cert-api -f"
echo "    Nginx logs:       docker logs sme-cert-nginx -f"
echo "    Fabric logs:      docker logs peer0.org1.example.com -f"
echo "    Container status: docker ps --format 'table {{.Names}}\t{{.Status}}'"
echo "    Restart API only: docker compose -f $APP_COMPOSE restart api"
echo ""
