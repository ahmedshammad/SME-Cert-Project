#!/bin/bash
#
# SME Certificate Trust Platform - Rebuild Application Services
# Run this on the server after deploying updated source files
#
# Usage: ./scripts/rebuild_on_server.sh
#

set -e

PROJECT_ROOT="/home/opc/bc_applicaition"
COMPOSE_DIR="$PROJECT_ROOT/infra/compose"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
echo_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
echo_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "======================================================================"
echo " Rebuilding Application Services"
echo "======================================================================"
echo ""

# ==========================================================================
# Step 1: Stop existing application containers (keep Fabric running)
# ==========================================================================
echo_info "Step 1: Stopping application containers..."

cd "$COMPOSE_DIR"

# Stop only the app services, not Fabric network
docker compose stop api web nginx prometheus grafana otel-collector 2>/dev/null || true
docker compose rm -f api web 2>/dev/null || true

# Remove old images to force fresh build
docker rmi compose-api compose-web 2>/dev/null || true

echo_info "Old containers and images removed"

# ==========================================================================
# Step 2: Verify source files are updated
# ==========================================================================
echo_info "Step 2: Verifying source files..."

# Check critical files exist
MISSING=0
for f in \
    "$PROJECT_ROOT/apps/web/tsconfig.json" \
    "$PROJECT_ROOT/apps/web/src/main.tsx" \
    "$PROJECT_ROOT/apps/api/src/health.controller.ts" \
    "$PROJECT_ROOT/apps/api/src/modules/auth/auth.module.ts" \
    "$PROJECT_ROOT/apps/api/src/modules/certificates/certificates.module.ts" \
    "$PROJECT_ROOT/infra/compose/prometheus.yml" \
    "$PROJECT_ROOT/infra/nginx/conf/default.conf"
do
    if [ ! -f "$f" ]; then
        echo_error "Missing: $f"
        MISSING=1
    fi
done

if [ "$MISSING" -eq 1 ]; then
    echo_error "Some files are missing! Run deploy_to_server.ps1 first."
    exit 1
fi

# Verify key fixes are applied
if grep -q "template\.name," "$PROJECT_ROOT/apps/api/src/modules/templates/templates.service.ts" 2>/dev/null; then
    echo_error "templates.service.ts still has 'template.name' - old version!"
    exit 1
fi

if grep -q "publicKey:" "$PROJECT_ROOT/apps/api/src/modules/wallet/wallet.service.ts" 2>/dev/null; then
    echo_error "wallet.service.ts still has 'publicKey' - old version!"
    exit 1
fi

echo_info "Source files verified"

# ==========================================================================
# Step 3: Rebuild Docker images
# ==========================================================================
echo_info "Step 3: Rebuilding Docker images (this may take a few minutes)..."

cd "$COMPOSE_DIR"

# Load env vars
if [ -f "$COMPOSE_DIR/.env" ]; then
    set -a
    source "$COMPOSE_DIR/.env"
    set +a
fi

# Build with no cache to ensure fresh build
docker compose build --no-cache api web

echo_info "Docker images rebuilt successfully"

# ==========================================================================
# Step 4: Start all services
# ==========================================================================
echo_info "Step 4: Starting all application services..."

docker compose up -d

echo_info "Waiting for services to start..."
sleep 15

# ==========================================================================
# Step 5: Run database migrations
# ==========================================================================
echo_info "Step 5: Running database migrations..."

# Wait for PostgreSQL
echo_info "Waiting for PostgreSQL..."
until docker exec sme-cert-postgres pg_isready -U smeuser -d smecertdb > /dev/null 2>&1; do
    sleep 2
done

# Wait for API container to be running
echo_info "Waiting for API container..."
for i in $(seq 1 30); do
    if docker exec sme-cert-api ls /app/prisma/schema.prisma > /dev/null 2>&1; then
        break
    fi
    sleep 2
done

# Run migrations
docker exec sme-cert-api npx prisma migrate deploy 2>&1 || echo_warn "Migration may have failed - check logs"
docker exec sme-cert-api npx prisma generate 2>&1 || true

echo_info "Database migrations complete"

# ==========================================================================
# Step 6: Health check
# ==========================================================================
echo_info "Step 6: Running health checks..."

sleep 5

# Check API
if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
    echo_info "API health check: PASSED"
else
    echo_warn "API health check: FAILED (may still be starting)"
fi

# Check Web
if curl -sf http://localhost:5173 > /dev/null 2>&1; then
    echo_info "Web health check: PASSED"
else
    echo_warn "Web health check: FAILED (may still be starting)"
fi

# ==========================================================================
# Summary
# ==========================================================================
echo ""
echo "======================================================================"
echo_info " Rebuild Complete!"
echo "======================================================================"
echo ""

docker compose ps

echo ""
echo "If any service failed, check logs with:"
echo "  docker compose -f $COMPOSE_DIR/compose.yaml logs api"
echo "  docker compose -f $COMPOSE_DIR/compose.yaml logs web"
echo ""
echo "Access points:"
echo "  API:     http://localhost:3000/api/health"
echo "  Web:     http://localhost:5173"
echo "  Nginx:   http://localhost:80"
echo "  Grafana: http://localhost:3001 (admin/admin)"
echo ""

[opc@bc6-0 compose]$ docker compose ps
NAME                  IMAGE                    COMMAND                  SERVICE      CREATED         STATUS                    PORTS
sme-cert-grafana      grafana/grafana:latest   "/run.sh"                grafana      4 minutes ago   Up 4 minutes (healthy)    0.0.0.0:3001->3000/tcp, [::]:3001->3000/tcp
sme-cert-ipfs         ipfs/kubo:latest         "/sbin/tini -- /usr/…"   ipfs         5 minutes ago   Up 4 minutes (healthy)    0.0.0.0:4001->4001/tcp, [::]:4001->4001/tcp, 0.0.0.0:5001->5001/tcp, [::]:5001->5001/tcp, 4001/udp, 0.0.0.0:8080->8080/tcp, [::]:8080->8080/tcp, 8081/tcp
sme-cert-nginx        nginx:alpine             "/docker-entrypoint.…"   nginx        4 minutes ago   Up 39 seconds (healthy)   0.0.0.0:80->80/tcp, [::]:80->80/tcp
sme-cert-postgres     postgres:16-alpine       "docker-entrypoint.s…"   postgres     5 minutes ago   Up 4 minutes (healthy)    0.0.0.0:5432->5432/tcp, [::]:5432->5432/tcp
sme-cert-prometheus   prom/prometheus:latest   "/bin/prometheus --c…"   prometheus   5 minutes ago   Up 4 minutes (healthy)    0.0.0.0:9090->9090/tcp, [::]:9090->9090/tcp
sme-cert-web          compose-web              "/docker-entrypoint.…"   web          4 minutes ago   Up 40 seconds (healthy)   0.0.0.0:5173->80/tcp, [::]:5173->80/tcp
[opc@bc6-0 compose]$ curl -s http://localhost:3000/api/health
[opc@bc6-0 compose]$ curl -s http://localhost:3000/api/health
[opc@bc6-0 compose]$ docker exec sme-cert-api npx prisma migrate deploy
Error response from daemon: container f2c443a03648339025f2b0ac0ccdb89107fb3db0c7ba9fafda357c2ed977df79 is not running
[opc@bc6-0 compose]$ docker logs sme-cert-web --tail 20
docker logs sme-cert-nginx --tail 20
/docker-entrypoint.sh: Launching /docker-entrypoint.d/10-listen-on-ipv6-by-default.sh
10-listen-on-ipv6-by-default.sh: info: Getting the checksum of /etc/nginx/conf.d/default.conf
10-listen-on-ipv6-by-default.sh: info: /etc/nginx/conf.d/default.conf differs from the packaged version
/docker-entrypoint.sh: Sourcing /docker-entrypoint.d/15-local-resolvers.envsh
/docker-entrypoint.sh: Launching /docker-entrypoint.d/20-envsubst-on-templates.sh
/docker-entrypoint.sh: Launching /docker-entrypoint.d/30-tune-worker-processes.sh
/docker-entrypoint.sh: Configuration complete; ready for start up
2026/02/14 20:23:52 [notice] 1#1: using the "epoll" event method
2026/02/14 20:23:52 [notice] 1#1: nginx/1.29.5
2026/02/14 20:23:52 [notice] 1#1: built by gcc 15.2.0 (Alpine 15.2.0)
2026/02/14 20:23:52 [notice] 1#1: OS: Linux 6.12.0-107.59.3.2.el9uek.x86_64
2026/02/14 20:23:52 [notice] 1#1: getrlimit(RLIMIT_NOFILE): 1024:524288
2026/02/14 20:23:52 [notice] 1#1: start worker processes
2026/02/14 20:23:52 [notice] 1#1: start worker process 29
2026/02/14 20:23:52 [notice] 1#1: start worker process 30
::1 - - [14/Feb/2026:20:23:57 +0000] "GET / HTTP/1.1" 200 949 "-" "curl/8.17.0" "-"
::1 - - [14/Feb/2026:20:24:27 +0000] "GET / HTTP/1.1" 200 949 "-" "curl/8.17.0" "-"
::1 - - [14/Feb/2026:20:24:57 +0000] "GET / HTTP/1.1" 200 949 "-" "curl/8.17.0" "-"
::1 - - [14/Feb/2026:20:25:27 +0000] "GET / HTTP/1.1" 200 949 "-" "curl/8.17.0" "-"
::1 - - [14/Feb/2026:20:25:57 +0000] "GET / HTTP/1.1" 200 949 "-" "curl/8.17.0" "-"
/docker-entrypoint.sh: /docker-entrypoint.d/ is not empty, will attempt to perform configuration
/docker-entrypoint.sh: Looking for shell scripts in /docker-entrypoint.d/
/docker-entrypoint.sh: Launching /docker-entrypoint.d/10-listen-on-ipv6-by-default.sh
10-listen-on-ipv6-by-default.sh: info: can not modify /etc/nginx/conf.d/default.conf (read-only file system?)
/docker-entrypoint.sh: Sourcing /docker-entrypoint.d/15-local-resolvers.envsh
/docker-entrypoint.sh: Launching /docker-entrypoint.d/20-envsubst-on-templates.sh
/docker-entrypoint.sh: Launching /docker-entrypoint.d/30-tune-worker-processes.sh
/docker-entrypoint.sh: Configuration complete; ready for start up
[opc@bc6-0 compose]$
