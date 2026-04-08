# SME Certificate Trust Platform - Architecture Documentation

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Principles](#architecture-principles)
3. [Component Architecture](#component-architecture)
4. [Data Flow](#data-flow)
5. [Security Architecture](#security-architecture)
6. [Deployment Architecture](#deployment-architecture)
7. [Technology Stack](#technology-stack)

## System Overview

The SME Certificate Trust Platform is a production-ready, end-to-end blockchain solution for issuing, storing, verifying, and revoking digital certificates for Egyptian Small and Medium Enterprises (SMEs). The platform leverages Hyperledger Fabric as a permissioned blockchain to ensure trust, immutability, and auditability while maintaining privacy through encrypted off-chain storage.

### Key Actors

1. **Issuer Authorities** - Government ministries, MSMEDA, training providers, and auditors who issue certificates
2. **SME Certificate Holders** - Small and medium enterprises that receive and manage their certificates
3. **Verifiers** - Employers, regulators, and auditors who validate certificate authenticity

### Core Capabilities

- **Certificate Issuance**: Template-based certificate creation with W3C Verifiable Credentials compatibility
- **Certificate Verification**: Multi-step cryptographic verification with revocation checking
- **Certificate Revocation**: Issuer-initiated revocation with immediate effect
- **Privacy Preservation**: Encrypted off-chain payload with on-chain metadata only
- **Audit Trail**: Immutable blockchain history with application-level audit logs
- **Bilingual Support**: Arabic and English UI with RTL support

## Architecture Principles

### 1. Security First

- **Zero Trust Architecture**: All requests authenticated and authorized
- **Defense in Depth**: Multiple layers of security controls
- **Encryption Everywhere**: TLS in transit, AES-256-GCM at rest
- **Least Privilege**: RBAC with 7 distinct roles and granular permissions
- **Audit Everything**: Comprehensive logging of all sensitive operations

### 2. Privacy by Design

- **Data Minimization**: Only essential metadata stored on-chain
- **Encrypted Payloads**: Certificate data encrypted before off-chain storage
- **Pseudonymous Identifiers**: Holder IDs are pseudonymous on blockchain
- **Access Control**: Strict enforcement of who can read certificate data
- **Selective Disclosure**: Holders control what verifiers can see

### 3. Blockchain Best Practices

- **Immutability**: Certificate records and revocations are permanent
- **Consensus**: Raft-based ordering with multi-org endorsement
- **Smart Contract Determinism**: Pure functions with strict validation
- **Event-Driven**: Blockchain events trigger off-chain workflows
- **State Separation**: Hot data in CouchDB, cold data in PostgreSQL

### 4. Operational Excellence

- **Observability**: OpenTelemetry traces, Prometheus metrics, structured logs
- **High Availability**: Containerized services with health checks
- **Disaster Recovery**: Database backups and blockchain snapshots
- **Performance**: Optimistic concurrency, caching, connection pooling
- **DevOps**: Infrastructure as Code, automated deployment

## Component Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  Issuer Portal  │  SME Holder Portal  │  Verifier Portal       │
│  (React + TS)   │    (React + TS)     │   (React + TS)         │
└────────────┬────────────────┬─────────────────┬─────────────────┘
             │                │                  │
             └────────────────┼──────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   Nginx Proxy      │
                    │   (TLS Termination)│
                    └─────────┬──────────┘
                              │
             ┌────────────────┼────────────────┐
             │                │                │
    ┌────────▼─────┐  ┌──────▼──────┐  ┌─────▼──────┐
    │   API Layer  │  │ Observability│  │   Static   │
    │   (NestJS)   │  │ (Prometheus) │  │   Assets   │
    └────────┬─────┘  └─────────────┘  └────────────┘
             │
    ┌────────┼────────┐
    │        │        │
┌───▼──┐ ┌──▼───┐ ┌──▼────┐
│ Fabric│ │Postgres│ │ IPFS │
│Network│ │  DB   │ │Storage│
└───────┘ └───────┘ └───────┘
```

### 1. Frontend Layer (React + TypeScript)

**Three Specialized Portals:**

#### Issuer Portal
- Dashboard with issuance statistics
- Template builder with JSON schema designer
- Certificate issuance wizard (multi-step)
- Revocation management
- Issuer key management

#### SME Holder Portal
- Certificate wallet view
- Certificate details with QR code
- Share center for creating access grants
- Wallet settings and key rotation

#### Verifier Portal
- QR code scanner for verification
- Manual certificate ID entry
- Verification result display with evidence
- Verification history

**Technology:**
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Radix UI for accessible components
- i18next for internationalization (Arabic/English)
- React Query for data fetching
- Zustand for state management

### 2. API Layer (NestJS)

**Module Structure:**

```typescript
apps/api/src/
├── modules/
│   ├── auth/          // OAuth2/OIDC, JWT, session management
│   ├── users/         // User and organization CRUD
│   ├── templates/     // Template management and versioning
│   ├── certificates/  // Core certificate operations
│   ├── storage/       // IPFS and encryption services
│   ├── wallet/        // Holder wallet and key management
│   ├── audit/         // Audit log queries
│   └── metrics/       // Prometheus metrics, analytics
├── common/
│   ├── prisma/        // Database ORM
│   ├── fabric/        // Blockchain integration
│   ├── guards/        // Auth guards
│   ├── interceptors/  // Logging, transformation
│   └── decorators/    // Custom decorators
└── config/            // Configuration modules
```

**Key Features:**
- RESTful API with OpenAPI/Swagger documentation
- Role-based access control (RBAC)
- Request validation using class-validator
- Rate limiting with configurable zones
- OpenTelemetry instrumentation
- Structured JSON logging with Winston
- Graceful shutdown handling

### 3. Blockchain Layer (Hyperledger Fabric)

**Network Topology:**
- **4 Organizations**: Org1 (Ministry), Org2 (MSMEDA), Org3 (Training), Org4 (Auditors)
- **8 Peers**: 2 peers per organization with CouchDB state database
- **3 Orderers**: Raft consensus for crash fault tolerance
- **1 Channel**: `certificates` channel for certificate data

**Smart Contract Functions:**

| Function | Purpose | Access Control |
|----------|---------|----------------|
| InitLedger | Bootstrap network | Consortium Admin |
| RegisterIssuer | Register new issuer | Consortium Admin |
| CreateTemplate | Create certificate template | Issuer Admin |
| IssueCertificate | Issue new certificate | Issuer Operator |
| GetCertificateRecord | Retrieve certificate | Holder, Issuer, Verifier |
| VerifyCertificateRecord | Verify certificate | Anyone |
| RevokeCertificate | Revoke certificate | Original Issuer |
| ListCertificatesByHolder | List holder's certs | Holder, Admin |
| ListCertificatesByIssuer | List issuer's certs | Issuer, Admin |
| GetCertificateHistory | Get audit trail | Admin, Auditor |

**On-Chain Data Model:**
```json
{
  "cert_id": "unique-identifier",
  "issuer_org_id": "org1",
  "issuer_public_key_id": "key-reference",
  "holder_id": "pseudonymous-id",
  "issued_at": "2024-01-15T10:30:00Z",
  "expires_at": "2025-01-15T10:30:00Z",
  "cert_hash": "sha256-hash-of-payload",
  "content_pointer": "QmIPFSCID...",
  "status": "ACTIVE",
  "schema_id": "template-id",
  "template_version": "1.0.0",
  "tx_id": "fabric-transaction-id",
  "block_time": "2024-01-15T10:30:05Z"
}
```

### 4. Storage Layer

#### PostgreSQL (Application Database)
- User accounts and authentication
- Organizations and templates
- Certificate metadata (mirrors blockchain)
- Access grants and sharing
- Verification records
- Audit logs
- System configuration

#### IPFS (Off-Chain Content)
- Encrypted certificate payloads
- Attachments and supporting documents
- Content-addressed storage (CID)
- Optional: Bridge to OCI Object Storage

#### Encryption Strategy
1. **Envelope Encryption**:
   - Generate unique data key per certificate (AES-256-GCM)
   - Encrypt payload with data key
   - Wrap data key with holder's public key
   - Store encrypted payload and wrapped key in IPFS

2. **Key Management**:
   - Master encryption key in environment (HSM in production)
   - Per-certificate data keys rotated automatically
   - Holder controls decryption keys in their wallet

### 5. Observability Stack

#### OpenTelemetry
- Distributed tracing across services
- Trace context propagation
- Automatic instrumentation of NestJS
- Export to OTLP collector

#### Prometheus
- Time-series metrics database
- Metrics from API, Fabric peers, system resources
- Custom business metrics (certificates issued, verified)
- Alerting rules for anomalies

#### Grafana
- Visual dashboards for metrics
- Pre-built dashboards for:
  - Certificate issuance trends
  - Verification success rates
  - System performance
  - Blockchain health

#### Structured Logging
- JSON log format for machine parsing
- Log levels: ERROR, WARN, INFO, DEBUG
- Correlation IDs for request tracing
- Centralized log aggregation ready

## Data Flow

### Certificate Issuance Flow

```
1. Issuer creates certificate in UI
   ↓
2. API validates input, checks template
   ↓
3. Generate certificate VC JSON
   ↓
4. Canonicalize and hash (SHA-256)
   ↓
5. Sign with issuer private key (ECDSA P-256)
   ↓
6. Encrypt payload with data key
   ↓
7. Upload to IPFS, get CID
   ↓
8. Submit transaction to Fabric chaincode
   ↓
9. Chaincode validates and writes state
   ↓
10. Event emitted, API updates PostgreSQL
   ↓
11. Generate QR code and verification URL
   ↓
12. Return certificate ID to issuer
```

### Certificate Verification Flow

```
1. Verifier scans QR or enters cert ID
   ↓
2. API calls Fabric VerifyCertificateRecord
   ↓
3. Chaincode checks:
   - Certificate exists
   - Issuer is registered
   - Not revoked
   - Not expired
   ↓
4. (Optional) If access granted:
   - Fetch from IPFS using CID
   - Decrypt payload
   - Recompute hash
   - Verify signature
   ↓
5. Build verification result with evidence
   ↓
6. Log verification event
   ↓
7. Return structured result to verifier
```

## Security Architecture

### Defense in Depth Layers

1. **Network Layer**: Firewall rules, TLS 1.2+, mTLS for Fabric
2. **Application Layer**: Input validation, output encoding, CSRF protection
3. **Authentication**: OAuth2/OIDC, JWT tokens, session management
4. **Authorization**: RBAC with attribute-based refinement
5. **Data Layer**: Encryption at rest, encrypted backups
6. **Audit Layer**: All sensitive operations logged immutably

### Threat Mitigation

| Threat | Mitigation |
|--------|------------|
| SQL Injection | Parameterized queries (Prisma ORM) |
| XSS | Output encoding, CSP headers |
| CSRF | SameSite cookies, CSRF tokens |
| Brute Force | Rate limiting, account lockout |
| Man-in-the-Middle | TLS everywhere, certificate pinning |
| Data Breach | Encryption at rest, key rotation |
| Insider Threat | Audit logs, least privilege |
| Tampering | Blockchain immutability, digital signatures |

## Deployment Architecture

### Single VM Deployment (Development/Small Scale)

All services run on one Oracle Linux VM using Docker Compose.

**Minimum Requirements:**
- 8 GB RAM
- 4 vCPUs
- 100 GB storage
- Oracle Linux 8 or 9

### Multi-VM Deployment (Production Scale)

- **Fabric Network**: 4 VMs (one per organization)
- **Application Tier**: 2+ VMs (API + Web, load balanced)
- **Data Tier**: 2 VMs (PostgreSQL primary + replica)
- **Storage Tier**: IPFS cluster or OCI Object Storage
- **Observability**: Dedicated VM for Prometheus + Grafana

## Technology Stack

### Frontend
- React 18.2+
- TypeScript 5.3+
- Vite 5.0+
- Tailwind CSS 3.4+
- Radix UI
- i18next for i18n

### Backend
- Node.js 20+
- NestJS 10+
- TypeScript 5.3+
- Prisma ORM 5.8+
- PostgreSQL 16

### Blockchain
- Hyperledger Fabric 2.4
- Go 1.21 (chaincode)
- CouchDB 3.3 (state DB)

### Infrastructure
- Docker 24+
- Docker Compose 2.20+
- Nginx 1.25+
- IPFS Kubo latest

### Observability
- OpenTelemetry
- Prometheus
- Grafana
- Winston (logging)

### Security
- OpenSSL for TLS
- ECDSA P-256 signatures
- AES-256-GCM encryption
- Helmet.js security headers

---

**Document Version**: 1.0
**Last Updated**: 2024-02-12
**Maintained By**: SME Certificate Platform Team
