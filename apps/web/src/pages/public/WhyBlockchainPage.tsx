import {
  Fingerprint, FileCheck, ShieldCheck, Clock, Link2,
  File, Database, Paperclip, Layers,
  Shield, Search, Users, AlertTriangle, CheckCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { SplitDiagram } from '@/components/shared/DiagramBlock';
import { ComparisonTable } from '@/components/shared/ComparisonTable';
import { CTABanner } from '@/components/shared/CTABanner';

const onChainItems = [
  { label: 'Hash (SHA-256 Fingerprint)', icon: Fingerprint },
  { label: 'Certificate ID', icon: FileCheck },
  { label: 'Issuer Signature', icon: ShieldCheck },
  { label: 'Timestamps', icon: Clock },
  { label: 'Verification Pointers', icon: Link2 },
];

const offChainItems = [
  { label: 'Certificate File', icon: File },
  { label: 'Extended Metadata', icon: Database },
  { label: 'Attachments', icon: Paperclip },
  { label: 'Templates', icon: Layers },
];

const whyItMattersCards = [
  {
    icon: Shield,
    title: 'Tamper Evidence',
    description:
      'Any modification to a certificate is immediately detectable because the on-chain hash will no longer match the document. This provides cryptographic proof of integrity without relying on a single authority.',
  },
  {
    icon: Search,
    title: 'Auditability',
    description:
      'Every issuance, revocation, and verification event is permanently recorded with timestamps and actor identities. Regulators and auditors can independently review the complete certificate lifecycle.',
  },
  {
    icon: Users,
    title: 'Shared Trust',
    description:
      'Multiple organizations participate in a consortium network, eliminating single points of control. Trust is distributed across peers rather than concentrated in one database administrator.',
  },
  {
    icon: AlertTriangle,
    title: 'Reduced Fraud',
    description:
      'Forging a certificate requires compromising the blockchain consensus of multiple independent organizations simultaneously. This raises the cost and complexity of fraud beyond practical feasibility.',
  },
  {
    icon: CheckCircle,
    title: 'Independent Verification',
    description:
      'Anyone can verify a certificate without contacting the issuer or relying on the issuer\'s systems being online. Verification is self-service, instant, and available around the clock.',
  },
];

const comparisonRows = [
  { feature: 'Tamper Detection', traditional: 'no' as const, blockchain: 'yes' as const },
  { feature: 'Independent Verification', traditional: 'no' as const, blockchain: 'yes' as const },
  { feature: 'Audit Trail Integrity', traditional: 'partial' as const, blockchain: 'yes' as const },
  { feature: 'Shared Trust', traditional: 'no' as const, blockchain: 'yes' as const },
  { feature: 'Fraud Prevention', traditional: 'partial' as const, blockchain: 'yes' as const },
  { feature: 'Regulatory Compliance', traditional: 'partial' as const, blockchain: 'yes' as const },
];

export function WhyBlockchainPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="gradient-hero-subtle py-20 md:py-28 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <Badge variant="navy" className="mb-6 text-sm px-4 py-1.5">
            <Shield className="h-3.5 w-3.5 mr-1.5" />
            Platform Architecture
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Why Blockchain?
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Understand the business value of blockchain anchoring and how it elevates certificate
            trust beyond what a traditional database can offer.
          </p>
        </div>
      </section>

      {/* On-chain vs Off-chain Diagram */}
      <section className="py-16 md:py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <SectionHeading
            badge="Data Architecture"
            title="What Goes On-Chain vs Off-Chain"
            subtitle="We store only the cryptographic proof on the blockchain. Sensitive and bulky data stays off-chain for privacy and performance."
          />
          <SplitDiagram
            title="Certificate Data Split"
            left={{ title: 'On-Chain (Blockchain)', items: onChainItems }}
            right={{ title: 'Off-Chain (Secure Storage)', items: offChainItems }}
          />
        </div>
      </section>

      {/* Why It Matters */}
      <section className="py-16 md:py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <SectionHeading
            badge="Business Value"
            title="Why It Matters"
            subtitle="Blockchain anchoring delivers tangible security and trust advantages that traditional databases cannot replicate."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {whyItMattersCards.map((card, i) => (
              <Card key={i} className="card-hover border-none shadow-sm bg-gradient-to-b from-white to-muted/30">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 bg-egypt-green/10 rounded-xl flex items-center justify-center mb-4">
                    <card.icon className="h-6 w-6 text-egypt-green" />
                  </div>
                  <h3 className="font-semibold mb-2">{card.title}</h3>
                  <p className="text-sm text-muted-foreground">{card.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 md:py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <SectionHeading
            badge="Side by Side"
            title="Database Only vs Blockchain-Anchored"
            subtitle="A direct comparison of capabilities between a conventional database approach and our blockchain-anchored architecture."
          />
          <Card className="border-none shadow-sm">
            <CardContent className="pt-6">
              <ComparisonTable
                headers={['Database Only', 'Blockchain-Anchored']}
                rows={comparisonRows}
              />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <CTABanner
        title="Ready to Issue Tamper-Proof Certificates?"
        subtitle="Join organizations already leveraging blockchain-anchored credentials for trust and compliance."
        primaryCTA={{ label: 'Register Organization', href: '/register' }}
        secondaryCTA={{ label: 'See How It Works', href: '/how-it-works' }}
        variant="navy"
      />
    </div>
  );
}
