#!/bin/bash
# =============================================================================
#  SME Certificate Trust Platform — Clean Install Script
#  Oracle Linux 8/9  |  Run as the 'opc' user  |  Single VM
#
#  Usage:
#    bash ~/sme_app/scripts/install.sh
#
#  What this does (9 phases):
#    1  System prerequisites  (Docker, Go 1.23, Node 20, Yarn 4)
#    2  Hyperledger Fabric 2.5.9 binaries  (direct GitHub tarball)
#    3  Fabric Docker images pull
#    4  Fabric network bootstrap  (crypto → artifacts → containers → channel → chaincode)
#    5  Ledger initialization  (InitLedger with 3-org endorsement)
#    6  Connection profiles + admin wallets
#    7  App stack  (.env → build → docker compose up)
#    8  Database schema migration (Prisma)
#    9  Firewall rules + final health check
# =============================================================================

set -euo pipefail

# ── Colors ─────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

ok()     { echo -e "  ${GREEN}✓${NC} $*"; }
warn()   { echo -e "  ${YELLOW}⚠${NC}  $*"; }
fail()   { echo -e "\n  ${RED}✗ FATAL:${NC} $*\n"; exit 1; }
info()   { echo -e "  ${CYAN}→${NC} $*"; }
ask()    { echo -e "  ${YELLOW}?${NC}  $*"; }
banner() {
  local MSG="$*"
  echo ""
  echo -e "${BLUE}${BOLD}╔══════════════════════════════════════════════════════════════════╗${NC}"
  printf "${BLUE}${BOLD}║${NC}  ${BOLD}%-64s${NC}${BLUE}${BOLD}║${NC}\n" "$MSG"
  echo -e "${BLUE}${BOLD}╚══════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
}

# ── Config ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"          # project root = parent of scripts/
NETWORK_DIR="$APP_DIR/blockchain/network"
COMPOSE_DIR="$APP_DIR/infra/compose"
FABRIC_COMPOSE="$NETWORK_DIR/docker/docker-compose-fabric.yaml"
APP_COMPOSE="$COMPOSE_DIR/compose.yaml"
ENV_FILE="$COMPOSE_DIR/.env"
SCRIPTS="$NETWORK_DIR/scripts"

FABRIC_VERSION="2.5.9"
GO_VERSION="1.23.5"
NODE_VERSION="20"

export PATH="$PATH:/usr/local/bin:/usr/local/go/bin:$HOME/go/bin"

# ── Ensure we are NOT running as root ──────────────────────────────────────────
if [ "$EUID" -eq 0 ]; then
  fail "Do not run this script as root. Run as the 'opc' user — sudo is invoked where needed."
fi

# ── Verify project code is here ────────────────────────────────────────────────
[ -f "$FABRIC_COMPOSE" ] || fail "Project files not found at $APP_DIR. Upload them first, then re-run."

# ── Make all shell scripts executable ─────────────────────────────────────────
find "$APP_DIR" -name "*.sh" -exec chmod +x {} \;

# =============================================================================
banner "Phase 1/9 — System Prerequisites"
# =============================================================================

info "Updating system packages..."
sudo dnf update -y -q

info "Installing core tools..."
sudo dnf install -y -q \
  git curl wget tar unzip \
  gcc make openssl \
  jq python3 dos2unix \
  ca-certificates
ok "Core tools ready"

# ── Docker ─────────────────────────────────────────────────────────────────────
if docker compose version &>/dev/null 2>&1; then
  ok "Docker already installed: $(docker --version | cut -d' ' -f3 | tr -d ',')"
else
  info "Installing Docker CE..."
  sudo dnf config-manager --add-repo \
    https://download.docker.com/linux/centos/docker-ce.repo -q
  sudo dnf install -y -q docker-ce docker-ce-cli containerd.io docker-compose-plugin
  sudo systemctl enable --now docker
fi

sudo systemctl start docker 2>/dev/null || true

# ── Ensure current user is in the docker group (works whether Docker was just
#    installed or was already present from a previous run) ──────────────────────
if ! groups | grep -qw docker; then
  info "Adding $USER to docker group..."
  sudo usermod -aG docker "$USER"
  info "Re-starting script with docker group active (no re-login needed)..."
  exec sg docker "bash $(readlink -f "$0") $*"
fi

docker compose version --short &>/dev/null || fail "Docker Compose plugin missing."
ok "Docker Compose: $(docker compose version --short)"

# ── Go ─────────────────────────────────────────────────────────────────────────
CURRENT_GO=$(go version 2>/dev/null | grep -oP '\d+\.\d+\.\d+' | head -1 || echo "0")
if [ "$CURRENT_GO" = "$GO_VERSION" ]; then
  ok "Go $GO_VERSION already installed"
else
  info "Installing Go $GO_VERSION..."
  wget -q "https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz" -P /tmp/
  sudo rm -rf /usr/local/go
  sudo tar -C /usr/local -xzf "/tmp/go${GO_VERSION}.linux-amd64.tar.gz"
  rm -f "/tmp/go${GO_VERSION}.linux-amd64.tar.gz"
  grep -q '/usr/local/go/bin' "$HOME/.bashrc" || {
    echo 'export PATH=$PATH:/usr/local/go/bin' >> "$HOME/.bashrc"
    echo 'export GOPATH=$HOME/go'              >> "$HOME/.bashrc"
    echo 'export PATH=$PATH:$GOPATH/bin'       >> "$HOME/.bashrc"
  }
  export PATH="$PATH:/usr/local/go/bin"
  ok "Go installed: $(go version)"
fi

# ── Node.js 20 + Yarn 4 ────────────────────────────────────────────────────────
CURRENT_NODE=$(node --version 2>/dev/null | grep -oP 'v\d+' || echo "none")
if [ "$CURRENT_NODE" = "v${NODE_VERSION}" ]; then
  ok "Node.js $CURRENT_NODE already installed"
else
  info "Installing Node.js $NODE_VERSION..."
  curl -fsSL "https://rpm.nodesource.com/setup_${NODE_VERSION}.x" | sudo bash -
  sudo dnf install -y nodejs
  ok "Node.js installed: $(node --version)"
fi

CURRENT_YARN=$(yarn --version 2>/dev/null || echo "none")
if [[ "$CURRENT_YARN" == 4* ]]; then
  ok "Yarn $CURRENT_YARN already installed"
else
  info "Enabling Yarn 4 via corepack..."
  sudo corepack enable
  sudo corepack prepare yarn@4.0.2 --activate
  ok "Yarn installed: $(yarn --version)"
fi

# =============================================================================
banner "Phase 2/9 — Hyperledger Fabric $FABRIC_VERSION Binaries"
# =============================================================================

NEED_FABRIC=0
for tool in cryptogen configtxgen peer osnadmin; do
  command -v "$tool" &>/dev/null || { NEED_FABRIC=1; break; }
done

if [ "$NEED_FABRIC" -eq 0 ]; then
  ok "Fabric binaries already installed ($(cryptogen version 2>&1 | grep -oP 'v\d+\.\d+\.\d+' | head -1))"
else
  info "Downloading Fabric $FABRIC_VERSION binaries (direct GitHub release)..."
  FABRIC_URL="https://github.com/hyperledger/fabric/releases/download/v${FABRIC_VERSION}"
  TARBALL="hyperledger-fabric-linux-amd64-${FABRIC_VERSION}.tar.gz"

  wget -q "${FABRIC_URL}/${TARBALL}" -O "/tmp/${TARBALL}" \
    || fail "Download failed. Check internet connectivity."

  info "Extracting to /tmp/fabric-extract/..."
  mkdir -p /tmp/fabric-extract
  tar -xzf "/tmp/${TARBALL}" -C /tmp/fabric-extract
  sudo cp /tmp/fabric-extract/bin/* /usr/local/bin/
  sudo chmod +x /usr/local/bin/{cryptogen,configtxgen,peer,osnadmin,orderer,discover,ledgerutil}
  rm -rf "/tmp/${TARBALL}" /tmp/fabric-extract
  ok "Fabric binaries installed to /usr/local/bin"

  for tool in cryptogen configtxgen peer osnadmin; do
    command -v "$tool" &>/dev/null || fail "$tool not found after install"
    ok "$tool → $(cryptogen version 2>&1 | grep -oP 'v\d+\.\d+\.\d+' | head -1)"
  done
fi

# =============================================================================
banner "Phase 3/9 — Pull Fabric Docker Images"
# =============================================================================

IMAGES=(
  "hyperledger/fabric-peer:2.5"
  "hyperledger/fabric-orderer:2.5"
  "hyperledger/fabric-tools:2.5"
  "hyperledger/fabric-ccenv:2.5"
  "hyperledger/fabric-baseos:2.5"
  "couchdb:3.3"
)

for IMAGE in "${IMAGES[@]}"; do
  if docker image inspect "$IMAGE" &>/dev/null; then
    ok "$IMAGE (cached)"
  else
    info "Pulling $IMAGE ..."
    docker pull "$IMAGE" -q
    ok "$IMAGE pulled"
  fi
done

# =============================================================================
banner "Phase 4/9 — Fabric Network Bootstrap"
# =============================================================================

export FABRIC_CFG_PATH="$NETWORK_DIR/config"

# Strip Windows line endings from YAML files (common when code is synced from Windows)
info "Sanitizing YAML files (strip Windows line endings + BOM)..."
for f in "$FABRIC_COMPOSE" "$APP_COMPOSE" \
          "$NETWORK_DIR/config/configtx.yaml" \
          "$NETWORK_DIR/config/crypto-config.yaml"; do
  [ -f "$f" ] && LC_ALL=C tr -cd '\11\12\15\40-\176' < "$f" > /tmp/_clean && mv /tmp/_clean "$f"
done
ok "YAML files sanitized"

# ── 4a: Crypto material ─────────────────────────────────────────────────────
if [ -d "$NETWORK_DIR/crypto-config/ordererOrganizations" ]; then
  ok "Crypto material already exists — skipping"
else
  info "Generating crypto material (cryptogen)..."
  bash "$SCRIPTS/generate_crypto.sh"
  [ -d "$NETWORK_DIR/crypto-config/ordererOrganizations" ] \
    || fail "Crypto generation failed — orderer certs missing"
  ok "Crypto material generated"
fi

# ── 4b: Channel genesis block ───────────────────────────────────────────────
if [ -f "$NETWORK_DIR/channel-artifacts/certificates.block" ]; then
  ok "Genesis block already exists — skipping"
else
  info "Generating channel genesis block (configtxgen)..."
  bash "$SCRIPTS/generate_artifacts.sh"
  [ -f "$NETWORK_DIR/channel-artifacts/certificates.block" ] \
    || fail "Genesis block not created"
  ok "Genesis block: $NETWORK_DIR/channel-artifacts/certificates.block"
fi

# ── 4c: Start Fabric containers ─────────────────────────────────────────────
info "Starting Fabric Docker containers (20 containers)..."
docker compose -f "$FABRIC_COMPOSE" down 2>/dev/null || true
docker compose -f "$FABRIC_COMPOSE" up -d

info "Waiting for containers to initialize (up to 90s)..."
ELAPSED=0
while [ "$ELAPSED" -lt 90 ]; do
  RUNNING=$(docker compose -f "$FABRIC_COMPOSE" ps --status running -q 2>/dev/null | wc -l || echo 0)
  [ "$RUNNING" -ge 10 ] && { ok "$RUNNING Fabric containers running"; break; }
  sleep 5; ELAPSED=$((ELAPSED + 5))
  [ $((ELAPSED % 15)) -eq 0 ] && info "  $RUNNING containers up after ${ELAPSED}s..."
done
[ "$RUNNING" -lt 10 ] && warn "Only $RUNNING containers running (expected ≥10). Check: docker compose -f $FABRIC_COMPOSE ps"

# ── 4d: Create channel + join all peers ─────────────────────────────────────
info "Waiting 25s for Raft leader election..."
sleep 25
info "Creating channel 'certificates' and joining all 8 peers..."
bash "$SCRIPTS/create_channel.sh"
ok "Channel created — all peers joined"

# ── 4e: Deploy chaincode ─────────────────────────────────────────────────────
info "Deploying chaincode certificate_contract v1.0..."
export GOPATH="$HOME/go"
export PATH="$PATH:$GOPATH/bin"
cd "$NETWORK_DIR"
CC_VERSION=1.0 CC_SEQUENCE=1 bash "$SCRIPTS/deploy_chaincode_ccaas.sh"
ok "Chaincode committed on all 4 orgs"
cd "$APP_DIR"

# =============================================================================
banner "Phase 5/9 — Initialize Ledger"
# =============================================================================

export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID=Org1MSP
export CORE_PEER_ADDRESS=localhost:7051
export CORE_PEER_MSPCONFIGPATH="$NETWORK_DIR/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp"
export CORE_PEER_TLS_ROOTCERT_FILE="$NETWORK_DIR/crypto-config/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
ORDERER_CA="$NETWORK_DIR/crypto-config/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"
TLS1="$NETWORK_DIR/crypto-config/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
TLS2="$NETWORK_DIR/crypto-config/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt"
TLS3="$NETWORK_DIR/crypto-config/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/ca.crt"

info "Invoking InitLedger (3-org endorsement required)..."
peer chaincode invoke \
  -o localhost:7050 --tls --cafile "$ORDERER_CA" \
  -C certificates -n certificate_contract \
  --peerAddresses localhost:7051  --tlsRootCertFiles "$TLS1" \
  --peerAddresses localhost:9051  --tlsRootCertFiles "$TLS2" \
  --peerAddresses localhost:11051 --tlsRootCertFiles "$TLS3" \
  -c '{"function":"InitLedger","Args":[]}'

sleep 6
VERIFY=$(peer chaincode query -C certificates -n certificate_contract \
  -c '{"function":"GetIssuer","Args":["org1-ministry"]}' 2>&1 || echo "")
echo "$VERIFY" | grep -q "org1-ministry" \
  && ok "Ledger initialized — org1-ministry confirmed on-chain" \
  || warn "Ledger verify returned unexpected data — may be a timing issue, run verify manually later"

# =============================================================================
banner "Phase 6/9 — Connection Profiles & Admin Wallets"
# =============================================================================

info "Generating connection profiles for all 4 orgs..."
bash "$SCRIPTS/generate_connection_profiles.sh"
[ -f "$NETWORK_DIR/connection-profiles/connection-org1.json" ] \
  || fail "Connection profile not created"
ok "Connection profiles: $NETWORK_DIR/connection-profiles/"

info "Creating admin wallet identities..."
bash "$SCRIPTS/enroll_admin.sh"
[ -f "$APP_DIR/wallets/org1/admin.id" ] \
  || fail "Admin wallet not created"
ok "Admin wallets: $APP_DIR/wallets/"

# =============================================================================
banner "Phase 7/9 — Application Stack"
# =============================================================================

# ── Detect VM public IP ───────────────────────────────────────────────────────
VM_IP=$(curl -s --max-time 5 http://checkip.amazonaws.com 2>/dev/null \
        || curl -s --max-time 5 http://ipecho.net/plain 2>/dev/null \
        || hostname -I | awk '{print $1}')
ok "Detected VM IP: $VM_IP"

# ── Generate .env if it doesn't already exist ─────────────────────────────────
if [ -f "$ENV_FILE" ]; then
  ok ".env already exists at $ENV_FILE — using existing file"
  warn "If you need fresh secrets, delete $ENV_FILE and re-run Phase 7"
  # Remove any SMTP_ keys that are present but empty — Joi rejects "".
  # compose.yaml defaults (localhost/25/disabled) take over when keys are absent.
  sed -i '/^SMTP_[A-Za-z_]*=[[:space:]]*$/d' "$ENV_FILE"
else
  info "Generating $ENV_FILE with random secrets..."

  JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n=/+')
  MASTER_KEY=$(openssl rand -hex 32)
  PG_PASS=$(openssl rand -base64 20 | tr -d '\n=/+')
  GF_PASS=$(openssl rand -base64 12 | tr -d '\n=/+')

  cat > "$ENV_FILE" << EOF
# Auto-generated by install.sh on $(date -u '+%Y-%m-%d %H:%M UTC')
# DO NOT commit this file to version control.

# --- Authentication ---
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=1h

# --- Encryption ---
MASTER_ENCRYPTION_KEY=${MASTER_KEY}

# --- Database ---
POSTGRES_DB=smecertdb
POSTGRES_USER=smeuser
POSTGRES_PASSWORD=${PG_PASS}

# --- Fabric ---
FABRIC_CHANNEL_NAME=certificates
FABRIC_CHAINCODE_NAME=certificate_contract
FABRIC_CONNECTION_PROFILE_PATH=/app/fabric/profiles/connection-org1.json
FABRIC_WALLET_PATH=/app/wallets/org1

# --- CORS / URLs ---
CORS_ORIGIN=http://${VM_IP}
APP_URL=http://${VM_IP}

# --- Platform ---
PLATFORM_NAME=SME Certificate Trust Platform

# --- SMTP (optional) ---
# Uncomment and fill in real values to enable email. Leave commented to disable.
# Joi validation rejects empty strings — either use real values or leave keys absent.
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=you@gmail.com
# SMTP_PASS=your-app-password
# CONTACT_TO_EMAIL=you@gmail.com

# --- Grafana ---
GF_SECURITY_ADMIN_PASSWORD=${GF_PASS}

# --- Observability ---
OTEL_ENABLED=true
PROMETHEUS_ENABLED=true

# --- Swagger (disabled in production) ---
SWAGGER_ENABLED=false
EOF

  ok ".env created at $ENV_FILE"
fi

# ── Sanitize app compose file ─────────────────────────────────────────────────
LC_ALL=C tr -cd '\11\12\15\40-\176' < "$APP_COMPOSE" > /tmp/_clean && mv /tmp/_clean "$APP_COMPOSE"

# ── Build and start application stack ─────────────────────────────────────────
info "Building Docker images and starting app stack (3-6 min on first run)..."
cd "$COMPOSE_DIR"
docker compose down 2>/dev/null || true
docker compose up -d --build
ok "App stack started (8 services)"

# =============================================================================
banner "Phase 8/9 — Database Migration"
# =============================================================================

info "Waiting for PostgreSQL to be ready (60s max)..."
ELAPSED=0
until docker compose exec -T postgres pg_isready -U smeuser -d smecertdb &>/dev/null; do
  sleep 3; ELAPSED=$((ELAPSED + 3))
  [ "$ELAPSED" -ge 60 ] && fail "PostgreSQL did not become ready within 60s. Check: docker logs sme-cert-postgres"
done
ok "PostgreSQL is ready"

info "Applying Prisma schema (creates all tables)..."
docker compose exec -T api npx prisma db push \
    --schema=/app/prisma/schema.prisma \
    --accept-data-loss 2>&1 | tail -3 \
  && ok "Database schema applied" \
  || warn "Prisma db push returned errors — check: docker compose exec api npx prisma db push"

info "Seeding demo organizations and users..."
docker compose exec -T api npx ts-node \
    --transpile-only --compiler-options '{"module":"commonjs"}' \
    prisma/seed.ts 2>&1 | tail -5 \
  && ok "Demo data seeded (admin@platform.local / Admin123!, issuer@msmeda.gov.eg / Demo123!)" \
  || warn "Seed failed — run manually: docker compose exec api npx ts-node --transpile-only --compiler-options '{\"module\":\"commonjs\"}' prisma/seed.ts"

info "Waiting for NestJS API to become healthy (120s max)..."
ELAPSED=0; API_UP=false
while [ "$ELAPSED" -lt 120 ]; do
  curl -sf http://localhost:3000/api/health &>/dev/null && { API_UP=true; break; }
  sleep 5; ELAPSED=$((ELAPSED + 5))
  [ $((ELAPSED % 20)) -eq 0 ] && info "  API not ready yet... ${ELAPSED}s elapsed"
done
$API_UP && ok "API is healthy: http://localhost:3000/api/health" \
         || warn "API did not respond in 120s. Check: docker logs sme-cert-api --tail 50"

cd "$APP_DIR"

# =============================================================================
banner "Phase 9/9 — Firewall & Health Check"
# =============================================================================

if command -v firewall-cmd &>/dev/null; then
  info "Opening ports 80 and 443 in OS firewall..."
  sudo firewall-cmd --permanent --add-port=80/tcp  2>/dev/null || true
  sudo firewall-cmd --permanent --add-port=443/tcp 2>/dev/null || true
  sudo firewall-cmd --reload 2>/dev/null || true
  ok "OS firewall: ports 80, 443 open"
else
  warn "firewall-cmd not found — skipping OS firewall"
fi

info "Running final health checks..."
echo ""
echo -e "  ${CYAN}Service Health:${NC}"

check_service() {
  local NAME="$1" URL="$2"
  if curl -sf --max-time 5 "$URL" &>/dev/null; then
    echo -e "    ${GREEN}✓${NC} $NAME"
  else
    echo -e "    ${YELLOW}⚠${NC}  $NAME  (not responding yet — may still be starting)"
  fi
}

check_service "Nginx (port 80)"      "http://localhost:80/"
check_service "NestJS API"           "http://localhost:3000/api/health"
check_service "Prometheus"           "http://localhost:9090/-/healthy"
check_service "Grafana"              "http://localhost:3001/api/health"

# Orderer health (TLS, so use -k)
for PORT in 9443 9444 9445; do
  if curl -sfk --max-time 3 "https://localhost:${PORT}/healthz" &>/dev/null; then
    echo -e "    ${GREEN}✓${NC} Orderer ops :${PORT}"
  else
    echo -e "    ${YELLOW}⚠${NC}  Orderer ops :${PORT}"
  fi
done

# =============================================================================
banner "Installation Complete"
# =============================================================================

# Read generated Grafana password for the summary
GF_PASSWORD=$(grep '^GF_SECURITY_ADMIN_PASSWORD=' "$ENV_FILE" | cut -d'=' -f2)

echo -e "  ${GREEN}${BOLD}Platform Access:${NC}"
echo "    Web UI (public):  http://${VM_IP}"
echo "    NestJS API:       http://${VM_IP}/api"
echo "    Swagger Docs:     disabled (set SWAGGER_ENABLED=true in .env to enable)"
echo "    Prometheus:       http://${VM_IP}:9090    (internal — open port in OCI if needed)"
echo "    Grafana:          http://${VM_IP}:3001    (admin / ${GF_PASSWORD})"
echo ""
echo -e "  ${GREEN}${BOLD}Demo Credentials:${NC}"
echo "    admin@platform.local    Admin123!    (Platform Admin)"
echo "    issuer@msmeda.gov.eg    Demo123!     (Issuer Admin)"
echo "    sme@example.com         Demo123!     (SME Holder)"
echo "    verifier@auditor.com    Demo123!     (Verifier)"
echo ""
echo -e "  ${YELLOW}${BOLD}Oracle Cloud — Required Security List Rule:${NC}"
echo "    OCI Console → Networking → VCN → Subnet → Security List → Add Ingress"
echo "    Source CIDR: 0.0.0.0/0   Protocol: TCP   Port: 80"
echo ""
echo -e "  ${CYAN}${BOLD}Environment File:${NC}"
echo "    $ENV_FILE"
echo "    (Contains your generated secrets — keep this private)"
echo ""
echo -e "  ${CYAN}${BOLD}After a VM Reboot:${NC}"
echo "    bash $SCRIPT_DIR/restart.sh"
echo ""
echo -e "  ${CYAN}${BOLD}Logs:${NC}"
echo "    docker logs sme-cert-api -f"
echo "    docker logs sme-cert-nginx -f"
echo "    docker compose -f $APP_COMPOSE logs -f"
echo ""
