# SME Certificate Trust Platform

A production-ready, end-to-end permissioned blockchain solution for issuing, storing, verifying, and revoking digital certificates for Egyptian SMEs.

## Overview

The SME Certificate Trust Platform enables trusted digital certificate lifecycle management using Hyperledger Fabric blockchain. The platform supports three primary actors:

1. **Issuer Authorities** - Ministries, MSMEDA, training providers, auditors
2. **SME Certificate Holders** - Small and medium enterprises receiving certificates
3. **Verifiers** - Employers, regulators, auditors validating certificate authenticity

## Architecture

- **Blockchain**: Hyperledger Fabric 2.4 with Raft ordering, 4-org configuration, CouchDB state database
- **Smart Contracts**: Go chaincode with deterministic logic and strict access control
- **Backend**: NestJS + TypeScript with layered architecture
- **Frontend**: React + TypeScript with Vite, Tailwind CSS, and Radix UI
- **Identity**: OAuth2/OIDC for portal login, Fabric identities for transaction signing
- **Off-chain Storage**: IPFS with AES-256-GCM encryption
- **Database**: PostgreSQL with Prisma ORM
- **Observability**: OpenTelemetry, Prometheus, structured JSON logs
- **Reverse Proxy**: Nginx with TLS termination

## Quick Start

### Local Development

**Prerequisites:**
- Docker Engine 24.0+
- Docker Compose 2.20+
- Node.js 20+
- Yarn 4+
- Go 1.21+

**Start the platform:**

```bash
# Install dependencies
yarn install

# Bootstrap the local environment
./scripts/bootstrap_local.sh

# Start all services
./scripts/start_all.sh
```

The platform will be available at:
- Web UI: https://localhost (redirects from http://localhost:8080)
- API: https://localhost/api
- Prometheus: http://localhost:9090

**Demo credentials:**
- Issuer Admin: `issuer@msmeda.gov.eg` / `Demo123!`
- SME User: `sme@example.com` / `Demo123!`
- Verifier: `verifier@auditor.com` / `Demo123!`

### Oracle Linux VM Deployment

**Prerequisites:**
- Oracle Linux 8 or 9
- Minimum 8GB RAM, 4 vCPUs, 100GB storage
- Root or sudo access

**Deploy:**

```bash
# Clone repository
git clone <repository-url>
cd sme-certificate-platform

# Run bootstrap script (installs Docker, configures firewall, generates certs)
sudo ./scripts/bootstrap_vm.sh

# Start the platform
./scripts/start_all.sh

# Enable auto-start on reboot
sudo systemctl enable sme-cert-platform
```

Access the platform at `https://<vm-ip-address>`

## Core Features

### Certificate Issuance
- Template-based certificate creation with JSON schema validation
- Digital signatures using ECDSA P-256 (FIPS-aligned)
- W3C Verifiable Credentials compatible format
- Encrypted off-chain payload storage
- On-chain metadata with minimal data disclosure
- QR code generation for easy sharing

### Certificate Verification
- QR code scanning or manual certificate ID entry
- Multi-step verification process:
  - Issuer identity validation
  - Revocation status check
  - Cryptographic hash verification
  - Digital signature validation
- Clear verification results with evidence trail
- Verifier access grants with expiry

### Certificate Revocation
- Issuer-initiated revocation with reason codes
- Immediate reflection in verification results
- Immutable audit trail on blockchain
- Email notifications to certificate holders

### Security & Privacy
- Encryption at rest and in transit (TLS/mTLS)
- Envelope encryption for certificate payloads
- RBAC with 7 distinct roles
- Data minimization on blockchain
- Audit logging for all sensitive operations
- Key rotation support for issuer keys

### Bilingual Support
- Arabic and English UI
- RTL support for Arabic
- Localized error messages and notifications

## Repository Structure

```
.
├── apps/
│   ├── api/                 # NestJS backend API
│   └── web/                 # React frontend
├── blockchain/
│   ├── network/             # Hyperledger Fabric configuration
│   └── chaincode/           # Go smart contracts
├── storage/
│   ├── ipfs/                # IPFS configuration
│   └── encryption/          # Encryption libraries
├── infra/
│   ├── nginx/               # Nginx configuration
│   └── compose/             # Docker Compose files
├── scripts/                 # Deployment and utility scripts
├── docs/                    # Comprehensive documentation
└── tools/                   # Development tools
```

## Documentation

Comprehensive documentation is available in the [docs](./docs) directory:

- [Architecture Overview](./docs/architecture/README.md)
- [API Reference](./docs/api/README.md)
- [Chaincode Reference](./docs/chaincode/README.md)
- [Oracle Linux Deployment Guide](./docs/deployment_oracle_linux/README.md)
- [Security & Threat Model](./docs/security/README.md)
- [Evaluation Protocol](./docs/evaluation_protocol/README.md)

## Development

### Running Tests

```bash
# Unit tests
yarn test

# Integration tests
yarn test:integration

# E2E tests
yarn test:e2e

# Test coverage
yarn test:coverage
```

### Code Quality

```bash
# Linting
yarn lint

# Type checking
yarn typecheck

# Format code
yarn format
```

### Workload Generation

```bash
# Generate sample issuance and verification workload
./scripts/workload_generator.sh --duration 300 --tps 10
```

## Monitoring

- **Prometheus Metrics**: http://localhost:9090
- **Application Logs**: `docker-compose logs -f api`
- **Blockchain Logs**: `docker-compose logs -f peer0.org1.example.com`
- **IPFS Logs**: `docker-compose logs -f ipfs`

## Support

For issues, questions, or contributions, please refer to the project documentation or contact the development team.

## License

Copyright © 2026 SME Certificate Trust Platform. All rights reserved.
