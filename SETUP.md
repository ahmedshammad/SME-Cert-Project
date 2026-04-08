# SME Certificate Trust Platform — Setup Guide

**Single source of truth.** This file replaces `README.md`, `DEPLOYMENT.md`, `StartUp_Guide.txt`,
`Commads to run for permissions first.txt`, `Creates 4 organizations (consortium.txt)`,
and `MultiTenant.txt`. All of those are outdated.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Project Structure](#3-project-structure)
4. [Option A — Oracle Linux VM (Production)](#4-option-a--oracle-linux-vm-production)
5. [Option B — Local Development (Linux / macOS)](#5-option-b--local-development-linux--macos)
6. [Restarting an Existing Deployment](#6-restarting-an-existing-deployment)
7. [Daily Operations](#7-daily-operations)
8. [Environment Variables Reference](#8-environment-variables-reference)
9. [Demo Credentials](#9-demo-credentials)
10. [Troubleshooting](#10-troubleshooting)
11. [Teardown & Full Reset](#11-teardown--full-reset)
12. [Port Reference](#12-port-reference)

---

## 1. Architecture Overview

```
                         ┌─────────────────────────┐
                         │  Nginx  (port 80 / 443)  │
                         │  Reverse proxy + TLS      │
                         └────────┬────────┬─────────┘
                                  │        │
                   ┌──────────────▼─┐  ┌───▼──────────────┐
                   │  Web (React)   │  │  API (NestJS)     │
                   │  :5173 → :80   │  │  port 3000        │
                   └────────────────┘  └───┬──────────┬────┘
                                           │          │
                              ┌────────────▼─┐   ┌────▼──────────┐
                              │  PostgreSQL  │   │  IPFS (Kubo)  │
                              │  port 5432   │   │  port 5001    │
                              └──────────────┘   └───────────────┘
                                                        │
                              ┌─────────────────────────▼────────────┐
                              │     Hyperledger Fabric 2.5 Network    │
                              │  3 Raft orderers + 8 peers + 8 CouchDB│
                              │  4 Orgs: MinTrade / MSMEDA /          │
                              │          Training / Auditors           │
                              └──────────────────────────────────────┘

Observability (internal only):
  Prometheus :9090 | Grafana :3001 | OTel Collector :4317/4318
```

**Organizations & Peers**

| Org | Name | MSP ID | Peer0 | Peer1 |
|-----|------|--------|-------|-------|
| 1 | Ministry of Trade | Org1MSP | 7051 | 8051 |
| 2 | MSMEDA | Org2MSP | 9051 | 10051 |
| 3 | Training Providers | Org3MSP | 11051 | 12051 |
| 4 | External Auditors | Org4MSP | 13051 | 14051 |

**Orderers (Raft)**

| Name | Port | Admin | Ops |
|------|------|-------|-----|
| orderer.example.com | 7050 | 7053 | 9443 |
| orderer2.example.com | 8050 | 8053 | 9444 |
| orderer3.example.com | 9050 | 9053 | 9445 |

---

## 2. Prerequisites

### Software Versions (tested and confirmed working)

| Tool | Minimum | Recommended | Notes |
|------|---------|-------------|-------|
| Docker | 24.0+ | latest | Must include Compose plugin |
| Docker Compose | 2.20+ (v2) | latest | Use `docker compose` not `docker-compose` |
| Go | 1.21+ | 1.23.x | For chaincode compilation |
| Node.js | 20.x | 20 LTS | Required for Yarn workspace |
| Yarn | 4.0+ | 4.0.2 | Enabled via `corepack` |
| Hyperledger Fabric Binaries | 2.5.x | 2.5.9 | `peer`, `cryptogen`, `configtxgen`, `osnadmin` |
| OS | Oracle Linux 8+ / Ubuntu 20.04+ / macOS 13+ | — | Linux x86_64 for production |

### Install Fabric Binaries (Linux — tested method)

> The `install-fabric.sh` script installs to a relative path that can cause issues.
> Use the direct release tarball instead:

```bash
cd /tmp
wget -q "https://github.com/hyperledger/fabric/releases/download/v2.5.9/hyperledger-fabric-linux-amd64-2.5.9.tar.gz"
tar xzf hyperledger-fabric-linux-amd64-2.5.9.tar.gz
sudo cp /tmp/bin/* /usr/local/bin/

# Verify
cryptogen version   # Should print: cryptogen: v2.5.9
configtxgen -version
peer version
osnadmin version
```

### Pull Required Docker Images

```bash
# Fabric core images
docker pull hyperledger/fabric-peer:2.5
docker pull hyperledger/fabric-orderer:2.5
docker pull hyperledger/fabric-tools:2.5
docker pull hyperledger/fabric-ccenv:2.5
docker pull hyperledger/fabric-baseos:2.5
docker pull couchdb:3.3

# App images (built locally, no pull needed)
```

---

## 3. Project Structure

```
sme-certificate-platform/
├── SETUP.md                           ← This file (use this, ignore the rest)
├── .env.example                       ← Template for root .env (dev only)
├── package.json                       ← Yarn workspace root
├── .yarnrc.yml
│
├── apps/
│   ├── api/                           ← NestJS backend
│   │   ├── src/modules/               ← Feature modules (auth, certs, fabric, …)
│   │   ├── prisma/schema.prisma       ← PostgreSQL schema (13 models)
│   │   └── Dockerfile
│   └── web/                           ← React 18 frontend (3 portals)
│       ├── src/pages/                 ← issuer / holder / verifier / auth / public
│       └── Dockerfile
│
├── blockchain/
│   ├── network/
│   │   ├── config/                    ← configtx.yaml, crypto-config.yaml, core.yaml
│   │   ├── docker/
│   │   │   ├── docker-compose-fabric.yaml   ← Single-VM (all 4 orgs)
│   │   │   ├── docker-compose-vm1.yaml      ← Multi-VM: Org1 + Orderer1
│   │   │   ├── docker-compose-vm2.yaml      ← Multi-VM: Org2 + Orderer2
│   │   │   ├── docker-compose-vm3.yaml      ← Multi-VM: Org3 + Orderer3
│   │   │   └── docker-compose-vm4.yaml      ← Multi-VM: Org4
│   │   ├── scripts/
│   │   │   ├── bootstrap.sh           ← Master orchestrator (steps 1-7)
│   │   │   ├── generate_crypto.sh
│   │   │   ├── generate_artifacts.sh
│   │   │   ├── create_channel.sh
│   │   │   ├── deploy_chaincode.sh        ← Standard lifecycle (local dev)
│   │   │   ├── deploy_chaincode_ccaas.sh  ← CCaaS (production VM)
│   │   │   ├── generate_connection_profiles.sh
│   │   │   ├── enroll_admin.sh
│   │   │   ├── fabric-health.sh
│   │   │   └── network.sh
│   │   ├── crypto-config/             ← Generated (git-ignored)
│   │   ├── channel-artifacts/         ← Generated (git-ignored)
│   │   └── connection-profiles/       ← Generated (git-ignored)
│   └── chaincode/certificate_contract/ ← Go smart contract
│
├── infra/
│   ├── compose/
│   │   ├── compose.yaml               ← App stack (8 services)
│   │   ├── .env                       ← Docker Compose env (create from below)
│   │   ├── prometheus.yml
│   │   └── otel-collector-config.yml
│   ├── nginx/conf/                    ← nginx.conf + default.conf
│   └── storage/ipfs/                  ← IPFS config
│
├── scripts/
│   ├── setup_vm.sh                    ← Full automated Oracle Linux setup (newest)
│   ├── bootstrap_vm.sh                ← Older VM setup script
│   ├── start_all.sh                   ← Start both stacks
│   ├── stop_all.sh                    ← Stop both stacks
│   └── setup_https.sh                 ← Let's Encrypt TLS (after DNS is set)
│
├── wallets/                           ← Generated admin wallets (git-ignored)
│   ├── org1/admin.id
│   ├── org2/admin.id
│   ├── org3/admin.id
│   └── org4/admin.id
│
└── docs/
    ├── architecture/
    ├── deployment_oracle_linux/
    └── thesis_technical_documentation.md
```

---

## 4. Option A — Oracle Linux VM (Production)

### 4.1 Prepare the VM

```bash
# Minimum specs: Oracle Linux 8+, 8 GB RAM, 4 vCPUs, 100 GB disk
# Connect as the 'opc' user (default Oracle Cloud user)

# Step 1: Update system
sudo dnf update -y

# Step 2: Install Docker
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
newgrp docker          # or log out and back in

# Step 3: Install Go
cd /tmp
curl -LO https://go.dev/dl/go1.23.5.linux-amd64.tar.gz
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go1.23.5.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc
go version             # → go1.23.5

# Step 4: Install Node.js 20 + Yarn 4
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs
sudo corepack enable
sudo corepack prepare yarn@4.0.2 --activate
yarn -v                # → 4.0.2

# Step 5: Install Hyperledger Fabric 2.5 binaries
cd /tmp
wget -q "https://github.com/hyperledger/fabric/releases/download/v2.5.9/hyperledger-fabric-linux-amd64-2.5.9.tar.gz"
tar xzf hyperledger-fabric-linux-amd64-2.5.9.tar.gz
sudo cp /tmp/bin/* /usr/local/bin/
cryptogen version      # → v2.5.9

# Step 6: Pull Fabric Docker images
docker pull hyperledger/fabric-peer:2.5
docker pull hyperledger/fabric-orderer:2.5
docker pull hyperledger/fabric-tools:2.5
docker pull hyperledger/fabric-ccenv:2.5
docker pull hyperledger/fabric-baseos:2.5
docker pull couchdb:3.3
```

### 4.2 Upload Project Code

Transfer the project to `~/sme_app/` on the VM using SFTP (MobaXTerm, FileZilla, or `scp`):

```bash
# From your local machine:
scp -r "/path/to/Version 6.0/" opc@<VM_IP>:~/sme_app/

# Fix line endings and permissions
cd ~/sme_app
find scripts blockchain/network/scripts -name "*.sh" | xargs dos2unix 2>/dev/null || true
find scripts blockchain/network/scripts -name "*.sh" | xargs chmod +x
```

### 4.3 Bootstrap the Fabric Network

```bash
cd ~/sme_app/blockchain/network

# Full bootstrap: crypto → artifacts → containers → channel → chaincode → profiles → wallets
bash scripts/bootstrap.sh full

# This runs these steps automatically:
#   1. cryptogen → crypto-config/
#   2. configtxgen → channel-artifacts/certificates.block
#   3. docker compose up (20 containers: 3 orderers, 8 peers, 8 CouchDBs, 1 tools)
#   4. osnadmin channel join (Channel Participation API — no system channel)
#   5. deploy_chaincode.sh (Fabric 2.5 lifecycle: package → install → approve × 4 → commit)
#   6. generate_connection_profiles.sh → connection-profiles/connection-org{1..4}.json
#   7. enroll_admin.sh → wallets/org{1..4}/admin.id

# Verify Fabric is healthy
bash scripts/fabric-health.sh
```

### 4.4 Configure the Application Environment

```bash
cd ~/sme_app/infra/compose

# Create .env from the working template
cp ../../.env.example .env    # optional base; the file below is authoritative

cat > .env << 'EOF'
# --- Authentication ---
JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
JWT_EXPIRES_IN=1h

# --- Encryption ---
MASTER_ENCRYPTION_KEY=$(openssl rand -hex 32)

# --- Database ---
POSTGRES_DB=smecertdb
POSTGRES_USER=smeuser
POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d '\n')

# --- Fabric ---
FABRIC_CHANNEL_NAME=certificates
FABRIC_CHAINCODE_NAME=certificate_contract
FABRIC_CONNECTION_PROFILE_PATH=/app/fabric/profiles/connection-org1.json
FABRIC_WALLET_PATH=/app/wallets/org1

# --- CORS / URLs ---
CORS_ORIGIN=http://<YOUR_VM_IP>
APP_URL=http://<YOUR_VM_IP>

# --- Platform ---
PLATFORM_NAME=SME Certificate Trust Platform

# --- SMTP (optional — contact form stores to DB even without it) ---
# Leave these out entirely to disable email, OR provide real non-empty values.
# IMPORTANT: Joi validation rejects empty string "". Either omit the key or fill it in.
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=you@gmail.com
# SMTP_PASS=your-app-password
# CONTACT_TO_EMAIL=you@gmail.com

# --- Grafana ---
GF_SECURITY_ADMIN_PASSWORD=changeme_grafana_$(openssl rand -hex 8)

# --- Observability ---
OTEL_ENABLED=true
PROMETHEUS_ENABLED=true

# --- Swagger (disable in production) ---
SWAGGER_ENABLED=false
EOF
```

> **Generate real secrets** — replace the `$(...)` calls above by running them first:
> ```bash
> echo "JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')"
> echo "MASTER_ENCRYPTION_KEY=$(openssl rand -hex 32)"
> echo "POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d '\n')"
> ```
> Then paste the values directly into `.env`.

### 4.5 Start the Application Stack

```bash
cd ~/sme_app/infra/compose

# Build images and start all 8 services
docker compose up -d --build

# Watch startup (wait for all healthy)
docker compose ps
docker compose logs -f api    # Watch for "Application is running on port 3000"
```

### 4.6 Run Database Migrations & Seed

```bash
# Wait for postgres to be healthy first
until docker exec sme-cert-postgres pg_isready -U smeuser -d smecertdb; do sleep 2; done

# Apply Prisma migrations
docker exec sme-cert-api npx prisma migrate deploy --schema=/app/prisma/schema.prisma

# Seed demo users and organizations
docker exec sme-cert-api yarn seed 2>/dev/null || \
docker exec sme-cert-api npx ts-node prisma/seed.ts 2>/dev/null || \
echo "Seed not available — create users via the admin portal"
```

### 4.7 Initialize the Ledger

```bash
cd ~/sme_app/blockchain/network

export FABRIC_CFG_PATH=$PWD/config
export CORE_PEER_TLS_ENABLED=true
export ORDERER_CA=$PWD/crypto-config/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
export CORE_PEER_MSPCONFIGPATH=$PWD/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_LOCALMSPID=Org1MSP
export CORE_PEER_TLS_ROOTCERT_FILE=$PWD/crypto-config/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_ADDRESS=localhost:7051

TLS_ORG1=$PWD/crypto-config/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
TLS_ORG2=$PWD/crypto-config/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
TLS_ORG3=$PWD/crypto-config/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/ca.crt

peer chaincode invoke \
  -o localhost:7050 --tls --cafile $ORDERER_CA \
  -C certificates -n certificate_contract \
  --peerAddresses localhost:7051 --tlsRootCertFiles $TLS_ORG1 \
  --peerAddresses localhost:9051 --tlsRootCertFiles $TLS_ORG2 \
  --peerAddresses localhost:11051 --tlsRootCertFiles $TLS_ORG3 \
  -c '{"function":"InitLedger","Args":[]}'

# Verify
peer chaincode query -C certificates -n certificate_contract \
  -c '{"function":"GetIssuer","Args":["org1-ministry"]}'
# Should return issuer JSON (not "not found")
```

### 4.8 Open Firewall Ports

```bash
# Oracle Linux firewall
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload

# Also add ingress rules in OCI Console:
#   VCN → Security Lists → Ingress Rules → TCP 80, TCP 443 from 0.0.0.0/0
```

### 4.9 Enable HTTPS (Optional — requires a domain with DNS)

```bash
# Point your domain to the VM IP first, then:
bash ~/sme_app/scripts/setup_https.sh yourdomain.com admin@yourdomain.com
```

### 4.10 Verify End-to-End

```bash
# API health
curl http://localhost:3000/api/health
curl http://localhost:3000/api/health/blockchain

# Nginx (public entry point)
curl http://localhost:80

# Orderer health (TLS)
curl -sk https://localhost:9443/healthz   # → {"status":"OK"}
curl -sk https://localhost:9444/healthz
curl -sk https://localhost:9445/healthz

# Full Fabric health report
bash ~/sme_app/blockchain/network/scripts/fabric-health.sh smoke
```

---

## 5. Option B — Local Development (Linux / macOS)

> Assumes Docker, Go, Node.js 20+, Yarn 4, and Fabric binaries are already installed
> (see [Section 2](#2-prerequisites)).

```bash
# 1. Install Node dependencies
yarn install

# 2. Bootstrap Fabric (crypto, channel, chaincode, wallets)
cd blockchain/network
bash scripts/bootstrap.sh full
cd ../..

# 3. Create the compose .env
cp infra/compose/.env infra/compose/.env.bak 2>/dev/null; true
cat > infra/compose/.env << 'EOF'
JWT_SECRET=local-dev-jwt-secret-not-for-production
MASTER_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
POSTGRES_DB=smecertdb
POSTGRES_USER=smeuser
POSTGRES_PASSWORD=smepassword
GF_SECURITY_ADMIN_PASSWORD=admin
CORS_ORIGIN=http://localhost:5173
APP_URL=http://localhost:5173
SWAGGER_ENABLED=true
OTEL_ENABLED=true
PROMETHEUS_ENABLED=true
EOF

# 4. Build and start app stack
cd infra/compose
docker compose up -d --build
cd ../..

# 5. Migrate database (wait ~15s for postgres to start)
docker exec sme-cert-api npx prisma migrate deploy --schema=/app/prisma/schema.prisma

# 6. Initialize ledger (see step 4.7 above for the full peer env setup)

# Access
open http://localhost        # Web UI via Nginx
open http://localhost:3000/api/docs  # Swagger (if SWAGGER_ENABLED=true)
```

---

## 6. Restarting an Existing Deployment

Use this when the VM has rebooted, or you stopped the services.
**Do not re-run bootstrap** — that regenerates crypto and creates a new network.

```bash
cd ~/sme_app

# Start Fabric network (containers only, preserves ledger volumes)
docker compose -f blockchain/network/docker/docker-compose-fabric.yaml up -d
sleep 20

# Start application stack
docker compose -f infra/compose/compose.yaml up -d

# Verify everything is healthy
docker compose -f blockchain/network/docker/docker-compose-fabric.yaml ps
docker compose -f infra/compose/compose.yaml ps
curl http://localhost:3000/api/health
curl http://localhost:80
```

---

## 7. Daily Operations

### Container Status

```bash
# All containers at a glance
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Fabric network
docker compose -f blockchain/network/docker/docker-compose-fabric.yaml ps

# App stack
docker compose -f infra/compose/compose.yaml ps
```

### Logs

```bash
docker logs -f sme-cert-api                    # API (NestJS)
docker logs -f sme-cert-web                    # Frontend
docker logs -f sme-cert-nginx                  # Nginx
docker logs -f sme-cert-postgres               # PostgreSQL
docker logs -f orderer.example.com             # Orderer 1
docker logs -f peer0.org1.example.com          # Peer Org1
docker compose -f infra/compose/compose.yaml logs -f   # All app logs
```

### Restart Individual Services

```bash
# Restart just the API (e.g., after changing .env)
docker compose -f infra/compose/compose.yaml restart api

# Force rebuild + restart API
cd infra/compose
docker compose build --no-cache api
docker compose up -d --force-recreate api
```

### Fabric Health

```bash
cd blockchain/network
bash scripts/fabric-health.sh          # Basic health check
bash scripts/fabric-health.sh smoke    # Health + chaincode smoke test
bash scripts/bootstrap.sh status       # Quick crypto/channel/wallet status
```

### Chaincode Query / Invoke

```bash
cd blockchain/network

# Set peer env (Org1)
export FABRIC_CFG_PATH=$PWD/config
export CORE_PEER_TLS_ENABLED=true
export ORDERER_CA=$PWD/crypto-config/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
export CORE_PEER_LOCALMSPID=Org1MSP
export CORE_PEER_ADDRESS=localhost:7051
export CORE_PEER_TLS_ROOTCERT_FILE=$PWD/crypto-config/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=$PWD/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp

# Query
peer chaincode query -C certificates -n certificate_contract \
  -c '{"function":"GetIssuer","Args":["org1-ministry"]}'

# Channel info
peer channel list
peer channel getinfo -c certificates

# Committed chaincode
peer lifecycle chaincode querycommitted --channelID certificates \
  --name certificate_contract

# List channels on orderer (osnadmin)
CRYPTO=$PWD/crypto-config
osnadmin channel list \
  -o localhost:7053 \
  --ca-file "$CRYPTO/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \
  --client-cert "$CRYPTO/ordererOrganizations/example.com/orderers/orderer.example.com/tls/server.crt" \
  --client-key "$CRYPTO/ordererOrganizations/example.com/orderers/orderer.example.com/tls/server.key"
```

### Database

```bash
# Connect to PostgreSQL
docker exec -it sme-cert-postgres psql -U smeuser -d smecertdb

# Apply schema changes after editing prisma/schema.prisma
docker exec sme-cert-api npx prisma db push --schema=/app/prisma/schema.prisma

# Run migrations
docker exec sme-cert-api npx prisma migrate deploy --schema=/app/prisma/schema.prisma

# Prisma Studio (requires local dev setup)
cd apps/api && npx prisma studio
```

### Re-deploy Chaincode (version upgrade)

```bash
cd blockchain/network
# Increment CC_VERSION and CC_SEQUENCE
CC_VERSION=1.2 CC_SEQUENCE=2 bash scripts/deploy_chaincode.sh

# Or CCaaS version
CC_VERSION=1.2 CC_SEQUENCE=2 bash scripts/deploy_chaincode_ccaas.sh
```

---

## 8. Environment Variables Reference

The application stack reads **`infra/compose/.env`** — not the root `.env`.
The root `.env.example` is a development reference only.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | **Yes** | — | Random base64 string; sign all JWTs |
| `MASTER_ENCRYPTION_KEY` | **Yes** | — | 64-char hex; AES-256-GCM master key |
| `POSTGRES_PASSWORD` | **Yes** | — | PostgreSQL password |
| `POSTGRES_DB` | No | `smecertdb` | Database name |
| `POSTGRES_USER` | No | `smeuser` | Database user |
| `FABRIC_CHANNEL_NAME` | No | `certificates` | Fabric channel |
| `FABRIC_CHAINCODE_NAME` | No | `certificate_contract` | Chaincode name |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Allowed CORS origin; set to your domain in production |
| `APP_URL` | No | `http://localhost:5173` | Used in password-reset emails |
| `SMTP_HOST` | No* | — | See note below |
| `SMTP_PORT` | No* | `587` | |
| `SMTP_USER` | No* | — | |
| `SMTP_PASS` | No* | — | |
| `CONTACT_TO_EMAIL` | No | `ahmeds_hammad@hotmail.com` | Destination for contact form |
| `GF_SECURITY_ADMIN_PASSWORD` | No | — | Grafana admin password |
| `SWAGGER_ENABLED` | No | `false` | Enable Swagger UI at `/api/docs` |
| `OTEL_ENABLED` | No | `true` | OpenTelemetry tracing |
| `PROMETHEUS_ENABLED` | No | `true` | Prometheus metrics |

> **SMTP Note:** Joi validation rejects **empty strings**. Either:
> - Omit all four `SMTP_*` keys entirely (no email sent; contact form stores to DB), OR
> - Provide all four with real non-empty values.
>
> Do NOT leave them as `SMTP_HOST=` with empty values — that causes a startup crash.

### Generate Secrets

```bash
openssl rand -base64 48   # JWT_SECRET
openssl rand -hex 32      # MASTER_ENCRYPTION_KEY (must be exactly 64 hex chars)
openssl rand -base64 24   # POSTGRES_PASSWORD
```

---

## 9. Demo Credentials

These are seeded by `prisma/seed.ts` on first startup.

| Email | Password | Role | Portal |
|-------|----------|------|--------|
| `admin@platform.local` | `Admin123!` | PLATFORM_ADMIN | — |
| `issuer@msmeda.gov.eg` | `Demo123!` | ISSUER_ADMIN | Issuer Portal |
| `sme@example.com` | `Demo123!` | SME_USER | Holder Portal |
| `verifier@auditor.com` | `Demo123!` | VERIFIER_USER | Verifier Portal |

> **Change all passwords before exposing to the internet.**

---

## 10. Troubleshooting

### `cryptogen: command not found` / Fabric binaries missing

```bash
# Re-install using the direct tarball method
cd /tmp
wget -q "https://github.com/hyperledger/fabric/releases/download/v2.5.9/hyperledger-fabric-linux-amd64-2.5.9.tar.gz"
tar xzf hyperledger-fabric-linux-amd64-2.5.9.tar.gz
sudo cp /tmp/bin/* /usr/local/bin/
```

### `Config validation error: "SMTP_PASS" is not allowed to be empty`

```bash
# Remove all SMTP keys, then add real values or leave them out
cd infra/compose
sed -i '/^SMTP_HOST=/d; /^SMTP_PORT=/d; /^SMTP_USER=/d; /^SMTP_PASS=/d' .env
# Option 1 — disable email entirely: do nothing more
# Option 2 — enable email: add real credentials
cat >> .env << 'EOF'
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your-app-password
EOF
docker compose up -d --force-recreate api
```

### `Error creating container: No such image: hyperledger/fabric-ccenv:2.5`

```bash
docker pull hyperledger/fabric-ccenv:2.5
docker pull hyperledger/fabric-baseos:2.5
docker pull hyperledger/fabric-nodeenv:2.5
```

### `corepack enable` fails with EACCES (permission denied)

```bash
sudo corepack enable
sudo corepack prepare yarn@4.0.2 --activate
```

### Fabric API can't connect (`sme-cert-api` can't reach peers)

```bash
# Both stacks must share the 'fabric_network' bridge
docker network ls | grep fabric_network
# If missing, start the Fabric compose first (it creates the network)
docker compose -f blockchain/network/docker/docker-compose-fabric.yaml up -d
# Then restart API
docker compose -f infra/compose/compose.yaml restart api
```

### `channel already exists` during `create_channel.sh`

Not an error. Channel was created in a previous run. All peers will confirm joined.

### Prisma migration fails (`relation already exists`)

```bash
# Use db push instead (non-destructive schema sync)
docker exec sme-cert-api npx prisma db push --schema=/app/prisma/schema.prisma
```

### Peer container exits immediately

```bash
docker logs peer0.org1.example.com 2>&1 | tail -30
# Common cause: crypto-config missing or wrong FABRIC_CFG_PATH
# Re-run: bash blockchain/network/scripts/bootstrap.sh full
```

### API health check fails after startup

```bash
# Wait longer — the API waits for postgres + ipfs to be healthy before binding
docker compose -f infra/compose/compose.yaml logs --tail=50 api
# Give it up to 2 minutes on first build
```

---

## 11. Teardown & Full Reset

### Stop only (preserves all data)

```bash
docker compose -f infra/compose/compose.yaml stop
docker compose -f blockchain/network/docker/docker-compose-fabric.yaml stop
```

### Tear down app stack (removes containers + volumes)

```bash
docker compose -f infra/compose/compose.yaml down -v
```

### Tear down Fabric network (removes ALL ledger data — irreversible)

```bash
cd blockchain/network
bash scripts/bootstrap.sh teardown
```

### Complete wipe (start from absolute zero)

```bash
# 1. App stack
docker compose -f infra/compose/compose.yaml down -v

# 2. Fabric network
cd blockchain/network && bash scripts/bootstrap.sh teardown && cd ../..

# 3. Orphan volumes
docker volume prune -f

# 4. Chaincode images
docker images --format '{{.Repository}}:{{.Tag}}' | grep 'dev-peer' | xargs -r docker rmi -f

# 5. Sentinel files (start_all.sh uses these to skip already-done steps)
rm -f blockchain/network/.channel-created
rm -f blockchain/network/.chaincode-deployed
rm -f .data-seeded
```

---

## 12. Port Reference

| Port | Service | Accessible |
|------|---------|------------|
| **80** | Nginx (HTTP → Web + API) | Public |
| **443** | Nginx (HTTPS — after TLS setup) | Public |
| 3000 | NestJS API | Internal (`/api` via Nginx) |
| 5173 | React Web (mapped to :80 inside web container) | Internal (`/` via Nginx) |
| 5432 | PostgreSQL | Internal |
| 5001 | IPFS API | Internal |
| 8080 | IPFS Gateway | Internal |
| 4001 | IPFS Swarm | Internal |
| 7050 | Orderer 1 (gRPC) | Internal |
| 8050 | Orderer 2 (gRPC) | Internal |
| 9050 | Orderer 3 (gRPC) | Internal |
| 7053 | Orderer 1 Admin (osnadmin) | Internal |
| 8053 | Orderer 2 Admin | Internal |
| 9053 | Orderer 3 Admin | Internal |
| 9443 | Orderer 1 Ops (healthz) | Internal |
| 9444 | Orderer 2 Ops | Internal |
| 9445 | Orderer 3 Ops | Internal |
| 7051 | Peer0 Org1 | Internal |
| 8051 | Peer1 Org1 | Internal |
| 9051 | Peer0 Org2 | Internal |
| 10051 | Peer1 Org2 | Internal |
| 11051 | Peer0 Org3 | Internal |
| 12051 | Peer1 Org3 | Internal |
| 13051 | Peer0 Org4 | Internal |
| 14051 | Peer1 Org4 | Internal |
| 9090 | Prometheus | Internal |
| 3001 | Grafana | Internal |
| 4317 | OTel Collector (gRPC) | Internal |
| 4318 | OTel Collector (HTTP) | Internal |

> **Firewall rule:** Only open ports **80** and **443** to the internet.
> All other ports are internal to the Docker bridge networks.

---

*Last updated: April 2026 — based on confirmed working deployment on Oracle Cloud (Oracle Linux 8)*
