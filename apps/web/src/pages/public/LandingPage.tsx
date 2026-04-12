import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, CheckCircle, Lock, ArrowRight, FileCheck, Layers,
  TrendingUp, Eye, Clock, ShieldCheck, Building2, Users, Zap,
  Award, BarChart3, Fingerprint, ChevronDown, GraduationCap,
  Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { StatCounter } from '@/components/shared/StatCounter';
import { StepCard } from '@/components/shared/StepCard';
import { CTABanner } from '@/components/shared/CTABanner';

const visionPillars = [
  { icon: Zap, title: 'Digital Transformation', description: 'Digitize certificate workflows with modern cloud and blockchain infrastructure.' },
  { icon: Eye, title: 'Transparency', description: 'Every certificate action is recorded on an immutable blockchain ledger.' },
  { icon: TrendingUp, title: 'Economic Empowerment', description: 'Enable SMEs to issue and manage trusted certificates at scale.' },
  { icon: ShieldCheck, title: 'Compliance & Trust', description: 'Meet regulatory requirements with built-in audit trails and verification.' },
];

const howItWorksSteps = [
  { icon: Building2, title: 'Register Organization', description: 'Onboard your organization and set up administrator accounts.', detail: 'Complete a guided registration with organization verification, role assignment, and initial configuration.' },
  { icon: Layers, title: 'Create Templates', description: 'Design reusable certificate templates with custom fields and schemas.', detail: 'Use the template builder to define certificate structure, required claims, and visual layout. Templates can be versioned so previously issued certificates remain valid.' },
  { icon: FileCheck, title: 'Issue Certificates', description: 'Issue digital certificates to holders with verified data.', detail: 'Fill in certificate data for a specific holder, then sign the issuance with an ECDSA P-256 key. The holder is notified and can access their certificate through the holder portal.' },
  { icon: Fingerprint, title: 'Blockchain Anchoring', description: 'Certificate hash and ECDSA signature are anchored to Hyperledger Fabric 2.5.', detail: 'A SHA-256 hash of the payload, the certificate ID, the issuer signature, and timestamps are committed to the ledger by 3 Raft orderers after 4-org endorsement. Immutable — no party can alter or delete it.' },
  { icon: Database, title: 'Encrypted Off-Chain Storage', description: 'The full payload is AES-256-GCM encrypted and pinned to IPFS Kubo.', detail: 'Envelope encryption gives each certificate its own data key, wrapped with the holder\'s public key. The IPFS content identifier (CID) is stored in the database, keeping the ledger lean without sacrificing privacy.' },
  { icon: CheckCircle, title: 'Instant Verification', description: 'Anyone can verify a certificate via QR code, ID, or file upload — no account needed.', detail: 'Verification re-computes the SHA-256 hash of the presented certificate and compares it against the on-chain record. If they match the certificate is authentic and unaltered. The entire process completes in under 3 seconds.' },
];

const benefits = [
  { icon: Shield, title: 'Fraud Reduction', description: 'Tamper-proof blockchain anchoring makes certificate forgery virtually impossible. Every certificate is hashed and anchored to the ledger, ensuring authenticity.' },
  { icon: BarChart3, title: 'Audit Readiness', description: 'Complete audit trails with timestamped records of every certificate action. Always prepared for regulatory review or compliance checks.' },
  { icon: Clock, title: 'Faster Verification', description: 'Verify any certificate in seconds instead of days of manual checking. QR scan, ID lookup, or file upload verification available 24/7.' },
  { icon: Users, title: 'Trusted Sharing', description: 'Share certificates with partners, regulators, and stakeholders through verifiable links with granular access controls.' },
  { icon: Zap, title: 'Operational Efficiency', description: 'Automate issuance workflows and eliminate paper-based processes. Reduce administrative overhead and focus on core business.' },
];

const trustSignals = [
  { icon: Fingerprint, label: 'Hyperledger Fabric 2.5', sub: 'Permissioned enterprise blockchain' },
  { icon: Lock, label: 'AES-256-GCM + ECDSA P-256', sub: 'Envelope encryption & digital signatures' },
  { icon: Building2, label: '4-Org Consortium', sub: 'Raft consensus, 3 orderers, 8 peers' },
  { icon: ShieldCheck, label: '7-Role RBAC', sub: 'API + chaincode layer enforcement' },
];

export function LandingPage() {
  const [supervisionExpanded, setSupervisionExpanded] = useState(false);
  const [expandedBenefit, setExpandedBenefit] = useState<number | null>(null);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative gradient-hero text-white py-20 md:py-28 px-4 overflow-hidden">
        <div className="absolute inset-0 pattern-dots" />
        <div className="relative container mx-auto text-center max-w-4xl">
          <Badge variant="gold" className="mb-6 text-sm px-4 py-1.5">
            <Award className="h-3.5 w-3.5 mr-1.5" />
            Aligned with Egypt Vision 2030
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
            Empowering Egypt's SMEs with{' '}
            <span className="text-egypt-gold-light">Trusted Digital Certificates</span>
          </h1>
          <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            A blockchain-anchored certificate issuance and verification platform built for transparency,
            compliance, and digital transformation.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register">
              <Button size="lg" className="bg-egypt-gold text-egypt-navy hover:bg-egypt-gold-light font-semibold">
                Register Organization
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline" className="bg-transparent border-white/50 text-white hover:bg-white/15 hover:border-white hover:text-white">
                Request Demo
              </Button>
            </Link>
            <Link to="/verify">
              <Button size="lg" variant="outline" className="bg-transparent border-egypt-gold/70 text-egypt-gold-light hover:bg-egypt-gold/15 hover:border-egypt-gold hover:text-egypt-gold-light">
                Verify Certificate
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Supervision Note */}
      <div className="bg-egypt-navy/5 border-b border-egypt-navy/10">
        <div className="container mx-auto max-w-4xl px-4 py-3">
          <button
            className="flex items-center gap-2 mx-auto text-sm text-egypt-navy/70 hover:text-egypt-navy transition-colors"
            onClick={() => setSupervisionExpanded(!supervisionExpanded)}
          >
            <GraduationCap className="h-4 w-4 shrink-0" />
            <span>
              Under the supervision of Prof. Ghada El Khayat, Information Systems Dept., Alexandria University
            </span>
            <ChevronDown className={`h-3 w-3 transition-transform ${supervisionExpanded ? 'rotate-180' : ''}`} />
          </button>
          {supervisionExpanded && (
            <p className="text-xs text-egypt-navy/50 text-center mt-2 max-w-xl mx-auto animate-fade-in">
              This platform is developed under the academic supervision of Professor Ghada El Khayat,
              Chairperson of the Information Systems and Computers Department, Faculty of Business, Alexandria University.
            </p>
          )}
        </div>
      </div>

      {/* Egypt Vision 2030 Alignment */}
      <section className="py-16 md:py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <SectionHeading
            badge="Egypt Vision 2030"
            title="Aligned with National Digital Strategy"
            subtitle="Supporting Egypt's transformation goals through trusted digital infrastructure for SMEs."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {visionPillars.map((pillar, i) => (
              <Card key={i} className="card-hover border-none shadow-sm bg-gradient-to-b from-white to-muted/30">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 bg-egypt-green/10 rounded-xl flex items-center justify-center mb-4">
                    <pillar.icon className="h-6 w-6 text-egypt-green" />
                  </div>
                  <h3 className="font-semibold mb-2">{pillar.title}</h3>
                  <p className="text-sm text-muted-foreground">{pillar.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <SectionHeading
            badge="Simple Process"
            title="How It Works"
            subtitle="From organization registration to instant certificate verification in six clear steps."
          />
          <div className="space-y-4">
            {howItWorksSteps.map((step, i) => (
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
          <div className="text-center mt-8">
            <Link to="/how-it-works">
              <Button variant="outline">
                Learn More About the Process
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Key Benefits */}
      <section className="py-16 md:py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <SectionHeading
            badge="Business Value"
            title="Key Benefits"
            subtitle="Real outcomes that matter for your organization."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, i) => (
              <Card
                key={i}
                className="card-hover cursor-pointer border-none shadow-sm"
                onClick={() => setExpandedBenefit(expandedBenefit === i ? null : i)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-egypt-gold/10 rounded-lg flex items-center justify-center shrink-0">
                      <benefit.icon className="h-5 w-5 text-egypt-gold" />
                    </div>
                    <h3 className="font-semibold">{benefit.title}</h3>
                  </div>
                  <p className={`text-sm text-muted-foreground transition-all duration-300 ${expandedBenefit === i ? '' : 'line-clamp-2'}`}>
                    {benefit.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Impact Counters */}
      <section className="py-16 px-4 gradient-hero-subtle">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatCounter icon={Clock} value="80%" label="Time Saved on Verification" />
            <StatCounter icon={Shield} value="99.9%" label="Fraud Prevention Rate" />
            <StatCounter icon={BarChart3} value="100%" label="Audit Trail Coverage" />
            <StatCounter icon={Zap} value="< 3s" label="Average Verification Time" />
          </div>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="py-16 md:py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <SectionHeading
            title="Built on Enterprise-Grade Technology"
            subtitle="Security and reliability you can trust."
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {trustSignals.map((signal, i) => (
              <div key={i} className="text-center p-4">
                <div className="w-14 h-14 bg-egypt-navy/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <signal.icon className="h-7 w-7 text-egypt-navy" />
                </div>
                <p className="font-semibold text-sm">{signal.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{signal.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <CTABanner
        title="Ready to Transform Your Certificate Management?"
        subtitle="Join Egypt's growing network of trusted certificate issuers and verifiers."
        primaryCTA={{ label: 'Register Organization', href: '/register' }}
        secondaryCTA={{ label: 'View Pricing', href: '/pricing' }}
        variant="navy"
      />
    </div>
  );
}
