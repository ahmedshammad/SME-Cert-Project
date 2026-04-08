# Oracle Linux Deployment Guide

## Quick Start

### Prerequisites

- Oracle Linux 8 or 9 (fresh installation recommended)
- Minimum 8 GB RAM, 4 vCPUs, 100 GB storage
- Root or sudo access
- Internet connectivity

### One-Command Deployment

```bash
# Clone the repository
git clone <repository-url>
cd sme-certificate-platform

# Run bootstrap script
sudo ./scripts/bootstrap_vm.sh

# Start the platform
./scripts/start_all.sh
```

Access the platform at `https://<vm-ip-address>`

---

## Detailed Deployment Steps

### Step 1: System Preparation

#### Update System
```bash
sudo dnf update -y
sudo dnf install -y git wget curl vim
```

#### Set Hostname
```bash
sudo hostnamectl set-hostname sme-cert-platform.local
```

#### Configure Time Synchronization
```bash
sudo dnf install -y chrony
sudo systemctl enable --now chronyd
sudo timedatectl set-timezone Africa/Cairo
```

### Step 2: Clone Repository

```bash
cd /opt
sudo git clone <repository-url> sme-certificate-platform
cd sme-certificate-platform
sudo chown -R $USER:$USER .
```

### Step 3: Run Bootstrap Script

The bootstrap script automates:
- Docker installation
- Hyperledger Fabric binaries
- Node.js and Yarn
- Go compiler
- Firewall configuration
- TLS certificate generation
- Systemd service creation

```bash
sudo ./scripts/bootstrap_vm.sh
```

**Expected duration**: 10-15 minutes

### Step 4: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with your values
vim .env
```

**Critical Environment Variables:**

```bash
# Database
DATABASE_URL=postgresql://smeuser:CHANGE_PASSWORD@localhost:5432/smecertdb

# Security (generate with: openssl rand -base64 32)
JWT_SECRET=<your-random-secret>
SESSION_SECRET=<your-random-secret>
MASTER_ENCRYPTION_KEY=<your-random-key>

# Platform Domain
PLATFORM_DOMAIN=sme-cert.example.com

# Email (optional, for notifications)
EMAIL_ENABLED=true
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASSWORD=<smtp-password>
```

### Step 5: Generate TLS Certificates (Production)

For production, replace self-signed certificates:

#### Option A: Let's Encrypt (Recommended)

```bash
sudo dnf install -y certbot
sudo certbot certonly --standalone -d sme-cert.example.com

# Copy certificates
sudo cp /etc/letsencrypt/live/sme-cert.example.com/fullchain.pem \
    ./infra/nginx/tls/server.crt
sudo cp /etc/letsencrypt/live/sme-cert.example.com/privkey.pem \
    ./infra/nginx/tls/server.key
sudo chmod 600 ./infra/nginx/tls/server.key
```

#### Option B: Commercial CA

Upload your certificates to:
- `./infra/nginx/tls/server.crt` (certificate + intermediate chain)
- `./infra/nginx/tls/server.key` (private key)

### Step 6: Start Platform

```bash
./scripts/start_all.sh
```

This will:
1. Start Hyperledger Fabric network (3 orderers, 8 peers)
2. Create channel and join peers
3. Deploy chaincode
4. Start PostgreSQL, IPFS, API, Web, Nginx
5. Run database migrations
6. Seed demo data

**Expected duration**: 5-10 minutes on first run

### Step 7: Verify Deployment

#### Check Docker Containers
```bash
docker ps
```

Expected containers:
- 3 orderers
- 8 peers
- 8 CouchDB instances
- PostgreSQL
- IPFS
- API
- Web
- Nginx
- Prometheus
- Grafana

#### Check Service Health

```bash
# API health
curl http://localhost/api/health

# Fabric peer
docker exec peer0.org1.example.com peer channel list

# Database
docker exec sme-cert-postgres pg_isready
```

#### Check Logs

```bash
# All services
docker compose -f infra/compose/compose.yaml logs

# Specific service
docker logs sme-cert-api
docker logs peer0.org1.example.com
```

### Step 8: Access Platform

| Service | URL | Default Credentials |
|---------|-----|---------------------|
| Web UI | https://vm-ip-address | See demo accounts below |
| API Docs | https://vm-ip-address/api/docs | - |
| Prometheus | http://vm-ip-address:9090 | - |
| Grafana | http://vm-ip-address:3001 | admin / admin |

**Demo Accounts** (created by seed script):

| Role | Email | Password |
|------|-------|----------|
| Consortium Admin | admin@platform.local | Admin123! |
| Issuer Admin (Org1) | issuer@msmeda.gov.eg | Demo123! |
| SME User | sme@example.com | Demo123! |
| Verifier | verifier@auditor.com | Demo123! |

### Step 9: Enable Auto-Start

```bash
sudo systemctl enable sme-cert-platform
sudo systemctl start sme-cert-platform
```

Verify:
```bash
sudo systemctl status sme-cert-platform
```

---

## Production Hardening

### 1. Change Default Passwords

```bash
# Database
psql -U smeuser -d smecertdb
ALTER USER smeuser WITH PASSWORD 'new-secure-password';

# Update .env
DATABASE_URL=postgresql://smeuser:new-secure-password@localhost:5432/smecertdb
```

### 2. Configure Firewall for Public Access

```bash
# Get VM public IP
VM_IP=$(curl -s ifconfig.me)

# Update firewall to allow only necessary ports
sudo firewall-cmd --permanent --remove-service=http
sudo firewall-cmd --permanent --remove-service=https
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="0.0.0.0/0" port port="443" protocol="tcp" accept'
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="0.0.0.0/0" port port="80" protocol="tcp" accept'

# Reload
sudo firewall-cmd --reload
```

### 3. Setup Database Backups

```bash
# Create backup script
cat > /opt/sme-certificate-platform/scripts/backup_db.sh <<'EOF'
#!/bin/bash
BACKUP_DIR=/var/backups/smecert
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
docker exec sme-cert-postgres pg_dump -U smeuser smecertdb | gzip > $BACKUP_DIR/smecertdb_$DATE.sql.gz
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
EOF

chmod +x /opt/sme-certificate-platform/scripts/backup_db.sh

# Add to cron (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/sme-certificate-platform/scripts/backup_db.sh") | crontab -
```

### 4. Configure SELinux (if enabled)

```bash
# Check SELinux status
getenforce

# If Enforcing, configure policies
sudo setsebool -P container_manage_cgroup on
sudo semanage fcontext -a -t container_file_t "/opt/sme-certificate-platform(/.*)?"
sudo restorecon -Rv /opt/sme-certificate-platform
```

### 5. Monitoring and Alerts

Configure Prometheus alerts in `infra/compose/prometheus.yml`:

```yaml
groups:
  - name: platform_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        annotations:
          summary: "High error rate detected"
```

### 6. Log Rotation

```bash
cat > /etc/logrotate.d/sme-cert <<EOF
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    size=10M
    missingok
    delaycompress
    copytruncate
}
EOF
```

---

## Troubleshooting

### Issue: Fabric network won't start

```bash
# Check peer logs
docker logs peer0.org1.example.com

# Common fix: regenerate crypto
cd blockchain/network
./scripts/generate_crypto.sh
./scripts/generate_artifacts.sh
./scripts/network.sh restart
```

### Issue: API can't connect to Fabric

```bash
# Check connection profile
cat blockchain/network/connection-profiles/connection-org1.json

# Verify wallet exists
ls -la wallets/org1

# Check API logs
docker logs sme-cert-api
```

### Issue: Database migrations fail

```bash
# Reset database
docker exec sme-cert-postgres dropdb -U smeuser smecertdb
docker exec sme-cert-postgres createdb -U smeuser smecertdb

# Re-run migrations
docker exec sme-cert-api yarn prisma migrate deploy
```

### Issue: Out of disk space

```bash
# Check usage
df -h

# Clean Docker
docker system prune -a --volumes

# Clean old logs
sudo journalctl --vacuum-time=7d
```

### Issue: Port conflicts

```bash
# Check what's using a port
sudo ss -tulpn | grep :5432

# Kill process or change port in .env
```

---

## Maintenance

### Regular Updates

```bash
# Update codebase
cd /opt/sme-certificate-platform
git pull

# Rebuild services
./scripts/stop_all.sh
yarn install
yarn build
./scripts/start_all.sh
```

### Health Checks

```bash
# Run health check script
./scripts/health_check.sh
```

### Viewing Metrics

Access Grafana at `http://vm-ip:3001` for:
- Certificate issuance rates
- Verification success/failure rates
- API response times
- Blockchain health
- System resource usage

---

## Scaling Considerations

### Horizontal Scaling (Multi-VM)

1. **Separate Fabric Organizations**: Deploy each org on separate VM
2. **API Load Balancing**: Deploy multiple API instances behind load balancer
3. **Database Replication**: PostgreSQL primary-replica setup
4. **Distributed IPFS**: IPFS cluster for redundancy

### Vertical Scaling

- Increase VM resources as needed
- Monitor Prometheus metrics for bottlenecks
- Adjust Docker resource limits in compose.yaml

---

## Support

For issues and questions:
1. Check logs: `docker compose logs`
2. Review documentation in `/docs`
3. Open issue on GitHub repository
4. Contact platform team

---

**Version**: 1.0
**Last Updated**: 2024-02-12
