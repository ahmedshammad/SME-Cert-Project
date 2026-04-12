import {
  Building2, Layers, FileCheck, Fingerprint, Link2,
  Database, Search, Shield,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { StepCard } from '@/components/shared/StepCard';
import { CTABanner } from '@/components/shared/CTABanner';
import { Accordion, AccordionItem } from '@/components/ui/accordion';

const steps = [
  {
    icon: Building2,
    title: 'Issuer Onboarding',
    description:
      'Organizations register on the platform, undergo identity verification, and configure their issuer profile. Admin accounts are provisioned with role-based permissions.',
    detail:
      'During onboarding the organization submits legal documentation, selects a subscription tier, and assigns administrator roles. The platform verifies the organization against business registries before granting issuer privileges on the consortium network.',
  },
  {
    icon: Layers,
    title: 'Template Creation',
    description:
      'Issuers design reusable certificate templates that define the structure, required fields, and visual layout for each credential type.',
    detail:
      'The template builder provides a drag-and-drop interface for arranging fields such as holder name, date of issuance, and custom claims. Templates can be versioned so that previously issued certificates remain valid when the schema evolves.',
  },
  {
    icon: FileCheck,
    title: 'Certificate Issuance',
    description:
      'The issuer fills in certificate data for a specific holder, reviews the information, and digitally signs the issuance to create an official credential.',
    detail:
      'Issuance can be performed individually or in bulk via CSV upload. Each certificate receives a globally unique ID and is digitally signed by the issuer. The holder is notified and can access their certificate through the holder portal.',
  },
  {
    icon: Fingerprint,
    title: 'Hashing & ID Generation',
    description:
      'A SHA-256 hash of the certificate payload is computed to create a compact, tamper-evident fingerprint that uniquely represents the document.',
    detail:
      'The hashing process covers all critical certificate fields so that any change, even a single character, produces a completely different hash. This fingerprint is what gets anchored to the blockchain, not the certificate content itself.',
  },
  {
    icon: Link2,
    title: 'Blockchain Anchoring',
    description:
      'The certificate hash, certificate ID, issuer ECDSA P-256 signature, and timestamp are committed to the Hyperledger Fabric ledger as an immutable transaction.',
    detail:
      'Before committing, the transaction must be endorsed by peers from at least 2 of the 4 consortium organizations (MAJORITY policy). The 3-orderer Raft cluster then sequences and finalises the block. Once committed, no party can alter or delete the record — providing a permanent, independently verifiable proof of issuance.',
  },
  {
    icon: Database,
    title: 'Off-Chain Storage',
    description:
      'The full certificate payload is AES-256-GCM encrypted with a per-certificate key and pinned to IPFS Kubo for content-addressed storage.',
    detail:
      'Storing bulk data off-chain keeps the blockchain lean and fast. The IPFS content identifier (CID) is saved in PostgreSQL alongside the certificate metadata. Envelope encryption ensures only the holder (via their public key) and the platform (via the master key) can decrypt the payload — no raw certificate data ever touches the ledger.',
  },
  {
    icon: Search,
    title: 'Verification Journey',
    description:
      'Any party can verify a certificate by scanning its QR code, entering its ID, or uploading the file. The platform checks the on-chain record and returns a clear result.',
    detail:
      'Verification re-computes the hash of the presented certificate and compares it with the hash stored on the blockchain. If they match the certificate is confirmed authentic and unaltered. The entire process completes in seconds without requiring an account.',
  },
];

const faqItems = [
  {
    question: 'What types of certificates can be issued?',
    answer:
      'The platform supports any type of digital certificate or credential, including academic degrees, professional certifications, training completion records, compliance attestations, and business licenses. Issuers define custom templates to match their specific use case.',
  },
  {
    question: 'How long does verification take?',
    answer:
      'Verification typically completes in under three seconds. The system re-computes the certificate hash and checks it against the blockchain record in real time, returning a clear authentic or tampered status almost instantly.',
  },
  {
    question: 'Is the blockchain public?',
    answer:
      'No. The platform uses Hyperledger Fabric 2.5, a permissioned enterprise blockchain. Only enrolled consortium members (the 4 organizations) can submit transactions. All connections use mutual TLS. However, anyone can verify a certificate through the public verification portal — no account or blockchain access required.',
  },
  {
    question: 'What happens if a certificate needs to be revoked?',
    answer:
      'Authorized issuers can revoke a certificate at any time through the dashboard. A revocation transaction is recorded on the blockchain with a timestamp and reason. Subsequent verification attempts will return a revoked status along with the revocation details.',
  },
  {
    question: 'Can I verify without creating an account?',
    answer:
      'Yes. Certificate verification is completely public and does not require an account. You can verify by scanning the QR code printed on the certificate, entering the certificate ID on the verification page, or uploading the certificate file directly.',
  },
  {
    question: 'What data is stored on the blockchain?',
    answer:
      'Only a minimal cryptographic proof is stored on-chain: the SHA-256 hash of the certificate payload, the certificate ID, the issuer\'s ECDSA P-256 signature, issuance and expiry timestamps, and revocation status. Holder IDs are pseudonymous hashes — no email addresses or personally identifiable information are written to the ledger. The full encrypted certificate content lives on IPFS, referenced by its content identifier (CID) which is stored in the PostgreSQL database.',
  },
];

export function HowItWorksPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="gradient-hero-subtle py-20 md:py-28 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <Badge variant="navy" className="mb-6 text-sm px-4 py-1.5">
            <Shield className="h-3.5 w-3.5 mr-1.5" />
            Platform Process
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            How It Works
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Follow the complete journey of a certificate from issuer onboarding through blockchain
            anchoring to instant public verification.
          </p>
        </div>
      </section>

      {/* Step Cards */}
      <section className="py-16 md:py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <SectionHeading
            badge="Step by Step"
            title="The Complete Certificate Lifecycle"
            subtitle="Each step is designed for transparency, security, and ease of use. Click any step to expand its details."
          />
          <div className="space-y-4">
            {steps.map((step, i) => (
              <StepCard
                key={i}
                number={i + 1}
                title={step.title}
                description={step.description}
                detail={step.detail}
                icon={step.icon}
              />
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 md:py-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <SectionHeading
            badge="FAQ"
            title="Frequently Asked Questions"
            subtitle="Common questions about the platform, verification process, and blockchain technology."
          />
          <Accordion className="bg-white rounded-xl border border-border p-2">
            {faqItems.map((item, i) => (
              <AccordionItem key={i} title={item.question}>
                {item.answer}
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <CTABanner
        title="Ready to Get Started?"
        subtitle="Register your organization and start issuing blockchain-anchored certificates today."
        primaryCTA={{ label: 'Register Organization', href: '/register' }}
        secondaryCTA={{ label: 'Why Blockchain?', href: '/why-blockchain' }}
        variant="navy"
      />
    </div>
  );
}
