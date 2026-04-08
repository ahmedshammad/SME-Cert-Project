import { Link } from 'react-router-dom';
import { Cloud, Server, Building2, GitBranch, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { CTABanner } from '@/components/shared/CTABanner';
import { cn } from '@/lib/utils';

const deploymentOptions = [
  {
    icon: Cloud,
    title: 'Cloud SaaS',
    model: 'Multi-tenant cloud',
    who: 'Small to medium organizations',
    features: [
      'Fastest setup with zero infrastructure',
      'Automatic updates and maintenance',
      'Shared infrastructure with data isolation',
    ],
    cost: 'Starting from ~2,500 EGP/mo',
    timeline: '1-2 days',
    color: 'egypt-green',
  },
  {
    icon: Server,
    title: 'Dedicated Tenant',
    model: 'Single-tenant cloud',
    who: 'Medium to large organizations needing isolation',
    features: [
      'Dedicated resources and compute',
      'Custom domain and branding',
      'Enhanced security and network isolation',
    ],
    cost: 'Starting from ~15,000 EGP/mo',
    timeline: '1-2 weeks',
    color: 'egypt-gold',
  },
  {
    icon: Building2,
    title: 'On-Premises',
    model: 'Private cloud or on-prem',
    who: 'Regulated entities and government agencies',
    features: [
      'Full data sovereignty and control',
      'Custom infrastructure and networking',
      'Internal compliance and audit readiness',
    ],
    cost: 'Starting from ~50,000 EGP setup + licensing',
    timeline: '4-8 weeks',
    color: 'egypt-navy',
  },
  {
    icon: GitBranch,
    title: 'Hybrid',
    model: 'Best of both worlds',
    who: 'Organizations needing private data with consortium blockchain',
    features: [
      'Private database and file storage',
      'Consortium blockchain anchoring',
      'Flexible data residency policies',
    ],
    cost: 'Starting from ~25,000 EGP/mo',
    timeline: '2-4 weeks',
    color: 'primary',
  },
];

const comparisonRows = [
  {
    feature: 'Setup Time',
    values: ['1-2 days', '1-2 weeks', '4-8 weeks', '2-4 weeks'],
  },
  {
    feature: 'Data Residency',
    values: ['Cloud provider region', 'Dedicated cloud region', 'Fully on-premises', 'Hybrid (private + chain)'],
  },
  {
    feature: 'Maintenance',
    values: ['Fully managed', 'Managed with options', 'Self-managed', 'Co-managed'],
  },
  {
    feature: 'Scalability',
    values: ['Auto-scaling', 'Configurable scaling', 'Manual scaling', 'Flexible scaling'],
  },
  {
    feature: 'Cost Model',
    values: ['Monthly subscription', 'Monthly subscription', 'Setup + license fees', 'Monthly subscription'],
  },
  {
    feature: 'Blockchain Access',
    values: ['Shared consortium', 'Shared consortium', 'Private or consortium', 'Consortium anchoring'],
  },
];

const columnHeaders = ['Cloud SaaS', 'Dedicated Tenant', 'On-Premises', 'Hybrid'];

const iconColorMap: Record<string, string> = {
  'egypt-green': 'bg-egypt-green/10 text-egypt-green',
  'egypt-gold': 'bg-egypt-gold/10 text-egypt-gold',
  'egypt-navy': 'bg-egypt-navy/10 text-egypt-navy',
  primary: 'bg-primary/10 text-primary',
};

export function DeploymentPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative gradient-hero text-white py-20 md:py-28 px-4 overflow-hidden">
        <div className="absolute inset-0 pattern-dots" />
        <div className="relative container mx-auto text-center max-w-4xl">
          <Badge variant="gold" className="mb-6 text-sm px-4 py-1.5">
            Flexible Infrastructure
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
            Deployment Options
          </h1>
          <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            Choose the deployment model that fits your organization's security requirements,
            compliance needs, and operational preferences.
          </p>
        </div>
      </section>

      {/* Deployment Options Grid */}
      <section className="py-16 md:py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <SectionHeading
            badge="Choose Your Model"
            title="Four Ways to Deploy"
            subtitle="From fully managed cloud to on-premises installations, we offer flexibility for every organization."
          />
          <div className="grid md:grid-cols-2 gap-8">
            {deploymentOptions.map((option) => (
              <Card key={option.title} className="card-hover border-none shadow-sm">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
                        iconColorMap[option.color]
                      )}
                    >
                      <option.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{option.title}</CardTitle>
                      <CardDescription className="mt-1">{option.model}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Best For
                    </p>
                    <p className="text-sm">{option.who}</p>
                  </div>
                  <ul className="space-y-2">
                    {option.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <ArrowRight className="h-4 w-4 text-egypt-green mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div>
                      <p className="text-sm font-semibold text-egypt-navy">{option.cost}</p>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{option.timeline}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 md:py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <SectionHeading
            badge="Side-by-Side"
            title="Compare Deployment Models"
            subtitle="See how each deployment option stacks up across key dimensions."
          />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-sm font-semibold p-3 border-b-2 border-border">
                    Feature
                  </th>
                  {columnHeaders.map((header) => (
                    <th
                      key={header}
                      className="text-center text-xs md:text-sm font-semibold p-2 md:p-3 border-b-2 border-border bg-muted/50 min-w-[100px]"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="text-xs md:text-sm p-2 md:p-3 font-medium">{row.feature}</td>
                    {row.values.map((value, j) => (
                      <td key={j} className="text-xs md:text-sm text-center p-2 md:p-3 bg-muted/20">
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <CTABanner
        title="Need Help Choosing?"
        subtitle="Our team can help you select the best deployment model for your organization's requirements."
        primaryCTA={{ label: 'Request Consultation', href: '/contact' }}
        secondaryCTA={{ label: 'View Pricing', href: '/pricing' }}
        variant="navy"
      />
    </div>
  );
}
