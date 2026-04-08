import {
  Shield, Eye, TrendingUp, Building2, Users, Award,
  GraduationCap, Globe, Target, Lightbulb, CheckCircle,
  Lock, BarChart3, Zap, FileCheck, ShieldCheck
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { CTABanner } from '@/components/shared/CTABanner';

const vision2030Goals = [
  { icon: Lightbulb, title: 'Knowledge Economy', desc: 'Supporting the shift toward a knowledge-driven economy through digital certification of skills and competencies.' },
  { icon: TrendingUp, title: 'Economic Growth', desc: 'Enabling SMEs to participate in the formal economy with trusted, verifiable digital credentials.' },
  { icon: Globe, title: 'Digital Inclusion', desc: 'Making professional certification accessible to organizations of all sizes across Egypt.' },
  { icon: Target, title: 'Governance & Transparency', desc: 'Building trust through transparent, auditable certificate management processes.' },
];

const businessValues = [
  { icon: Shield, title: 'Fraud Reduction', business: 'Protect your brand reputation. Eliminate certificate forgery with blockchain-anchored verification.', metric: 'Up to 99.9% fraud prevention' },
  { icon: BarChart3, title: 'Audit Readiness', business: 'Be always prepared for regulatory reviews. Every action is timestamped and traceable.', metric: '100% audit trail coverage' },
  { icon: Zap, title: 'Operational Efficiency', business: 'Reduce manual verification effort from days to seconds. Automate certificate workflows.', metric: '80% time savings' },
  { icon: Users, title: 'Stakeholder Trust', business: 'Build confidence with partners, regulators, and customers through independently verifiable certificates.', metric: 'Independent verification' },
  { icon: Lock, title: 'Data Protection', business: 'Military-grade encryption protects sensitive certificate data at rest and in transit.', metric: 'AES-256-GCM encryption' },
  { icon: FileCheck, title: 'Compliance', business: 'Meet regulatory requirements with built-in governance controls and transparent processes.', metric: 'Role-based access control' },
];

const consortiumOrgs = [
  { name: 'Ministry of Trade (Org1)', mspId: 'Org1MSP', role: 'Primary government authority. Provides oversight, policy enforcement, and regulatory compliance monitoring for the consortium network.' },
  { name: 'MSMEDA (Org2)', mspId: 'Org2MSP', role: 'Micro, Small & Medium Enterprises Development Agency. Manages SME registration, issues business development certificates, and governs holder identities.' },
  { name: 'Training Providers (Org3)', mspId: 'Org3MSP', role: 'Accredited training institutions. Issue professional development, skill certification, and course completion certificates to SME holders.' },
  { name: 'External Auditors (Org4)', mspId: 'Org4MSP', role: 'Independent audit and assurance body. Performs compliance verification, third-party audits, and quality attestations on the consortium ledger.' },
];

export function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="gradient-hero text-white py-16 md:py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 pattern-dots" />
        <div className="relative container mx-auto max-w-4xl text-center">
          <Badge variant="gold" className="mb-4">
            <Award className="h-3.5 w-3.5 mr-1.5" />
            About the Platform
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Trusted Certificates for{' '}
            <span className="text-egypt-gold-light">Egypt's Digital Future</span>
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            A blockchain-powered certificate platform aligned with Egypt Vision 2030,
            designed to bring trust, transparency, and efficiency to SME credential management.
          </p>
        </div>
      </section>

      {/* Vision 2030 Alignment */}
      <section className="py-16 md:py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <SectionHeading
            badge="Egypt Vision 2030"
            title="Aligned with National Development Goals"
            subtitle="Our platform directly supports Egypt's strategic pillars for economic modernization."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            {vision2030Goals.map((goal, i) => (
              <Card key={i} className="card-hover border-none shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-egypt-green/10 rounded-xl flex items-center justify-center shrink-0">
                      <goal.icon className="h-6 w-6 text-egypt-green" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{goal.title}</h3>
                      <p className="text-sm text-muted-foreground">{goal.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Business Value */}
      <section className="py-16 md:py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <SectionHeading
            badge="Business Value"
            title="Security Controls, Business Outcomes"
            subtitle="Every technical feature translates into real business value for your organization."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {businessValues.map((val, i) => (
              <Card key={i} className="card-hover">
                <CardContent className="pt-6">
                  <div className="w-10 h-10 bg-egypt-gold/10 rounded-lg flex items-center justify-center mb-3">
                    <val.icon className="h-5 w-5 text-egypt-gold" />
                  </div>
                  <h3 className="font-semibold mb-2">{val.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{val.business}</p>
                  <Badge variant="success" className="text-xs">{val.metric}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Consortium Model */}
      <section className="py-16 md:py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <SectionHeading
            title="Four-Organization Consortium"
            subtitle="A multi-stakeholder governance model with each organization running its own Fabric peers and co-signing every transaction."
          />
          <div className="grid sm:grid-cols-2 gap-4">
            {consortiumOrgs.map((org, i) => (
              <div key={i} className="flex items-start gap-4 p-5 rounded-xl border bg-white hover:shadow-sm transition-shadow">
                <div className="w-9 h-9 bg-egypt-navy/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <Building2 className="h-4 w-4 text-egypt-navy" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h4 className="font-semibold text-sm">{org.name}</h4>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">{org.mspId}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{org.role}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-center text-muted-foreground mt-6">
            Certificate issuance requires endorsement from at least 2 of 4 organizations (MAJORITY policy) before the transaction is committed by the 3-orderer Raft cluster.
          </p>
        </div>
      </section>

      {/* Supervision */}
      <section className="py-12 px-4 bg-egypt-navy/5">
        <div className="container mx-auto max-w-3xl text-center">
          <GraduationCap className="h-10 w-10 text-egypt-navy mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Academic Supervision</h3>
          <p className="text-muted-foreground">
            This platform is developed under the academic supervision of{' '}
            <strong>Professor Ghada El Khayat</strong>, Chairperson of the Information Systems
            and Computers Department, Faculty of Business, Alexandria University.
          </p>
        </div>
      </section>

      <CTABanner
        title="Ready to Join Egypt's Trusted Certificate Network?"
        subtitle="Register your organization and start issuing verifiable certificates today."
        primaryCTA={{ label: 'Register Organization', href: '/register' }}
        secondaryCTA={{ label: 'View Pricing', href: '/pricing' }}
      />
    </div>
  );
}
