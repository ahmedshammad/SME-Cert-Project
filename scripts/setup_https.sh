#!/usr/bin/env bash
# =============================================================================
# setup_https.sh — Install Certbot and obtain Let's Encrypt TLS certificate
# Run ONCE on the Oracle Linux VM after Nginx is already up.
# Prerequisites:
#   - DNS A record pointing your domain to this VM's public IP
#   - Port 80 open in OCI Security List (for HTTP-01 challenge)
#   - Port 443 open in OCI Security List (for HTTPS traffic)
#   - Nginx already running (docker compose up -d nginx)
# =============================================================================
set -euo pipefail

# ─── Configuration ─────────────────────────────────────────────────────────
DOMAIN="${1:-}"
EMAIL="${2:-}"

if [[ -z "$DOMAIN" || -z "$EMAIL" ]]; then
  echo "Usage: $0 <domain> <admin-email>"
  echo "  e.g. $0 certs.example.com admin@example.com"
  exit 1
fi

echo "=== Setting up HTTPS for $DOMAIN ==="

# ─── Phase 1: Install Certbot ───────────────────────────────────────────────
echo "[1/5] Installing Certbot..."
sudo dnf install -y epel-release 2>/dev/null || true
sudo dnf install -y certbot python3-certbot-nginx 2>/dev/null || \
  sudo dnf install -y certbot 2>/dev/null || \
  pip3 install certbot certbot-nginx 2>/dev/null

# ─── Phase 2: Stop Nginx container to free port 80 ─────────────────────────
echo "[2/5] Stopping Nginx container to free port 80 for challenge..."
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR/infra/compose"
docker compose stop nginx 2>/dev/null || true

# ─── Phase 3: Obtain certificate (standalone mode) ─────────────────────────
echo "[3/5] Obtaining Let's Encrypt certificate..."
sudo certbot certonly \
  --standalone \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL" \
  --domain "$DOMAIN" \
  --cert-name "$DOMAIN"

CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"
echo "Certificate obtained: $CERT_DIR"

# ─── Phase 4: Configure Nginx to use TLS ───────────────────────────────────
echo "[4/5] Updating Nginx configuration for HTTPS..."

NGINX_CONF="$APP_DIR/infra/nginx/conf/default.conf"

# Backup original
cp "$NGINX_CONF" "${NGINX_CONF}.bak" 2>/dev/null || true

# Write HTTPS-enabled Nginx config
cat > "$NGINX_CONF" <<NGINX_EOF
# HTTP → HTTPS redirect
server {
    listen 80;
    server_name ${DOMAIN};
    return 301 https://\$host\$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name ${DOMAIN};

    ssl_certificate     /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/${DOMAIN}/chain.pem;

    # Modern TLS settings
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers on;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_stapling        on;
    ssl_stapling_verify on;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options            DENY always;
    add_header X-Content-Type-Options     nosniff always;
    add_header X-XSS-Protection           "1; mode=block" always;
    add_header Referrer-Policy            "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:;" always;

    client_max_body_size 50M;

    # Health check
    location /health {
        return 200 'healthy';
        add_header Content-Type text/plain;
    }

    # API proxy
    location /api/ {
        proxy_pass         http://api:3000/;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 120s;
    }

    # Frontend proxy
    location / {
        proxy_pass         http://web:80;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX_EOF

echo "Nginx config updated: $NGINX_CONF"

# Mount Let's Encrypt certs into Nginx container
# Add volume to compose.yaml nginx service
COMPOSE_FILE="$APP_DIR/infra/compose/compose.yaml"
if ! grep -q "letsencrypt" "$COMPOSE_FILE"; then
  echo ""
  echo "IMPORTANT: Add the following volume to the nginx service in compose.yaml:"
  echo "      - /etc/letsencrypt:/etc/letsencrypt:ro"
  echo ""
  echo "Press ENTER once you've added it, or Ctrl+C to abort..."
  read -r
fi

# ─── Phase 5: Restart services and set up auto-renewal ──────────────────────
echo "[5/5] Restarting Nginx and setting up auto-renewal..."
docker compose up -d nginx

# Verify HTTPS
sleep 5
if curl -sSf "https://${DOMAIN}/health" > /dev/null 2>&1; then
  echo "HTTPS is working at https://${DOMAIN}"
else
  echo "WARNING: HTTPS check failed. Check Nginx logs: docker compose logs nginx"
fi

# Auto-renewal via cron (runs twice daily, standard certbot schedule)
CRON_CMD="0 3 * * * certbot renew --quiet --pre-hook 'docker compose -f $COMPOSE_FILE stop nginx' --post-hook 'docker compose -f $COMPOSE_FILE up -d nginx' >> /var/log/certbot-renew.log 2>&1"

if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
  (crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -
  echo "Auto-renewal cron job added."
else
  echo "Auto-renewal cron job already exists."
fi

echo ""
echo "=== HTTPS Setup Complete ==="
echo "  Domain:   https://${DOMAIN}"
echo "  Cert dir: /etc/letsencrypt/live/${DOMAIN}/"
echo "  Renewal:  cron runs daily at 03:00"
echo ""
echo "Test renewal with: sudo certbot renew --dry-run"
