# SME Certificate Trust Platform
## Comprehensive Technical Documentation for Master's Thesis
### Methodology and Implementation Chapters

---

> **How to use this document:** Each major section maps directly to a thesis chapter or subsection.
> Passages marked **[FIGURE SUGGESTION]** or **[TABLE SUGGESTION]** indicate where visual elements
> should be inserted. The headings, sub-headings, and numbered lists are already structured for
> direct adaptation into LaTeX or Word chapters.

---

## Table of Contents

1. [System Overview and Problem Statement](#1-system-overview-and-problem-statement)
2. [System Architecture](#2-system-architecture)
3. [Blockchain Layer: Hyperledger Fabric Network Design](#3-blockchain-layer-hyperledger-fabric-network-design)
4. [Smart Contract Design and Implementation](#4-smart-contract-design-and-implementation)
5. [Off-Chain Data Layer: Hybrid Storage Architecture](#5-off-chain-data-layer-hybrid-storage-architecture)
6. [Backend API Layer: NestJS Application](#6-backend-api-layer-nestjs-application)
7. [Frontend Application Layer](#7-frontend-application-layer)
8. [Authentication, Authorization, and Access Control](#8-authentication-authorization-and-access-control)
9. [Certificate Lifecycle: End-to-End Data Flow](#9-certificate-lifecycle-end-to-end-data-flow)
10. [Infrastructure, Containerization, and Deployment](#10-infrastructure-containerization-and-deployment)
11. [Security Design and Hardening Measures](#11-security-design-and-hardening-measures)
12. [Observability: Monitoring, Logging, and Auditing](#12-observability-monitoring-logging-and-auditing)
13. [Development Methodology and Technology Selection](#13-development-methodology-and-technology-selection)
14. [Summary Tables and Figures Reference](#14-summary-tables-and-figures-reference)

---

## 1. System Overview and Problem Statement

### 1.1 Context and Motivation

Small and Medium-sized Enterprises (SMEs) in Egypt operate within an economic environment that increasingly demands verifiable credentials — proof of compliance, professional training, quality certifications, and regulatory approvals. The primary mechanism for issuing and validating such credentials has historically relied on paper-based documents or centrally managed digital files, both of which present significant limitations. Paper certificates are susceptible to forgery, physical degradation, and loss. Centrally managed digital records introduce a single point of trust: if the issuing authority's database is compromised, the integrity of all certificates it has issued becomes suspect.

The SME Certificate Trust Platform was designed to address these limitations by providing a blockchain-based infrastructure that enables trusted authorities to issue tamper-proof digital certificates, allows SMEs to own and share those credentials, and permits any third party to verify a certificate's authenticity without relying on a central authority. The platform achieves this by storing only a cryptographic fingerprint (a SHA-256 hash) of each certificate on-chain, while maintaining encrypted full-content records in a distributed off-chain storage system (IPFS). This design preserves data privacy — no personally identifiable information is written to the blockchain — while retaining the immutability and auditability benefits of distributed ledger technology.

### 1.2 System Objectives

The platform was built to fulfil the following primary objectives:

1. **Trustworthy Issuance**: Only pre-registered, consortium-approved organizations may issue certificates. Each issuance is recorded as a blockchain transaction, endorsed by a majority of participating organizations.
2. **Credential Ownership**: Certificate holders (SME representatives) access their credentials through a personal holder portal and may share access tokens with third parties without surrendering custody.
3. **Instant Verification**: Any party — employer, regulator, auditor — may verify a certificate's authenticity, expiry status, and revocation status in real time, without contacting the issuing organization.
4. **Auditability**: Every action taken on the platform — login, certificate issuance, revocation, verification, administrative changes — is recorded in an immutable audit log at both the blockchain and application database layers.
5. **Multi-tenancy**: Four distinct issuing organizations operate as independent tenants on the platform. Each organization can only manage its own certificates and templates; cross-tenant data isolation is enforced at every layer.

### 1.3 Target User Personas

**[TABLE SUGGESTION: Table 1.1 — User Roles and Responsibilities]**

| Role | Description | Primary Actions |
|---|---|---|
| Consortium Admin | Platform-level administrator managing all organizations | Approve organizations, configure system, access all audit logs |
| Issuer Admin | Organization-level administrator | Create templates, issue certificates, manage operators |
| Issuer Operator | Frontline staff of an issuing organization | Issue individual certificates using approved templates |
| SME User (Holder) | Representative of an SME receiving a certificate | View, share, and manage their own certificates |
| Verifier User | Employer, regulator, or any third party | Verify the authenticity of presented certificates |
| Auditor | Independent oversight role | Read-only access to all certificates and audit trails |
| Platform Admin | System infrastructure administrator | Manage platform-wide configuration and security settings |

---

## 2. System Architecture

### 2.1 Architectural Overview

The platform employs a layered, microservices-inspired architecture organized into four principal tiers:

1. **Presentation Tier**: A React single-page application served via Nginx, providing distinct portal experiences for issuers, holders, and verifiers.
2. **Application Tier**: A NestJS RESTful API that orchestrates all business logic, mediates between the presentation tier and the data tiers, and manages authentication and authorization.
3. **Persistence Tier**: A hybrid storage model combining a PostgreSQL relational database (for off-chain application metadata), an IPFS node (for encrypted certificate content), and the Hyperledger Fabric distributed ledger (for on-chain immutable records).
4. **Blockchain Tier**: A Hyperledger Fabric permissioned blockchain network comprising four peer organizations, three Raft-consensus orderers, and a Go-language smart contract (chaincode).

**[FIGURE SUGGESTION: Figure 2.1 — Four-Tier System Architecture Diagram]**
*(A layered diagram showing: Browser → Nginx (port 80/443) → NestJS API (port 3000) branching to PostgreSQL (port 5432), IPFS (port 5001), and Fabric Network (peer ports 7051–14051). Show bidirectional data flow arrows.)*

### 2.2 Monorepo Project Structure

The system is organized as a monorepo, allowing shared tooling, coordinated versioning, and simplified CI/CD pipelines. The top-level directory structure is as follows:

```
Version 6.0/
├── apps/
│   ├── api/                    # NestJS backend API
│   │   ├── src/
│   │   │   ├── modules/        # Feature modules (auth, certificates, etc.)
│   │   │   ├── common/         # Shared services (Prisma, Fabric connectors)
│   │   │   ├── health.controller.ts
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── prisma/
│   │   │   └── schema.prisma   # Database schema (13 models)
│   │   └── Dockerfile
│   └── web/                    # React frontend SPA
│       ├── src/
│       │   ├── pages/          # Route-level page components
│       │   ├── components/     # Reusable UI components
│       │   ├── layouts/        # Portal layouts
│       │   ├── state/          # Zustand global state
│       │   └── i18n/           # Internationalisation (en/ar)
│       └── Dockerfile
├── blockchain/
│   ├── chaincode/
│   │   └── certificate_contract/
│   │       ├── contract/       # Main chaincode logic (Go)
│   │       ├── internal/
│   │       │   ├── models/     # On-chain data structures
│   │       │   ├── access/     # Role-based access control
│   │       │   └── validators/ # Input validation
│   │       └── cmd/            # CCaaS entry point
│   └── network/
│       ├── config/             # configtx.yaml, crypto-config.yaml
│       ├── docker/             # Per-VM docker-compose files
│       └── scripts/            # Bootstrap, deploy, channel scripts
├── infra/
│   ├── compose/
│   │   └── compose.yaml        # Application stack docker-compose
│   └── nginx/
│       └── conf/               # Nginx reverse-proxy configuration
└── scripts/
    ├── setup_vm.sh             # Full Oracle Linux VM provisioning script
    └── setup_https.sh          # Let's Encrypt TLS automation
```

**[FIGURE SUGGESTION: Figure 2.2 — Monorepo Directory Tree Diagram]**

### 2.3 Technology Stack Summary

**[TABLE SUGGESTION: Table 2.1 — Technology Stack]**

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Blockchain | Hyperledger Fabric | 2.5 | Permissioned distributed ledger |
| Smart Contract | Go | 1.21+ | Chaincode logic |
| Consensus | Raft (etcdraft) | — | Orderer consensus algorithm |
| State Database | CouchDB | 3.3 | Rich queries on ledger state |
| Backend Framework | NestJS | ^10 | REST API and dependency injection |
| Backend Language | TypeScript | ^5 | Type-safe server-side code |
| ORM | Prisma | ^5 | Database schema management |
| Relational DB | PostgreSQL | 16 | Off-chain application data |
| Distributed Storage | IPFS (Kubo) | latest | Encrypted certificate content |
| Frontend Framework | React | ^18 | Single-page application |
| Frontend Language | TypeScript | ^5 | Type-safe client-side code |
| Build Tool | Vite | ^5 | Frontend bundling |
| State Management | Zustand | — | Global auth state |
| Data Fetching | TanStack Query | ^5 | Server state caching |
| CSS Framework | Tailwind CSS | ^3 | Utility-first styling |
| Reverse Proxy | Nginx | alpine | TLS termination, routing |
| Container Runtime | Docker | CE | Service isolation |
| Orchestration | Docker Compose | v2 | Multi-service lifecycle |
| Monitoring | Prometheus + Grafana | latest | Metrics and dashboards |
| Tracing | OpenTelemetry | — | Distributed tracing |
| OS | Oracle Linux | 8/9 | Production server environment |

---

## 3. Blockchain Layer: Hyperledger Fabric Network Design

### 3.1 Network Topology

The Hyperledger Fabric network was designed around four real-world peer organizations that represent the consortium of trusted issuers within the Egyptian SME ecosystem:

- **Org1 (Org1MSP)** — Ministry of Trade and Industry: The primary government authority and consortium leader, responsible for initializing the ledger and granting consortium-level administrative access.
- **Org2 (Org2MSP)** — MSMEDA (Micro, Small and Medium Enterprise Development Agency): The government body responsible for registering and supporting SMEs.
- **Org3 (Org3MSP)** — Accredited Training Providers Consortium: Represents the group of accredited private and public training institutions.
- **Org4 (Org4MSP)** — External Auditors and Certifiers: An independent oversight body providing third-party auditing and certification services.

**[FIGURE SUGGESTION: Figure 3.1 — Fabric Network Topology Diagram]**
*(Show 4 peer organizations, each with 2 peers and 1 CouchDB. Show 3 orderer nodes in a separate cluster. Connect all through the `certificates` channel. Show anchor peers at peer0 of each org.)*

### 3.2 Network Configuration Parameters

The network was configured using the `configtx.yaml` configuration file with the following parameters:

**Orderer Configuration:**
- **Type**: `etcdraft` (Raft consensus)
- **Orderer Nodes**: 3 nodes (`orderer.example.com:7050`, `orderer2.example.com:8050`, `orderer3.example.com:9050`)
- **Batch Timeout**: 2 seconds
- **Maximum Message Count per Block**: 500
- **Absolute Maximum Bytes per Block**: 10 MB
- **Preferred Maximum Bytes per Block**: 2 MB
- **Block Validation Policy**: `ANY Writers`

**Application Channel Configuration:**
- **Channel Name**: `certificates`
- **Channel Profile**: `FourOrgChannel`
- **Bootstrap Method**: `none` (uses Channel Participation API — no system channel genesis block required)
- **Endorsement Policy**: `MAJORITY Endorsement` (requires endorsement from at least 3 of 4 organizations for lifecycle operations; certificate issuance requires `MAJORITY`, i.e., at least 2 of 4)
- **Admin Policy**: `MAJORITY Admins`
- **State Database**: CouchDB (enables rich JSON queries on ledger state)

**[TABLE SUGGESTION: Table 3.1 — Fabric Network Topology Summary]**

| Component | Count | Details |
|---|---|---|
| Peer Organizations | 4 | Org1, Org2, Org3, Org4 |
| Peers per Organization | 2 | peer0 (anchor peer), peer1 |
| Total Peers | 8 | peer0.org1 through peer1.org4 |
| Orderer Nodes | 3 | Raft consensus, majority quorum |
| CouchDB Instances | 8 | One per peer |
| Fabric Version | 2.5 | Supports CCaaS |
| Channels | 1 | `certificates` |

### 3.3 Peer Configuration

Each of the eight peers is configured with the following environment parameters relevant to the platform's operation:

- **TLS Enabled**: All peer-to-peer and peer-orderer communication is secured with mutual TLS (mTLS), using certificates generated by the Fabric CA tooling (`cryptogen`).
- **Chaincode as a Service (CCaaS)**: Peers are configured with `CORE_CHAINCODE_EXECUTETIMEOUT=300s` and `CHAINCODE_AS_A_SERVICE_BUILDER_CONFIG` pointing to a named service. This deployment mode runs the chaincode as an external service, decoupling chaincode lifecycle from peer restarts.
- **Gossip Protocol**: Each org configures `CORE_PEER_GOSSIP_BOOTSTRAP` to point to the sibling peer, enabling inter-peer state synchronization within an organization.
- **Operations API**: Each peer exposes an operations endpoint (`CORE_OPERATIONS_LISTENADDRESS`) for Prometheus metrics scraping.

**[TABLE SUGGESTION: Table 3.2 — Peer Port Assignments]**

| Peer | Listening Port | Chaincode Port | Operations Port |
|---|---|---|---|
| peer0.org1 | 7051 | 7052 | 9446 |
| peer1.org1 | 8051 | 8052 | 9447 |
| peer0.org2 | 9051 | 9052 | 9448 |
| peer1.org2 | 10051 | 10052 | 9449 |
| peer0.org3 | 11051 | 11052 | 9450 |
| peer1.org3 | 12051 | 12052 | 9451 |
| peer0.org4 | 13051 | 13052 | 9452 |
| peer1.org4 | 14051 | 14052 | 9453 |

### 3.4 Cryptographic Material Generation

Cryptographic material was generated using the Hyperledger Fabric `cryptogen` tool, driven by the `crypto-config.yaml` specification file. The specification defines the following for each organization:

- **EnableNodeOUs**: Set to `true` for all organizations. This activates Node Organizational Units (NodeOUs), enabling the MSP to distinguish between peer certificates and client certificates using OUs (`peer`, `client`, `admin`, `orderer`), which is a prerequisite for fine-grained attribute-based access control at the chaincode level.
- **Peer Count**: 2 peers per organization (using the `Template.Count: 2` directive).
- **User Count**: 3 cryptographic identities per organization (Admin + 2 additional users).
- **Subject Alternative Names (SANs)**: `localhost` and `127.0.0.1` are included in peer SANs to support both local development and Docker networking modes.
- **Orderer Organization**: A single orderer organization with 3 orderer node certificates, each with localhost and domain SANs.

The generated material includes: Root CA certificates, TLS CA certificates, Admin certificates and keys, Peer certificates and keys, and Orderer certificates and keys — all organized in the `crypto-config/` directory tree.

### 3.5 Raft Consensus Mechanism

The platform uses the Raft consensus algorithm for ordering service fault tolerance. The Raft implementation in Hyperledger Fabric (etcdraft) provides the following properties relevant to this platform:

- **Crash Fault Tolerance (CFT)**: With 3 orderer nodes, the network tolerates the failure of up to 1 orderer node while maintaining liveness and safety (following the Raft quorum rule: `⌊n/2⌋ + 1 = 2` nodes must be available).
- **Leader Election**: One orderer is elected as the leader and receives all transaction proposals. The leader appends entries to its log and replicates them to followers before committing a block.
- **Deterministic Timestamps**: Because block commit order is deterministic in Raft, and because the platform's chaincode uses `ctx.GetStub().GetTxTimestamp()` (rather than `time.Now()`) for all record timestamps, ledger state remains consistent across all peers.

### 3.6 Network Bootstrap Process

The network was bootstrapped through a sequence of scripted operations:

1. **Cryptographic Material Generation** (`generate_crypto.sh`): Invokes `cryptogen generate` with the `crypto-config.yaml` specification.
2. **Channel Artifacts Generation** (`generate_artifacts.sh`): Invokes `configtxgen` to produce the channel genesis block (`genesis.block`) from the `FourOrgChannel` profile in `configtx.yaml`.
3. **Network Start** (`docker compose up`): Brings up all 8 peers, 8 CouchDB instances, and 3 orderer containers.
4. **Channel Creation** (`create_channel.sh`): Uses `osnadmin channel join` to add each orderer to the channel without requiring a system channel. Then calls `peer channel join` for all 8 peers.
5. **Anchor Peer Update**: Sets `peer0` as the anchor peer for each organization, enabling cross-organization gossip discovery.
6. **Chaincode Deployment** (`deploy_chaincode_ccaas.sh`): Packages the chaincode, installs it on all 8 peers, approves the chaincode definition by all 4 organizations (satisfying the MAJORITY lifecycle policy), and commits the definition to the channel.
7. **Ledger Initialization**: Calls `InitLedger` from the CLI with a 3-organization endorsement to bootstrap the default issuer record on-chain.
8. **Connection Profile Generation** (`generate_connection_profiles.sh`): Produces JSON connection profiles for each organization, consumed by the NestJS API's Fabric connector.
9. **Admin Enrollment** (`enroll_admin.sh`): Registers admin identities in the local wallet for use by the API.

---

## 4. Smart Contract Design and Implementation

### 4.1 Overview

The smart contract (chaincode) was written in Go (version 1.21+) using the official Hyperledger Fabric contract API (`fabric-contract-api-go` v2). The codebase is organized into four packages: `contract` (main logic), `models` (data structures), `access` (role-based access control), and `validators` (input validation). The chaincode is deployed in Chaincode as a Service (CCaaS) mode, running as an independent Docker service that peers connect to via gRPC.

The module path is `github.com/sme-cert-platform/certificate-contract`. The entry point for CCaaS mode is `cmd/main.go`, which initializes the Fabric shim server and exposes the contract over gRPC.

### 4.2 On-Chain Data Models

The chaincode maintains three document types in the CouchDB world state, each prefixed with a composite key for efficient range queries:

**[TABLE SUGGESTION: Table 4.1 — On-Chain Data Models]**

#### Certificate Record (`CERT:{certID}`)

| Field | Type | Description |
|---|---|---|
| `cert_id` | string | Globally unique UUID identifier |
| `issuer_org_id` | string | MSP-derived organization identifier |
| `issuer_public_key_id` | string | Key ID of the signing public key |
| `holder_id` | string | Pseudonymous holder identifier |
| `issued_at` | RFC3339 | Certificate issuance timestamp |
| `expires_at` | RFC3339 | Certificate expiry timestamp |
| `cert_hash` | string | SHA-256 hash of the full certificate content |
| `content_pointer` | string | IPFS CID or object storage key for off-chain content |
| `status` | enum | `ACTIVE` or `REVOKED` |
| `revocation_reason` | string | Reason code (set on revocation) |
| `revoked_at` | RFC3339 | Revocation timestamp (optional) |
| `schema_id` | string | Template ID this certificate was issued against |
| `template_version` | string | Template version string |
| `tx_id` | string | Fabric transaction ID of the issuance transaction |
| `block_time` | RFC3339 | Block commit timestamp from the orderer |
| `doc_type` | string | Fixed value `"certificate"` (for CouchDB queries) |

#### Issuer Record (`ISSUER:{issuerOrgID}`)

| Field | Type | Description |
|---|---|---|
| `issuer_org_id` | string | Organization identifier (e.g., `org1`) |
| `display_name` | string | Human-readable organization name |
| `public_key_set` | map[string]string | Map of key ID to PEM-encoded public key |
| `roles` | []string | Issuer capability roles |
| `active` | bool | Whether the issuer is authorized to issue |
| `registered_at` | RFC3339 | Registration timestamp |
| `registered_by` | string | Identity that registered this issuer |
| `contact_email` | string | Administrative contact email |
| `contact_person` | string | Administrative contact person name |
| `doc_type` | string | Fixed value `"issuer"` |

#### Template Record (`TEMPLATE:{templateID}:{version}`)

| Field | Type | Description |
|---|---|---|
| `template_id` | string | Template business identifier |
| `version` | string | Semantic version string |
| `display_name` | string | Human-readable template name |
| `description` | string | Template description |
| `json_schema` | JSON object | JSON Schema for certificate data validation |
| `ui_schema` | JSON object | UI Schema for form rendering |
| `required_claims` | []string | Mandatory claims for this certificate type |
| `issuer_constraints` | []string | Org IDs allowed to use this template |
| `active` | bool | Whether the template is available for use |
| `created_at` | RFC3339 | Creation timestamp |
| `created_by` | string | Identity that created the template |
| `validity_days_default` | int | Default certificate validity period in days |
| `category` | string | Template category (e.g., training, compliance) |
| `doc_type` | string | Fixed value `"template"` |

### 4.3 Chaincode Functions

The `CertificateContract` struct exposes the following transaction functions:

**[TABLE SUGGESTION: Table 4.2 — Smart Contract Functions]**

| Function | Type | Caller Role Required | Description |
|---|---|---|---|
| `InitLedger` | Invoke | Org1MSP admin or consortium_admin | Bootstraps default issuer record; uses transaction timestamp for determinism |
| `RegisterIssuer` | Invoke | consortium_admin | Creates a new authorized issuer record; validates email, org ID, and PEM public keys |
| `GetIssuer` | Query | Any | Retrieves issuer record by org ID |
| `CreateTemplate` | Invoke | issuer_admin or consortium_admin | Creates a new versioned certificate template; validates JSON Schema and UI Schema |
| `GetTemplate` | Query | Any | Retrieves template by ID and version |
| `IssueCertificate` | Invoke | issuer_admin or issuer_operator | Records a new certificate on-chain; verifies template is active, issuer is active, and timestamps are valid |
| `GetCertificateRecord` | Query | Authorized roles | Retrieves a certificate record; enforces read access policy |
| `VerifyCertificateRecord` | Query | Any (via Evaluate) | Returns a structured verification result including revocation status, expiry, and optional hash match |
| `RevokeCertificate` | Invoke | issuer_admin/operator of same org | Marks a certificate as revoked; only the issuing organization may revoke |
| `ListCertificatesByHolder` | Query | Any | Paginated CouchDB rich query by holder ID |
| `ListCertificatesByIssuer` | Query | issuer role for org or admin/auditor | Paginated CouchDB rich query by issuer org ID |
| `GetCertificateHistory` | Query | Authorized roles | Returns the full transaction history for a certificate (all state transitions) |

### 4.4 Access Control Design

The chaincode implements a custom role-based access control (RBAC) system through the `access` package. Roles are embedded as X.509 certificate attributes, issued by the Fabric CA. The `AccessControl` struct wraps the Fabric client identity interface (`cid.ClientIdentity`) and provides the following role constants:

- `consortium_admin` — Platform-wide super-administrator
- `issuer_admin` — Organization-level certificate authority administrator
- `issuer_operator` — Operational certificate issuance role
- `sme_user` — Certificate holder (SME representative)
- `verifier` — Third-party certificate verifier
- `auditor` — Read-only oversight role

**Key access control rules enforced at the chaincode level:**

1. **Ledger Initialization**: Only `Org1MSP` admin or a `consortium_admin` may call `InitLedger`.
2. **Issuer Registration**: Only `consortium_admin` may call `RegisterIssuer`. This ensures organizational onboarding is gated by the consortium leader.
3. **Template Creation**: Only `issuer_admin` or `consortium_admin` may create templates.
4. **Certificate Issuance**: Only `issuer_admin` or `issuer_operator` may issue certificates. Furthermore, at the time of issuance, the issuer's organizational identity (`GetOrgID()`) is extracted from the calling certificate and cross-checked against the issuer registry to confirm the organization is both registered and active.
5. **Certificate Revocation**: Only the `issuer_admin` or `issuer_operator` belonging to the **same organization that issued the certificate** may revoke it. This is enforced by `RequireIssuerForOrg(cert.IssuerOrgID)`.
6. **Certificate Read Access**: Consortium admins and auditors may read all certificates. Issuers may read certificates they issued. Holders may read their own certificates. Verifiers may read basic certificate information for verification purposes.

The `GetOrgID()` method first checks for an `org_id` X.509 attribute, then falls back to deriving the org ID from the MSP ID by stripping the `MSP` suffix and lowercasing the result (e.g., `Org1MSP` → `org1`).

**[FIGURE SUGGESTION: Figure 4.1 — Chaincode Access Control Matrix]**
*(A matrix diagram showing which roles can call which functions. Rows = functions, Columns = roles. Cells = allowed/denied.)*

### 4.5 Event Emission

The chaincode emits the following Fabric events upon state-changing transactions, enabling off-chain systems to listen and react asynchronously:

| Event Name | Triggered By | Payload Fields |
|---|---|---|
| `IssuerRegistered` | `RegisterIssuer` | `event_type`, `issuer_org_id`, `display_name` |
| `CertificateIssued` | `IssueCertificate` | `cert_id`, `issuer_org_id`, `holder_id`, `issued_at`, `expires_at`, `template_id` |
| `CertificateRevoked` | `RevokeCertificate` | `cert_id`, `issuer_org_id`, `revoked_at`, `revocation_reason`, `revoked_by` |

### 4.6 Input Validation

A dedicated `validators` package provides the following validation functions called prior to all state writes:

- `ValidateOrgID` — Enforces alphanumeric org ID format
- `ValidateEmail` — RFC 5322-compliant email format
- `ValidateHash` — Validates hex-encoded SHA-256 hash (64 characters)
- `ValidateContentPointer` — Accepts `ipfs://`, `hash://`, or `https://` prefixed URIs
- `ValidateCertID` — UUID format validation
- `ValidateTemplateID` — Alphanumeric with hyphens and underscores
- `ValidateVersion` — Semantic version format
- `ValidateTimeRange` — Ensures `expires_at` is strictly after `issued_at`
- `ValidateRevocationReason` — Validates reason codes against an allowed set
- `ValidatePublicKey` — Validates PEM-encoded public key format
- `ValidateNonEmpty` — Generic non-empty string check

---

## 5. Off-Chain Data Layer: Hybrid Storage Architecture

### 5.1 Design Rationale

Storing certificate content directly on the blockchain ledger would violate data privacy requirements, impose significant storage costs, and degrade query performance. The platform therefore employs a hybrid storage model:

- **On-chain (Hyperledger Fabric + CouchDB)**: Stores only the certificate's SHA-256 hash (`cert_hash`), a pointer to off-chain content (`content_pointer`), issuer identity, holder identity (pseudonymous), timestamps, and status. No personally identifiable information is written to the ledger.
- **Off-chain (IPFS)**: Stores the encrypted full certificate content. The `content_pointer` field in the on-chain record contains the IPFS Content Identifier (CID), providing a cryptographically verifiable link between the on-chain anchor and the off-chain content.
- **Off-chain (PostgreSQL)**: Stores application metadata including user accounts, organization profiles, certificate management records (mirrored from blockchain for query performance), audit logs, access grants, and session data.

**[FIGURE SUGGESTION: Figure 5.1 — Hybrid Storage Architecture Diagram]**
*(Show a certificate being split: hash → Fabric ledger, encrypted content → IPFS, metadata → PostgreSQL. Draw arrows from PostgreSQL `content_pointer` field to IPFS CID and from PostgreSQL `cert_hash` to on-chain record.)*

### 5.2 PostgreSQL Database Schema

The application database is managed by Prisma ORM and contains 13 models:

**[TABLE SUGGESTION: Table 5.1 — PostgreSQL Database Models]**

| Model | Table | Primary Purpose | Key Fields |
|---|---|---|---|
| `User` | `users` | Authentication and identity | `email`, `passwordHash`, `role`, `status`, `organizationId` |
| `Organization` | `organizations` | Issuer tenant profiles | `orgId`, `mspId`, `registrationStatus`, `active` |
| `Session` | `sessions` | JWT session management | `userId`, `token`, `refreshToken`, `expiresAt` |
| `Template` | `templates` | Off-chain template metadata | `templateId`, `version`, `jsonSchema`, `organizationId` |
| `Certificate` | `certificates` | Certificate application records | `certId`, `certHash`, `contentPointer`, `status`, `organizationId` |
| `AccessGrant` | `access_grants` | Controlled sharing tokens | `certificateId`, `token`, `scope`, `expiresAt`, `pin` |
| `Verification` | `verifications` | Verification event log | `certificateId`, `status`, `hashVerified`, `evidenceData` |
| `AuditLog` | `audit_logs` | Application-level audit trail | `action`, `userId`, `resourceType`, `details`, `timestamp` |
| `SystemConfig` | `system_config` | Runtime configuration | `key`, `value`, `category`, `encrypted` |
| `EncryptionKey` | `encryption_keys` | Key management records | `keyId`, `purpose`, `algorithm`, `encryptedKey` |
| `DailyMetrics` | `daily_metrics` | Aggregated analytics | `date`, `certificatesIssued`, `verificationsPerformed` |
| `ContactSubmission` | `contact_submissions` | Contact form records | `name`, `email`, `message`, `ipAddress` |

**User Roles (PostgreSQL Enum):**
`PLATFORM_ADMIN`, `CONSORTIUM_ADMIN`, `ISSUER_ADMIN`, `ISSUER_OPERATOR`, `SME_USER`, `VERIFIER_USER`, `AUDITOR_USER`

**Certificate Status (PostgreSQL Enum):**
`DRAFT`, `PENDING_SIGNATURE`, `ISSUED`, `REVOKED`, `EXPIRED`

**Audit Actions (PostgreSQL Enum):**
`USER_LOGIN`, `USER_LOGOUT`, `USER_CREATED`, `USER_UPDATED`, `USER_DELETED`, `TEMPLATE_CREATED`, `TEMPLATE_UPDATED`, `TEMPLATE_PUBLISHED`, `CERTIFICATE_DRAFTED`, `CERTIFICATE_ISSUED`, `CERTIFICATE_REVOKED`, `CERTIFICATE_VERIFIED`, `ACCESS_GRANT_CREATED`, `ACCESS_GRANT_REVOKED`, `ENCRYPTION_KEY_ROTATED`, `CONFIG_CHANGED`, `SECURITY_VIOLATION`

### 5.3 Data Indexing

The PostgreSQL schema includes the following database indexes to support efficient query patterns:

| Table | Index Columns | Query Pattern Supported |
|---|---|---|
| `certificates` | `holder_email` | Certificate lookup by holder |
| `certificates` | `organization_id` | Tenant-scoped certificate lists |
| `certificates` | `status` | Active/revoked certificate filtering |
| `certificates` | `issued_at` | Chronological ordering |
| `audit_logs` | `user_id` | Per-user audit trail queries |
| `audit_logs` | `action` | Action-type filtering |
| `audit_logs` | `timestamp` | Chronological log queries |
| `verifications` | `certificate_id` | Per-certificate verification history |
| `verifications` | `verified_at` | Time-range verification queries |
| `contact_submissions` | `created_at` | Chronological submission queries |

---

## 6. Backend API Layer: NestJS Application

### 6.1 Framework and Architecture

The backend API is built with NestJS, a TypeScript-based Node.js framework that enforces a modular, opinionated architecture inspired by Angular. NestJS uses decorators and dependency injection to organize code into modules, controllers, and services. The application is configured with:

- **Global API Prefix**: All routes are prefixed with `/api` (`app.setGlobalPrefix('api')`).
- **URI Versioning**: Routes are versioned by URI path (`/api/v1/...`), with a default version of `1` (`VersioningType.URI`, `defaultVersion: '1'`).
- **Global Validation Pipe**: All incoming request bodies are automatically validated and sanitized using the `class-validator` decorators, with `whitelist: true` (strips unknown properties) and `forbidNonWhitelisted: true` (rejects requests with extra properties).
- **Compression**: HTTP response compression is enabled via the `compression` middleware.
- **Security Headers**: The `helmet` middleware is applied globally, setting `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, and other security headers.

### 6.2 Module Structure

The application is decomposed into the following NestJS modules:

**[TABLE SUGGESTION: Table 6.1 — NestJS Application Modules]**

| Module | Path | Dependencies | Description |
|---|---|---|---|
| `PrismaModule` | `common/prisma` | — | Provides the Prisma database client as a global singleton |
| `FabricModule` | `common/fabric` | ConfigModule | Manages the Fabric Gateway connection and exposes `FabricService` |
| `AuthModule` | `modules/auth` | PrismaModule, JwtModule | JWT authentication, session management, bcrypt password handling |
| `UsersModule` | `modules/users` | PrismaModule | User profile management |
| `TemplatesModule` | `modules/templates` | PrismaModule, FabricModule | Certificate template CRUD |
| `CertificatesModule` | `modules/certificates` | PrismaModule, FabricModule | Certificate issuance, verification, revocation |
| `OrganizationsModule` | `modules/organizations` | PrismaModule, FabricModule | Organization registration and admin approval workflow |
| `ContactModule` | `modules/contact` | PrismaModule, ConfigModule | Contact form submission with SMTP email forwarding |
| `StorageModule` | `modules/storage` | — | IPFS integration for off-chain content |
| `WalletModule` | `modules/wallet` | — | Fabric wallet and key management |
| `AuditModule` | `modules/audit` | PrismaModule | Audit log query endpoints |
| `MetricsModule` | `modules/metrics` | PrismaModule | Analytics and daily metrics |
| `AppModule` | — | All above | Root module; configures Throttler (rate limiting), Schedule, Config |

### 6.3 API Endpoint Reference

All endpoints are prefixed with `/api/v1/`.

**[TABLE SUGGESTION: Table 6.2 — API Endpoint Reference]**

**Authentication** (`/api/v1/auth/`):

| Method | Path | Auth Required | Description |
|---|---|---|---|
| POST | `/api/v1/auth/login` | No | Authenticates with email/password, returns JWT access + refresh tokens and user profile |
| POST | `/api/v1/auth/register` | No | Creates a new user account, immediately logs in and returns tokens |
| POST | `/api/v1/auth/logout` | Yes (JWT) | Invalidates the current session token |

**Certificates** (`/api/v1/certificates/`):

| Method | Path | Auth Required | Description |
|---|---|---|---|
| POST | `/api/v1/certificates` | Yes | Issues a new certificate; resolves template, generates UUID cert ID and SHA-256 hash, saves to DB, then records on blockchain (best-effort) |
| GET | `/api/v1/certificates/stats` | Yes | Returns issuer statistics scoped to the caller's organization |
| GET | `/api/v1/certificates/recent` | Yes | Returns recent certificates scoped to the caller's organization |
| GET | `/api/v1/certificates/holder` | Yes | Returns all certificates for the authenticated holder's email |
| GET | `/api/v1/certificates/verify-by-hash/:hash` | No | Public endpoint: verifies a certificate by document hash |
| GET | `/api/v1/certificates/:id` | No | Retrieves a certificate by database ID or cert ID |
| GET | `/api/v1/certificates/:id/verify` | No | Public endpoint: full verification against blockchain |
| POST | `/api/v1/certificates/:id/revoke` | Yes | Revokes a certificate; enforces org-scoped ownership check |

**Organizations** (`/api/v1/organizations/`):

| Method | Path | Auth Required | Description |
|---|---|---|---|
| POST | `/api/v1/organizations/register` | No | Submits a new organization registration (status: PENDING) |
| GET | `/api/v1/organizations/pending` | Yes (Admin) | Lists organizations awaiting approval |
| GET | `/api/v1/organizations` | Yes (Admin) | Lists all organizations |
| PATCH | `/api/v1/organizations/:id/approve` | Yes (Admin) | Approves a pending organization; activates users, registers on blockchain |
| PATCH | `/api/v1/organizations/:id/reject` | Yes (Admin) | Rejects a pending organization with reason |

**Contact** (`/api/v1/contact/`):

| Method | Path | Auth Required | Description |
|---|---|---|---|
| POST | `/api/v1/contact` | No | Saves contact submission to DB; optionally sends SMTP email if configured |

**Audit** (`/api/v1/audit/`):

| Method | Path | Auth Required | Description |
|---|---|---|---|
| GET | `/api/v1/audit` | Yes | Paginated audit log query with filtering by action and user |

**Health** (`/api/health`):

| Method | Path | Auth Required | Description |
|---|---|---|---|
| GET | `/api/health` | No | Returns `{ status: "ok" }` for liveness checks |

### 6.4 Fabric Service Integration

The `FabricService` (`common/fabric/fabric.service.ts`) implements the Fabric Gateway connection using the official `fabric-network` SDK. Key design decisions:

1. **Graceful Degradation**: The service connects to Fabric on module initialization (`onModuleInit`). If the connection fails (e.g., blockchain not running in development), a warning is logged and the service continues operating. Blockchain operations then fail gracefully with warnings rather than crashing the API.
2. **Connection Profile**: The service reads a JSON connection profile from the configured path (`FABRIC_CONNECTION_PROFILE_PATH`), which includes peer endpoints, TLS CA certificates, and orderer information.
3. **Wallet**: A file-system wallet at `FABRIC_WALLET_PATH` stores the admin identity used for submitting transactions. The `enroll_admin.sh` script populates this wallet.
4. **Discovery**: Service discovery is enabled (`discovery: { enabled: true, asLocalhost: false }`), allowing the SDK to discover peers dynamically from the connection profile.

The `FabricService` exposes the following methods directly corresponding to chaincode functions:

```
issueCertificate(...)         → calls IssueCertificate
getCertificateRecord(...)     → calls GetCertificateRecord
verifyCertificateRecord(...)  → calls VerifyCertificateRecord
revokeCertificate(...)        → calls RevokeCertificate
listCertificatesByHolder(...) → calls ListCertificatesByHolder
listCertificatesByIssuer(...) → calls ListCertificatesByIssuer
getCertificateHistory(...)    → calls GetCertificateHistory
registerIssuer(...)           → calls RegisterIssuer
getIssuer(...)                → calls GetIssuer
createTemplate(...)           → calls CreateTemplate
getTemplate(...)              → calls GetTemplate
```

### 6.5 Certificate Issuance Logic

When a certificate issuance request arrives at `POST /api/v1/certificates`, the `CertificatesService` executes the following sequence:

1. **Input Validation**: Checks that `templateId`, `holderEmail`, and `holderName` are present.
2. **Template Resolution**: Attempts to find the template by database primary key (UUID) first, then by business template ID.
3. **Organization Resolution**: Uses the `req.user.organizationId` from the JWT to scope the certificate to the authenticated issuer's organization.
4. **Issuer Resolution**: Uses the `req.user.id` (user database ID) as the issuer.
5. **Hash Computation**: Generates a UUIDv4 as the `certId`. Computes a SHA-256 hash over the serialized certificate claims plus the `certId` and the current timestamp.
6. **Database Record Creation**: Persists the full certificate record to PostgreSQL, including all metadata, with status `ISSUED`.
7. **Blockchain Recording (best-effort)**: Submits the `IssueCertificate` transaction to the Fabric network. If this fails (e.g., network is temporarily unavailable), the failure is logged as a warning but does not roll back the database record. A reconciliation mechanism can re-submit pending on-chain records.
8. **Audit Logging**: Creates an `CERTIFICATE_ISSUED` audit log entry.

### 6.6 Tenant Isolation (Multi-Tenancy)

The platform implements tenant isolation at the database query layer. The JWT token issued at login contains the `organizationId` claim, derived from the user's `organizationId` database column. At the API layer:

- `getIssuerStats(organizationId)` filters all certificate counts by `WHERE organization_id = $1`.
- `getRecent(organizationId)` filters all recent certificate queries by `WHERE organization_id = $1`.
- `revoke(id, reason, userId, organizationId)` verifies that `cert.organizationId === organizationId` before permitting the revocation.

This ensures that no issuer can access or modify another organization's data, even if they share the same database instance.

### 6.7 Configuration and Environment Variables

The application validates all environment variables at startup using the Joi schema defined in `app.module.ts`. Required variables include:

| Variable | Type | Description |
|---|---|---|
| `DATABASE_URL` | Required | PostgreSQL connection string |
| `JWT_SECRET` | Required | Secret for JWT signing (48+ random bytes recommended) |
| `MASTER_ENCRYPTION_KEY` | Required | Master key for certificate payload encryption |
| `FABRIC_CONNECTION_PROFILE_PATH` | Default | Path to Fabric connection profile JSON |
| `FABRIC_WALLET_PATH` | Default | Path to Fabric file-system wallet |
| `FABRIC_CHANNEL_NAME` | Default: `certificates` | Fabric channel name |
| `FABRIC_CHAINCODE_NAME` | Default: `certificate_contract` | Chaincode name |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | Optional | SMTP server for contact emails |
| `CORS_ORIGIN` | Default: `http://localhost:5173` | Allowed CORS origin |

---

## 7. Frontend Application Layer

### 7.1 Architecture and Technology

The frontend is a React 18 single-page application (SPA) built with Vite as the build tool and TypeScript as the development language. The application uses:

- **React Router v6**: For client-side routing with nested route layouts.
- **TanStack Query v5**: For server state caching, background re-fetching, and request deduplication. Configured with 5-minute stale time and 1 automatic retry.
- **Zustand**: Lightweight global state manager for authentication state (`isAuthenticated`, `user`, `accessToken`).
- **Tailwind CSS v3**: Utility-first CSS framework with custom design tokens for the platform's color scheme (Egypt navy, gold, green).
- **Lucide React**: Icon library for UI icons.
- **i18next**: Internationalisation framework supporting English and Arabic, with RTL layout support for Arabic.

### 7.2 Route Structure and Portal Organization

The application organizes routes into four distinct portal experiences, each with its own layout component:

**[TABLE SUGGESTION: Table 7.1 — Frontend Route Structure]**

**Public Routes** (accessible without authentication, wrapped in `PublicLayout`):

| Path | Component | Description |
|---|---|---|
| `/` | `LandingPage` | Platform hero, value propositions, feature showcases |
| `/login` | `LoginPage` | Email/password authentication form |
| `/register` | `RegisterPage` | Account registration with role selection |
| `/verify` | `VerifyPage` | Public certificate verification by ID or document hash |
| `/verify/:certId` | `VerifyPage` | Direct link certificate verification |
| `/why-blockchain` | `WhyBlockchainPage` | Educational content on blockchain benefits |
| `/how-it-works` | `HowItWorksPage` | Platform workflow explanation |
| `/docs` | `DocumentationPage` | Technical documentation |
| `/pricing` | `PricingPage` | Subscription tiers and feature comparison |
| `/deployment` | `DeploymentPage` | Infrastructure and deployment guide |
| `/about` | `AboutPage` | Platform and team information |
| `/contact` | `ContactPage` | Contact form (real SMTP or DB persistence) |
| `/onboarding` | `OnboardingPage` | Organization onboarding wizard |
| `/blockchain` | `BlockchainExplorerPage` | Public blockchain explorer interface |

**Issuer Portal** (requires `ISSUER_ADMIN` role, wrapped in `IssuerLayout`):

| Path | Component | Description |
|---|---|---|
| `/issuer` | `IssuerDashboard` | Statistics, quick actions, plan usage, audit log summary |
| `/issuer/templates` | `TemplateBuilder` | Create and manage certificate templates |
| `/issuer/issue` | `IssueCertificate` | Individual certificate issuance form |
| `/issuer/bulk-issue` | `BulkIssue` | Batch certificate issuance via CSV |
| `/issuer/revoke` | `RevocationManagement` | Search and revoke issued certificates |

**Holder Portal** (requires `SME_USER` role, wrapped in `HolderLayout`):

| Path | Component | Description |
|---|---|---|
| `/holder` | `HolderDashboard` | Wallet view, certificate list |
| `/holder/certificate/:certId` | `CertificateDetails` | Full certificate details and metadata |
| `/holder/share` | `ShareCenter` | Generate and manage access grant tokens |
| `/holder/wallet` | `WalletSettings` | Identity and key management settings |

**Verifier Portal** (requires `VERIFIER_USER` role, wrapped in `VerifierLayout`):

| Path | Component | Description |
|---|---|---|
| `/verifier` | `VerifierDashboard` | Certificate verification tools |
| `/verifier/history` | `VerificationHistory` | History of performed verifications |

### 7.3 Authentication Flow in the Frontend

Route protection is implemented using a `ProtectedRoute` component that reads from the Zustand auth store. If the user is not authenticated (`isAuthenticated === false`), the component redirects to `/login`. If the user is authenticated but has the wrong role (`user.role !== requiredRole`), they are redirected to the home page. This provides a clean client-side enforcement layer, backed by JWT validation on every API call.

Upon a successful login response from the API, the Zustand store is populated with the user profile and access token. TanStack Query is configured to invalidate and re-fetch queries on window focus is disabled (`refetchOnWindowFocus: false`) to avoid unnecessary API calls.

### 7.4 Blockchain Verification Visualizer

The `VerifyPage` features a `BlockchainVerificationVisualizer` component that provides a step-by-step animated visualization of the verification process:

1. **Hash Computation**: Shows the SHA-256 computation over the presented certificate.
2. **Database Lookup**: Shows the query to the PostgreSQL metadata store.
3. **Blockchain Query**: Shows the query to the Fabric ledger.
4. **Signature Check**: Shows the cryptographic signature verification.
5. **Result**: Displays the final verification status with a colour-coded indicator.

This component serves both a functional and educational purpose, making the blockchain verification process transparent and understandable to non-technical users.

### 7.5 Issuer Dashboard

The Issuer Dashboard presents real-time operational metrics and management tools:

- **Statistics Cards**: Total certificates issued, active certificates, revoked certificates, expiring within 30 days — each with trend indicators (up/down arrows with colour coding).
- **Quick Action Buttons**: Direct navigation to Templates, Bulk Issue, Revoke, and Issue Certificate.
- **Plan & Usage Card**: An animated gradient progress bar showing certificate usage against the plan limit, with colour transitions (gold→green below 70%, amber at 70–90%, red above 90%).
- **Audit Log Summary**: The five most recent certificate events, derived from the recent certificates list, with action type icons and relative timestamps.

### 7.6 Contact Form Integration

The `ContactPage` submits form data to `POST /api/v1/contact` using the Fetch API. The submission includes the submitter's name, email, organization (optional), interest category, and message. Error states are displayed inline with an `AlertCircle` icon. On success, a confirmation panel replaces the form. The backend persists all submissions to the `contact_submissions` table and, if SMTP is configured, sends a formatted HTML email to the platform's contact address.

---

## 8. Authentication, Authorization, and Access Control

### 8.1 Application-Layer Authentication

The platform uses JWT (JSON Web Token) Bearer authentication at the application layer. The JWT is signed using HMAC-SHA256 (`HS256`) with the `JWT_SECRET` environment variable. The token payload includes:

```json
{
  "sub": "<user UUID>",
  "email": "<user email>",
  "role": "<UserRole enum>",
  "organizationId": "<organization UUID>"
}
```

The `JwtStrategy` (Passport.js strategy in NestJS) validates the Bearer token on every protected request and populates `req.user` with the decoded payload: `{ id, email, role, organizationId }`.

Session management is dual-layered: the JWT provides stateless authentication for API calls, while a `Session` record in the database allows explicit session invalidation (logout). The access token has a configurable expiry (`JWT_EXPIRES_IN`, default 1 hour). A refresh token with a 7-day expiry is also issued and stored in the `sessions` table.

### 8.2 Password Security

User passwords are hashed using `bcrypt` with a work factor of 12 rounds (`bcrypt.hash(password, 12)`). This choice balances security (resistance to brute-force attacks) with performance (hashing time of ~300–500ms on modern hardware). Passwords are never stored in plaintext or recoverable form.

### 8.3 Blockchain-Layer Access Control

At the Hyperledger Fabric layer, access control is enforced by the chaincode's `access` package as described in Section 4.4. The Fabric Membership Service Provider (MSP) issues X.509 certificates to all participants. Roles (`consortium_admin`, `issuer_admin`, etc.) are embedded as custom X.509 attributes in these certificates.

Because the API uses a single admin wallet identity for all Fabric interactions, the application-layer role from the JWT is used to gate which Fabric operations the API will even attempt. For example, only users with `ISSUER_ADMIN` or `ISSUER_OPERATOR` roles in the JWT can reach the `POST /api/v1/certificates` endpoint, which then submits the `IssueCertificate` transaction to Fabric using the admin wallet. The chaincode's own access control provides an additional defense-in-depth layer.

### 8.4 Multi-Tenant Authorization

Tenant isolation is enforced at three independent layers:

1. **JWT Payload**: The `organizationId` is embedded in the JWT at login and cannot be changed without re-authentication.
2. **Database Queries**: All queries that should be tenant-scoped include a `WHERE organization_id = $1` clause, using the `organizationId` from `req.user`.
3. **Blockchain**: The chaincode's `RequireIssuerForOrg` function ensures that revocations can only be performed by the same organization that issued the certificate.

**[FIGURE SUGGESTION: Figure 8.1 — Multi-Layer Authorization Architecture]**
*(Show the three layers: JWT validation → DB query scoping → Chaincode access control, with example certificate revoke request flowing through all three.)*

---

## 9. Certificate Lifecycle: End-to-End Data Flow

### 9.1 Certificate Issuance Flow

**[FIGURE SUGGESTION: Figure 9.1 — Certificate Issuance Sequence Diagram]**

The following sequence describes the complete end-to-end flow for issuing a certificate:

**Step 1 — User Authentication**
The issuer authenticates via `POST /api/v1/auth/login`. The API validates credentials against the PostgreSQL `users` table using bcrypt, creates a session record, writes an `USER_LOGIN` audit log, and returns a signed JWT containing `{ sub, email, role: "ISSUER_ADMIN", organizationId }`.

**Step 2 — Template Selection**
The issuer navigates to the Issue Certificate page. The frontend calls `GET /api/v1/templates` to retrieve available templates. The API returns templates filtered to the issuer's organization.

**Step 3 — Certificate Data Entry**
The issuer fills in the holder's email, holder's name, and certificate-specific claims. For document-backed certificates, the document is hashed client-side (SHA-256 via the Web Crypto API) before upload.

**Step 4 — Submission**
The frontend submits `POST /api/v1/certificates` with:
```json
{
  "templateId": "<UUID>",
  "holderEmail": "holder@sme.com",
  "holderName": "Ahmed Mohamed",
  "data": { /* certificate claims */ },
  "documentHash": "<sha256 hex>"
}
```

**Step 5 — Server-Side Processing**
The `CertificatesService.issue()` method executes:
1. Validates required fields.
2. Resolves template from DB by UUID or business key.
3. Confirms org from JWT (`req.user.organizationId`).
4. Generates `certId` (UUIDv4).
5. Computes `certHash = SHA-256(claims + certId + timestamp)`.
6. Creates `Certificate` record in PostgreSQL with `status: "ISSUED"`.
7. Submits `IssueCertificate(certId, templateId, version, holderId, certHash, contentPointer, issuedAt, expiresAt, signatureProofRef)` to Fabric (best-effort).
8. Writes `CERTIFICATE_ISSUED` audit log.
9. Returns the created certificate record.

**Step 6 — Blockchain Recording**
The Fabric peer's endorsement flow:
1. The API submits a `propose` message to at least 2 of 4 peers (MAJORITY endorsement policy).
2. Each peer simulates the `IssueCertificate` chaincode function, validates the issuer is active, the template is active, and timestamps are valid.
3. Endorsing peers return signed read-write sets.
4. The API assembles the endorsed transaction and submits it to the ordering service.
5. The orderer batches the transaction into a block and distributes it to all peers.
6. Each peer validates the block and commits it, updating the CouchDB state with the new certificate record.
7. The `CertificateIssued` event is emitted.

### 9.2 Certificate Verification Flow

**[FIGURE SUGGESTION: Figure 9.2 — Certificate Verification Sequence Diagram]**

**Method A — Verification by Certificate ID**

1. A verifier navigates to `/verify/{certId}` or enters the cert ID on the verify page.
2. The frontend calls `GET /api/v1/certificates/{certId}/verify`.
3. The API queries PostgreSQL for the certificate record.
4. The API calls `fabricService.verifyCertificateRecord(cert.certId, cert.certHash)`, which evaluates the `VerifyCertificateRecord` chaincode function.
5. The chaincode returns a structured `VerificationResult` JSON with: `status`, `is_expired`, `is_revoked`, `issuer_name`, `issued_at`, `expires_at`, and optional `hash_matches`.
6. The API creates a `Verification` record in PostgreSQL.
7. The response includes both the off-chain certificate metadata and the on-chain verification result.

**Method B — Verification by Document Hash**

1. A verifier drags or uploads a document file to the verify page.
2. The browser computes the SHA-256 hash of the file client-side using the Web Crypto API.
3. The frontend calls `GET /api/v1/certificates/verify-by-hash/{hash}`.
4. The API queries PostgreSQL using three strategies:
   a. Match `certHash` directly.
   b. Match `claims.documentHash` via JSON path query.
   c. Match `contentPointer = "hash://{hash}"`.
5. If a matching certificate is found, the verification result is computed and returned.
6. A `Verification` record is created in PostgreSQL.

### 9.3 Certificate Revocation Flow

**[FIGURE SUGGESTION: Figure 9.3 — Certificate Revocation Sequence Diagram]**

1. An ISSUER_ADMIN calls `POST /api/v1/certificates/{id}/revoke` with `{ reason: "..." }`.
2. The controller passes `(id, reason, req.user.id, req.user.organizationId)` to `CertificatesService.revoke()`.
3. The service fetches the certificate from PostgreSQL and verifies `cert.organizationId === req.user.organizationId` (tenant isolation check).
4. The service updates the PostgreSQL record: `status = "REVOKED"`, `revokedAt = now()`, `revocationReason = reason`.
5. The service calls `fabricService.revokeCertificate(cert.certId, reasonCode, reasonText)`.
6. The Fabric chaincode verifies the caller belongs to the same organization that issued the certificate (`RequireIssuerForOrg`), then updates the on-chain status to `REVOKED`.
7. The `CertificateRevoked` event is emitted on-chain.
8. A `CERTIFICATE_REVOKED` audit log is written to PostgreSQL.

**Revocation is immediately visible to all verifiers**: Because the on-chain status is the ground truth for revocation, and because the Fabric network replicates state across all peers, any subsequent verification call will return `is_revoked: true` within the time it takes for the block to be committed (typically 2–4 seconds given the 2-second batch timeout).

---

## 10. Infrastructure, Containerization, and Deployment

### 10.1 Containerization Strategy

All system components are containerized using Docker. The application services are defined in `infra/compose/compose.yaml` (Docker Compose v2). The Fabric network services are defined in `blockchain/network/docker/docker-compose-fabric.yaml` for single-VM deployment, or in `docker-compose-vm{1-4}.yaml` files for multi-VM distributed deployment.

**Application Services (`infra/compose/compose.yaml`)**:

| Service | Image | Exposed Port | Purpose |
|---|---|---|---|
| `postgres` | `postgres:16-alpine` | 5432 | PostgreSQL database |
| `ipfs` | `ipfs/kubo:latest` | 5001, 8080, 4001 | IPFS node (API, Gateway, Swarm) |
| `api` | Built from `apps/api/Dockerfile` | 3000 | NestJS backend API |
| `web` | Built from `apps/web/Dockerfile` | 5173→80 | React SPA (Nginx) |
| `nginx` | `nginx:alpine` | 80, 443 | Reverse proxy |
| `prometheus` | `prom/prometheus:latest` | 9090 | Metrics collection |
| `grafana` | `grafana/grafana:latest` | 3001→3000 | Metrics visualization |
| `otel-collector` | `otel/opentelemetry-collector-contrib:latest` | 4317, 4318 | Telemetry collection |

### 10.2 Multi-Stage Docker Builds

Both application Dockerfiles use multi-stage builds to produce lean production images:

**API Dockerfile (3 stages)**:
1. **deps**: `node:20-alpine` — Installs npm dependencies.
2. **builder**: `node:20-alpine` — Generates Prisma client, compiles TypeScript to JavaScript.
3. **runner**: `node:20-alpine` — Copies only compiled output and production dependencies; runs as non-root user `nestjs` (UID 1001); uses `dumb-init` for proper signal handling.

**Web Dockerfile (3 stages)**:
1. **deps**: `node:20-alpine` — Installs npm dependencies.
2. **builder**: `node:20-alpine` — Runs `vite build`, strips source maps (`find /app/dist -name '*.map' -delete`).
3. **runner**: `nginx:alpine` — Copies static build output; uses custom Nginx config for SPA routing; no Node.js in production image.

### 10.3 Container Security Hardening

All services in `compose.yaml` are hardened with the following Docker security options:

- **`no-new-privileges: true`**: Prevents containers from acquiring new Linux capabilities via `setuid` binaries.
- **`cap_drop: [ALL]`**: Drops all Linux capabilities from the container's capability set.
- **`cap_add: [NET_BIND_SERVICE]`** (for API, web, nginx): Re-grants only the specific capability required to bind privileged ports.
- **Resource limits** (`deploy.resources.limits`): API is limited to 2 CPU cores and 1 GB RAM; web and Nginx to 0.5 cores and 256 MB RAM.
- **Non-root users**: API runs as `nestjs` (UID 1001); Prometheus as `65534:65534`; Grafana as `472:472`.

### 10.4 Nginx Reverse Proxy Configuration

The Nginx configuration (`infra/nginx/conf/default.conf`) implements:

- **Rate Limiting**: Three zones are defined — `api_limit` (10 requests/second), `verify_limit` (5 requests/second for the verification endpoint), and `general_limit` (100 requests/second for frontend assets).
- **Upstream Keepalive**: API backend uses 32 keepalive connections; frontend uses 16.
- **Security Headers**: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection`, `Referrer-Policy`.
- **Proxy Error Handling**: If the API returns a 502/503/504, Nginx returns a structured JSON error response rather than an HTML error page.
- **HTTPS (setup_https.sh)**: When TLS is configured, the Nginx config is upgraded to include Let's Encrypt certificates, `ssl_protocols TLSv1.2 TLSv1.3`, `HSTS` with `max-age=63072000; includeSubDomains; preload`, and a full `Content-Security-Policy` header.

### 10.5 Multi-VM Distributed Deployment

For true decentralization, the platform provides per-VM Docker Compose files that distribute the four Fabric organizations across four separate Oracle Cloud Infrastructure (OCI) Virtual Machines:

| VM | Organizations Hosted | Orderer | Peer Ports |
|---|---|---|---|
| VM1 | Org1 (Ministry of Trade) | orderer1 (7050) | 7051, 8051 |
| VM2 | Org2 (MSMEDA) | orderer2 (8050) | 9051, 10051 |
| VM3 | Org3 (Training Providers) | orderer3 (9050) | 11051, 12051 |
| VM4 | Org4 (Auditors) | none | 13051, 14051 |

Cross-VM hostname resolution is achieved using Docker's `extra_hosts` directive, mapping each organization's peer hostnames to the public IP addresses of the respective VMs via environment variables (`${VM1_IP}`, `${VM2_IP}`, `${VM3_IP}`, `${VM4_IP}`).

### 10.6 VM Provisioning Script

The `scripts/setup_vm.sh` script automates the complete setup of a fresh Oracle Linux VM in nine phases:

| Phase | Description |
|---|---|
| Phase 1 | System prerequisites: `dnf` package updates, Docker CE installation, Go 1.23.5, Node.js 20 |
| Phase 2 | Hyperledger Fabric 2.5 binaries download (peer, orderer, configtxgen, cryptogen, osnadmin) |
| Phase 3 | Application code upload (pauses for SFTP transfer) |
| Phase 4 | Fabric network: crypto generation, genesis block, container startup, channel creation |
| Phase 5 | Chaincode CCaaS deployment (package, install, approve x4 orgs, commit) |
| Phase 6 | Ledger initialization (`InitLedger` with 3-org endorsement) |
| Phase 7 | Connection profiles and admin wallet enrollment |
| Phase 8 | Application stack: `.env` generation (random JWT secret + encryption key), `docker compose up --build`, Prisma schema push |
| Phase 9 | Firewall rules (ports 80, 443, 3000, 5173, 9090, 3001) and health check validation |

---

## 11. Security Design and Hardening Measures

### 11.1 Transport Security

- **Fabric Network**: All peer-to-peer, peer-orderer, and client-peer communication uses mutual TLS (mTLS). TLS certificates are generated by `cryptogen` from the `crypto-config.yaml` specification and are stored in the `crypto-config/` directory tree. `ORDERER_GENERAL_TLS_ENABLED=true` and `CORE_PEER_TLS_ENABLED=true` are set on all network components.
- **Application HTTPS**: The `setup_https.sh` script configures Let's Encrypt TLS for the public-facing Nginx endpoint. The configuration enforces TLS 1.2 and 1.3 only, uses modern cipher suites (ECDHE-ECDSA-AES128-GCM-SHA256, ECDHE-RSA-AES256-GCM-SHA384), and enables HSTS with preload.
- **API-to-Database**: PostgreSQL connection uses `DATABASE_URL` with SSL where configured.

### 11.2 Secret Management

- **JWT Secret**: Generated at deployment time using `openssl rand -base64 48` and stored in `infra/compose/.env`. The `.env` file is never committed to version control.
- **Master Encryption Key**: Also generated randomly at deployment time. Used for encrypting certificate payloads stored at rest.
- **Docker Secrets**: `JWT_SECRET` and `MASTER_ENCRYPTION_KEY` are injected as environment variables from the `.env` file into the API container via Docker Compose variable substitution.

### 11.3 Input Validation and Sanitisation

- **API Level**: All request body parameters are validated by NestJS's global `ValidationPipe` with `whitelist: true` (strips unknown fields). No raw user input is interpolated into database queries (Prisma uses parameterized queries exclusively).
- **Chaincode Level**: The `validators` package validates all inputs before any state write, including hash format, UUID format, email format, timestamp ordering, and PEM key format.
- **Contact Form**: HTML escaping is applied to all user-submitted values before they are embedded in email HTML to prevent XSS in the email client.

### 11.4 Rate Limiting

The application applies rate limiting at two levels:

1. **Nginx Level**: IP-based rate limiting (`limit_req_zone`) for all API calls (10 r/s), with a stricter limit for the certificate verification endpoint (5 r/s) to mitigate abuse of the public verification API.
2. **NestJS Level**: The `ThrottlerModule` provides application-level rate limiting with configurable window and limit (`RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`).

### 11.5 Data Privacy

- **On-Chain Anonymization**: The `holder_id` stored on the blockchain is a pseudonymous UUID, not the holder's name or email. This ensures no personally identifiable information (PII) is written to the shared ledger.
- **Off-Chain Encryption**: Certificate content stored in IPFS is encrypted using AES-256-GCM with the `MASTER_ENCRYPTION_KEY` before upload.
- **Certificate Hash**: The `cert_hash` is a one-way SHA-256 digest. Given only the hash, it is computationally infeasible to reconstruct the original certificate content.

---

## 12. Observability: Monitoring, Logging, and Auditing

### 12.1 Application Metrics (Prometheus + Grafana)

Each NestJS API container exposes metrics in Prometheus exposition format at `/api/metrics` when `PROMETHEUS_ENABLED=true`. Metrics include request count, request duration histograms, error rates, and active connection counts. Hyperledger Fabric peers expose their own Prometheus metrics at their operations ports (9446–9453).

The `prometheus` service scrapes all configured targets at the interval defined in `infra/compose/prometheus.yml`. Grafana connects to Prometheus as a data source and can render dashboards showing real-time API throughput, error rates, Fabric peer health, and certificate issuance trends.

### 12.2 Distributed Tracing (OpenTelemetry)

The NestJS API is configured with OpenTelemetry instrumentation (`OTEL_ENABLED=true`). Telemetry data (traces and spans) is exported to the `otel-collector` service via OTLP HTTP (`http://otel-collector:4318`). The OpenTelemetry Collector can be configured to export to Jaeger, Zipkin, or other backends for distributed request tracing.

### 12.3 Structured Logging

The API uses Winston for structured logging, with two transports:
- **Console**: Colourized, human-readable format with timestamps and context.
- **File**: JSON-formatted logs in `logs/combined.log` and `logs/error.log` (error-only).

Log entries include timestamp, log level, context (module name), and message.

### 12.4 Application Audit Log

Every significant user action is recorded in the PostgreSQL `audit_logs` table via the `AuditService`. Each audit entry records: the action type (from the `AuditAction` enum), the user ID, the resource type and ID affected, structured details (as JSON), the client IP address, and the user agent string. The `GET /api/v1/audit` endpoint allows administrators to paginate and filter the audit trail by action type or user ID.

**[TABLE SUGGESTION: Table 12.1 — Audit Action Types and Their Triggers]**

| Audit Action | Triggered By | Stored Details |
|---|---|---|
| `USER_LOGIN` | Successful login | `{ email }` |
| `USER_LOGOUT` | Explicit logout | `{}` |
| `USER_CREATED` | User registration | `{ email, role }` |
| `CERTIFICATE_ISSUED` | Certificate issuance | `{ certificateId, holderEmail }` |
| `CERTIFICATE_REVOKED` | Certificate revocation | `{ certificateId, reason }` |
| `CERTIFICATE_VERIFIED` | Verification query | `{ certId, method }` |
| `CONFIG_CHANGED` | System configuration update | `{ key, oldValue, newValue }` |
| `SECURITY_VIOLATION` | Access denied events | `{ endpoint, reason }` |

---

## 13. Development Methodology and Technology Selection

### 13.1 Development Approach

The system was developed following an iterative, milestone-based development methodology:

1. **Blockchain Core**: The Fabric network design, chaincode data models, and access control were implemented and tested first, as they represent the most complex and least flexible component.
2. **API Layer**: The NestJS API was built second, initially without blockchain integration (using the graceful degradation pattern), allowing rapid iteration on data models and endpoints.
3. **Frontend Layer**: The React SPA was developed third, using mock data where API endpoints were not yet complete, then progressively integrated with the live API.
4. **Integration Testing**: End-to-end flow testing was performed with all components running in Docker Compose.
5. **Security Hardening**: Container security, HTTPS, rate limiting, and secret management were applied in a dedicated hardening phase.

### 13.2 Key Technology Decisions and Rationale

**Hyperledger Fabric vs. Public Blockchains**: Fabric was chosen over Ethereum or other public blockchains for three reasons: (1) permissioned access is a hard requirement — only approved organizations may issue certificates; (2) transaction finality is deterministic and near-instant, required for user experience; (3) data privacy is native — no content is broadcast to public nodes.

**Raft vs. Kafka Ordering**: Raft (etcdraft) was chosen over the Kafka-based orderer because Fabric 2.x marks Kafka as deprecated, Raft requires fewer external dependencies (no Zookeeper cluster), and a 3-node Raft cluster provides adequate CFT for the platform's scale.

**CCaaS Chaincode Deployment**: Chaincode as a Service was selected over traditional chaincode deployment because it decouples the chaincode lifecycle from peer restarts, simplifies upgrades (restart the external service container rather than reinstalling on peers), and makes the chaincode independently testable.

**Prisma vs. Raw SQL**: Prisma provides type-safe database access generated from the schema, reducing the risk of SQL injection, typos in column names, and unvalidated data shapes. The `binaryTargets` configuration (`native`, `linux-musl-openssl-3.0.x`) ensures the generated Prisma client works correctly inside Alpine Linux Docker containers.

**NestJS vs. Express**: NestJS was chosen for its enforced modular architecture, built-in dependency injection (making unit testing straightforward), and native support for decorators, validation pipes, JWT strategies, and Swagger documentation — all of which reduce boilerplate code and enforce consistent patterns across the codebase.

**React + Vite**: Vite was selected over Create React App for its significantly faster build times (utilizing ES module native imports in development) and cleaner production bundle output.

---

## 14. Summary Tables and Figures Reference

This section consolidates all suggested figures and tables for quick reference when constructing the thesis document.

### Suggested Figures

| Figure | Title | Section | Description |
|---|---|---|---|
| Fig 2.1 | Four-Tier System Architecture | §2.1 | Browser → Nginx → NestJS → {PostgreSQL, IPFS, Fabric} |
| Fig 2.2 | Monorepo Directory Structure | §2.2 | Annotated tree diagram of the project file structure |
| Fig 3.1 | Fabric Network Topology | §3.1 | 4 orgs, 8 peers, 3 orderers, CouchDB, channel |
| Fig 4.1 | Chaincode Access Control Matrix | §4.4 | Roles vs. functions access matrix |
| Fig 5.1 | Hybrid Storage Architecture | §5.1 | Hash → Fabric, content → IPFS, metadata → PostgreSQL |
| Fig 8.1 | Multi-Layer Authorization | §8.4 | JWT → DB scoping → Chaincode, with example flow |
| Fig 9.1 | Certificate Issuance Sequence | §9.1 | End-to-end UML sequence diagram |
| Fig 9.2 | Certificate Verification Sequence | §9.2 | Dual-path (ID and hash) verification UML sequence |
| Fig 9.3 | Certificate Revocation Sequence | §9.3 | Revocation UML sequence with org ownership check |

### Suggested Tables

| Table | Title | Section | Content |
|---|---|---|---|
| Tab 1.1 | User Roles and Responsibilities | §1.3 | 7 roles with descriptions and actions |
| Tab 2.1 | Technology Stack | §2.3 | Full technology stack with versions and purposes |
| Tab 3.1 | Fabric Network Topology Summary | §3.2 | Component counts |
| Tab 3.2 | Peer Port Assignments | §3.3 | All 8 peers with listening, chaincode, operations ports |
| Tab 4.1 | On-Chain Data Models | §4.2 | Certificate, Issuer, Template model fields |
| Tab 4.2 | Smart Contract Functions | §4.3 | All 11 functions with type, role, description |
| Tab 5.1 | PostgreSQL Database Models | §5.2 | All 12 models with tables and key fields |
| Tab 6.1 | NestJS Application Modules | §6.2 | All 13 modules with paths and dependencies |
| Tab 6.2 | API Endpoint Reference | §6.3 | All REST endpoints with method, path, auth |
| Tab 7.1 | Frontend Route Structure | §7.2 | All routes organized by portal |
| Tab 12.1 | Audit Action Types | §12.4 | All 17 audit actions with triggers and details |

---

*End of Technical Documentation*

*Document prepared for: Master's Thesis — Methodology and Implementation Chapters*
*Platform: SME Certificate Trust Platform v6.0*
*Technologies: Hyperledger Fabric 2.5 · NestJS · React · PostgreSQL · IPFS · Docker*
