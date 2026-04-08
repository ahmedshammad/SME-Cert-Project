import { useState } from 'react';
import {
  Monitor, Server, Database, HardDrive, Shield,
  FileCheck, Layers, Lock, Eye, Key, UserCheck, QrCode,
  Upload, Code, Globe, Fingerprint, BarChart3, Search,
  CheckCircle, Cpu, Network, Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { DiagramBlock } from '@/components/shared/DiagramBlock';
import { Accordion, AccordionItem } from '@/components/ui/accordion';
import { CTABanner } from '@/components/shared/CTABanner';
import { cn } from '@/lib/utils';

const tabs = ['Overview', 'Process', 'Technology', 'Security'] as const;
type Tab = typeof tabs[number];

const techStack = [
  { category: 'Frontend', items: ['React 18', 'TypeScript 5', 'Tailwind CSS 3.4', 'Radix UI / shadcn', 'Vite 5', 'Zustand', 'TanStack Query', 'i18next'] },
  { category: 'Backend API', items: ['NestJS 10', 'Node.js 20', 'TypeScript 5', 'Prisma ORM 5', 'Passport.js + JWT', 'Nodemailer', 'Swagger / OpenAPI'] },
  { category: 'Blockchain', items: ['Hyperledger Fabric 2.5', 'Raft Consensus (3 orderers)', 'Go 1.21 Chaincode', 'CouchDB 3.3 State DB', 'Channel Participation API'] },
  { category: 'Database', items: ['PostgreSQL 16', 'Prisma Migrations', '13-model schema'] },
  { category: 'Storage & Crypto', items: ['IPFS Kubo', 'AES-256-GCM Encryption', 'ECDSA P-256 Signatures', 'SHA-256 Hashing', 'Content Addressing (CID)'] },
  { category: 'Infrastructure', items: ['Docker Compose (28 containers)', 'Nginx (TLS + reverse proxy)', 'Prometheus', 'Grafana', 'OpenTelemetry', 'Winston'] },
];

const coreModules = [
  { icon: UserCheck, name: 'Auth Module', desc: 'JWT authentication, bcrypt password hashing, session management, password reset via email token.' },
  { icon: Users, name: 'Organizations Module', desc: 'Organization registration with admin approval workflow, org-scoped certificate and user management.' },
  { icon: Layers, name: 'Templates Module', desc: 'Certificate template creation with JSON schemas, custom fields, and version control.' },
  { icon: FileCheck, name: 'Certificates Module', desc: 'Full lifecycle: issuance, sharing with granular access grants, revocation with reason codes.' },
  { icon: Search, name: 'Verification Module', desc: 'Multi-method verification: QR code scan, certificate ID lookup, or file-upload hash check.' },
  { icon: HardDrive, name: 'Storage Module', desc: 'Envelope encryption (AES-256-GCM) with per-certificate data keys pinned to IPFS Kubo.' },
  { icon: Key, name: 'Wallet Module', desc: 'Fabric SDK file-system wallet management for Org1–Org4 admin identities.' },
  { icon: Eye, name: 'Audit Module', desc: 'Append-only audit logs: user, timestamp, IP address, and action detail for every operation.' },
  { icon: BarChart3, name: 'Metrics Module', desc: 'Prometheus-compatible metrics: issuance rates, verification counts, API latency.' },
  { icon: Globe, name: 'Contact Module', desc: 'Contact form submissions persisted to database; SMTP email dispatch when configured.' },
];

const dataStorage = [
  { location: 'PostgreSQL 16', color: 'blue' as const, items: ['User accounts & sessions', 'Organization profiles', 'Certificate metadata + IPFS CID', 'Template definitions', 'Audit logs', 'Verification records', 'Access grants & sharing', 'Contact submissions'] },
  { location: 'Hyperledger Fabric Ledger', color: 'green' as const, items: ['SHA-256 certificate hash', 'Certificate ID (pseudonymous)', 'Issuer ECDSA P-256 signature', 'Issuance & revocation timestamps', 'Revocation status + reason code', 'Template version reference'] },
  { location: 'IPFS (Kubo)', color: 'gold' as const, items: ['AES-256-GCM encrypted payload', 'Per-certificate data keys', 'Extended metadata', 'Holder public key wrapping', 'Content-addressed via CID'] },
];

const securityFeatures = [
  { icon: Fingerprint, title: 'SHA-256 Content Hashing', desc: 'Every certificate payload is SHA-256 hashed before blockchain anchoring, producing a unique tamper-evident fingerprint.' },
  { icon: Lock, title: 'AES-256-GCM Envelope Encryption', desc: 'Each certificate has its own data key. That key is then wrapped with the holder\'s public key and a master key, so only authorized parties can decrypt.' },
  { icon: Cpu, title: 'ECDSA P-256 Signatures', desc: 'Certificate issuance and blockchain transactions are signed with ECDSA P-256 (FIPS-aligned), providing strong cryptographic proof of authorship.' },
  { icon: UserCheck, title: 'Role-Based Access (RBAC)', desc: '7 distinct roles enforced at both API and chaincode layers: Platform Admin, Consortium Admin, Issuer Admin, Issuer Operator, SME User, Verifier, Auditor.' },
  { icon: Eye, title: 'Immutable Audit Logging', desc: 'Every action is recorded with user identity, timestamp, IP address, and full action details. Append-only — cannot be modified by any user role.' },
  { icon: Shield, title: 'API Security Hardening', desc: 'JWT bearer tokens, bcrypt cost-12 passwords, per-endpoint rate limiting, CORS, Helmet security headers, and Joi input validation.' },
  { icon: Network, title: 'Permissioned Blockchain (mTLS)', desc: 'Hyperledger Fabric enforces mutual TLS on all peer-to-peer and client-to-peer connections. No anonymous write access to the ledger.' },
  { icon: Key, title: 'Privacy-Preserving Design', desc: 'Holder IDs on-chain are pseudonymous SHA-256(email+salt) hashes. No personally identifiable information is stored on the blockchain ledger.' },
];

export function DocumentationPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Overview');

  return (
    <div>
      {/* Hero */}
      <section className="gradient-hero-subtle py-16 md:py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <Badge variant="navy" className="mb-4">Documentation</Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Platform Documentation</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Understand how the SME Certificate Trust Platform works, from end-to-end processes
            to technology architecture and security controls.
          </p>
        </div>
      </section>

      {/* Tab Navigation */}
      <div className="border-b bg-white sticky top-0 z-10">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="flex overflow-x-auto gap-0">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-3 md:px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  activeTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="py-12 px-4">
        <div className="container mx-auto max-w-5xl">

          {/* Overview Tab */}
          {activeTab === 'Overview' && (
            <div className="space-y-12">
              <div className="prose max-w-none">
                <h2 className="text-2xl font-bold mb-4">What is the SME Certificate Trust Platform?</h2>
                <p className="text-muted-foreground leading-relaxed">
                  The SME Certificate Trust Platform is an end-to-end permissioned blockchain solution for issuing, storing,
                  verifying, and revoking digital certificates for Egyptian SMEs. It combines a PostgreSQL relational database
                  with Hyperledger Fabric 2.5 for tamper-proof anchoring and IPFS for encrypted off-chain payload storage.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  Organizations register as certificate issuers, create reusable templates, and issue W3C Verifiable
                  Credential-compatible certificates to holders. Each certificate's SHA-256 hash and ECDSA P-256 signature
                  are anchored on-chain by a 4-organization consortium. The full encrypted payload lives off-chain on IPFS,
                  keeping the ledger lean while preserving holder privacy. Anyone can verify a certificate in under 3 seconds
                  — no account required.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-6">System Architecture at a Glance</h3>
                <DiagramBlock
                  nodes={[
                    { label: 'Web UI', icon: Monitor, color: 'blue', sublabel: 'React' },
                    { label: 'API Layer', icon: Server, color: 'navy', sublabel: 'NestJS' },
                    { label: 'Database', icon: Database, color: 'blue', sublabel: 'PostgreSQL' },
                    { label: 'Blockchain', icon: Network, color: 'green', sublabel: 'Fabric' },
                    { label: 'Storage', icon: HardDrive, color: 'gold', sublabel: 'IPFS' },
                  ]}
                />
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-6">Key Capabilities</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { icon: FileCheck, text: 'Issue tamper-proof digital certificates' },
                    { icon: Search, text: 'Verify certificates via QR, ID, or file upload' },
                    { icon: Layers, text: 'Create reusable certificate templates' },
                    { icon: Shield, text: 'Blockchain-anchored integrity proofs' },
                    { icon: Eye, text: 'Full audit trail for compliance' },
                    { icon: Globe, text: 'Multi-organization consortium model' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                      <item.icon className="h-5 w-5 text-egypt-green shrink-0" />
                      <span className="text-sm">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Process Tab */}
          {activeTab === 'Process' && (
            <div className="space-y-12">
              <SectionHeading
                title="Certificate Lifecycle"
                subtitle="The complete journey from issuance to verification."
                align="left"
              />

              {[
                { step: 1, title: 'Issuer Onboarding', icon: UserCheck, desc: 'Organizations register on the platform, provide verification documents, and receive admin credentials. Roles are assigned to team members: Issuer Admin, Operator, Verifier, or Auditor.' },
                { step: 2, title: 'Template Creation', icon: Layers, desc: 'Issuers define certificate templates with custom JSON schemas. Templates specify required fields, validation rules, and certificate structure. Templates are optionally published to the blockchain for immutability.' },
                { step: 3, title: 'Certificate Issuance', icon: FileCheck, desc: 'Certificates are created by filling in template fields with holder-specific data. The system generates a unique certificate ID and records holder information, issuance date, and expiration.' },
                { step: 4, title: 'Hashing & ID Generation', icon: Fingerprint, desc: 'A SHA-256 hash is computed from the certificate data, creating a unique digital fingerprint. This hash, along with the certificate ID and issuer reference, forms the blockchain record.' },
                { step: 5, title: 'Blockchain Anchoring', icon: Network, desc: 'The hash, certificate ID, timestamps, and issuer signature are submitted to the Hyperledger Fabric network. Once committed by the Raft consensus, the record is immutable.' },
                { step: 6, title: 'Off-chain Storage', icon: HardDrive, desc: 'The full certificate file, metadata, and attachments are encrypted with AES-256-GCM and stored on IPFS. Only the content pointer is kept in the database.' },
                { step: 7, title: 'Verification', icon: CheckCircle, desc: 'Anyone can verify a certificate using its ID, QR code, or by uploading the file. The system recomputes the hash, checks the blockchain record, and confirms authenticity.' },
              ].map((item) => (
                <div key={item.step} className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-egypt-green text-white flex items-center justify-center font-bold text-sm">
                    {item.step}
                  </div>
                  <div className="flex-1 pb-8 border-l-2 border-egypt-green/20 pl-6 -ml-5">
                    <div className="flex items-center gap-2 mb-2">
                      <item.icon className="h-5 w-5 text-egypt-navy" />
                      <h3 className="font-semibold text-lg">{item.title}</h3>
                    </div>
                    <p className="text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Technology Tab */}
          {activeTab === 'Technology' && (
            <div className="space-y-12">
              <SectionHeading
                title="Technology Stack"
                subtitle="Modern, enterprise-grade technologies powering the platform."
                align="left"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {techStack.map((group, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{group.category}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1.5">
                        {group.items.map((item, j) => (
                          <Badge key={j} variant="secondary" className="text-xs">{item}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-6">Core Modules</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {coreModules.map((mod, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-lg border bg-white">
                      <div className="w-9 h-9 bg-egypt-navy/10 rounded-lg flex items-center justify-center shrink-0">
                        <mod.icon className="h-4 w-4 text-egypt-navy" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{mod.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{mod.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-6">Data Storage Layers</h3>
                <p className="text-muted-foreground mb-6">
                  Data is distributed across three storage layers, each optimized for its purpose.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                  {dataStorage.map((store, i) => {
                    const colors = { blue: 'bg-primary/5 border-primary/10', green: 'bg-egypt-green/5 border-egypt-green/10', gold: 'bg-egypt-gold/5 border-egypt-gold/10' };
                    const textColors = { blue: 'text-primary', green: 'text-egypt-green', gold: 'text-egypt-gold' };
                    return (
                      <div key={i} className={cn('rounded-xl p-5 border-2', colors[store.color])}>
                        <h4 className={cn('font-semibold mb-3', textColors[store.color])}>{store.location}</h4>
                        <ul className="space-y-1.5">
                          {store.items.map((item, j) => (
                            <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CheckCircle className={cn('h-3 w-3 shrink-0', textColors[store.color])} />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-6">Integration Points</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                  {[
                    { icon: QrCode, title: 'QR Code Generation', desc: 'Auto-generated QR codes for every certificate linking to the verification page.' },
                    { icon: Upload, title: 'File Upload Verification', desc: 'Upload a certificate file to auto-compute hash and verify against blockchain.' },
                    { icon: Code, title: 'REST API', desc: 'Full API with Swagger docs for programmatic integration with external systems.' },
                  ].map((item, i) => (
                    <Card key={i} className="card-hover">
                      <CardContent className="pt-6">
                        <item.icon className="h-8 w-8 text-egypt-gold mb-3" />
                        <h4 className="font-semibold text-sm mb-1">{item.title}</h4>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'Security' && (
            <div className="space-y-12">
              <SectionHeading
                title="Security Architecture"
                subtitle="Enterprise-grade security controls protecting every layer of the platform."
                align="left"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                {securityFeatures.map((feat, i) => (
                  <Card key={i} className="card-hover">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-egypt-navy/10 rounded-lg flex items-center justify-center">
                          <feat.icon className="h-5 w-5 text-egypt-navy" />
                        </div>
                        <h3 className="font-semibold">{feat.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">{feat.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Security FAQ</h3>
                <Accordion>
                  <AccordionItem title="How is certificate data encrypted?">
                    The platform uses envelope encryption. Each certificate receives a unique AES-256-GCM data key. That key
                    is wrapped twice — once with the holder's public key (so only the holder can decrypt their own data) and once
                    with a master key held by the platform. The encrypted payload is stored on IPFS and referenced by its
                    content-addressed CID, which is kept in PostgreSQL alongside the certificate metadata.
                  </AccordionItem>
                  <AccordionItem title="How are user permissions managed?">
                    The platform uses role-based access control (RBAC) with 7 distinct roles enforced at two layers: the NestJS
                    API (JWT claims) and the Go chaincode (X.509 certificate attributes). Roles are: Platform Admin, Consortium
                    Admin, Issuer Admin, Issuer Operator, SME User, Verifier, and Auditor. No role can escalate its own permissions.
                  </AccordionItem>
                  <AccordionItem title="Is the blockchain network private?">
                    Yes. The platform runs a permissioned Hyperledger Fabric 2.5 network with a 4-organization consortium.
                    Only enrolled Fabric identities can submit transactions. All peer-to-peer and client-to-peer connections
                    use mutual TLS. The network uses Raft CFT consensus with 3 orderer nodes — tolerating 1 orderer failure
                    without interrupting service.
                  </AccordionItem>
                  <AccordionItem title="Is any personal data stored on the blockchain?">
                    No. Holder identities on-chain are pseudonymous: a SHA-256(email + salt) hash is stored, never the actual
                    email address or any personally identifiable information. The certificate hash, issuer signature, timestamps,
                    and revocation status are the only things written to the ledger.
                  </AccordionItem>
                  <AccordionItem title="How are audit logs protected?">
                    Audit logs are stored in PostgreSQL with user ID, timestamp, IP address, and action detail for every
                    operation. They are append-only at the application layer — no user role, including Platform Admin, can
                    modify or delete an existing audit record. Blockchain transaction history provides a second, independently
                    verifiable audit trail.
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
          )}
        </div>
      </div>

      <CTABanner
        title="Want to See the Platform in Action?"
        subtitle="Request a demo or explore the verification page."
        primaryCTA={{ label: 'Request Demo', href: '/contact' }}
        secondaryCTA={{ label: 'Try Verification', href: '/verify' }}
        variant="navy"
      />
    </div>
  );
}
