import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, Palette, Code2, BarChart3, ShieldCheck, Calculator,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { PricingCard } from '@/components/shared/PricingCard';
import { CTABanner } from '@/components/shared/CTABanner';
import { Slider } from '@/components/ui/slider';

const plans = [
  {
    name: 'Starter',
    price: '~2,500',
    description: 'For small issuers getting started',
    features: [
      'Up to 100 certificates/month',
      '3 user accounts',
      '5 GB storage',
      'Email support',
      'Basic analytics',
      'QR verification',
    ],
    cta: { label: 'Get Started', href: '/register' },
  },
  {
    name: 'Business',
    price: '~7,500',
    popular: true,
    description: 'For growing organizations',
    features: [
      'Up to 500 certificates/month',
      '10 user accounts',
      '25 GB storage',
      'Priority support',
      'Custom branding',
      'API access',
      'Advanced analytics',
    ],
    cta: { label: 'Start Free Trial', href: '/register' },
  },
  {
    name: 'Enterprise',
    price: '~20,000+',
    description: 'For high-volume issuers',
    features: [
      'Unlimited certificates',
      'Unlimited users',
      '100 GB storage',
      'Dedicated support & SLA',
      'Custom integration',
      'Advanced governance',
      'Audit reports',
      'On-premise option',
    ],
    cta: { label: 'Contact Sales', href: '/contact' },
  },
];

const addOns = [
  {
    icon: Package,
    title: 'Extra Certificate Pack',
    description: '500 additional certificates',
    price: '~1,500 EGP',
  },
  {
    icon: Palette,
    title: 'Custom Branding',
    description: 'White-label certificate templates',
    price: '~2,000 EGP one-time',
  },
  {
    icon: Code2,
    title: 'API Access',
    description: 'RESTful API for integrations',
    price: '~1,000 EGP/mo',
  },
  {
    icon: BarChart3,
    title: 'Advanced Reports',
    description: 'Custom analytics and dashboards',
    price: '~1,500 EGP/mo',
  },
  {
    icon: ShieldCheck,
    title: 'SLA Upgrade',
    description: '99.9% uptime guarantee',
    price: '~3,000 EGP/mo',
  },
];

function calculateEstimatedCost(certificates: number, users: number): number {
  let base: number;
  if (certificates <= 100) {
    base = 2500;
  } else if (certificates <= 500) {
    base = 7500;
  } else {
    base = 20000;
  }

  const extraUsers = Math.max(0, users - 3);
  const userCost = Math.ceil(extraUsers / 10) * 500;

  return base + userCost;
}

export function PricingPage() {
  const [certificates, setCertificates] = useState(100);
  const [users, setUsers] = useState(3);

  const estimatedCost = calculateEstimatedCost(certificates, users);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative gradient-hero text-white py-20 md:py-28 px-4 overflow-hidden">
        <div className="absolute inset-0 pattern-dots" />
        <div className="relative container mx-auto text-center max-w-4xl">
          <Badge variant="gold" className="mb-6 text-sm px-4 py-1.5">
            Prices in EGP
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            All prices are estimated ranges in Egyptian Pounds (EGP). Choose the plan that fits your
            organization's needs and scale as you grow.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 md:py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 items-start">
            {plans.map((plan) => (
              <PricingCard
                key={plan.name}
                name={plan.name}
                price={plan.price}
                description={plan.description}
                features={plan.features}
                cta={plan.cta}
                popular={plan.popular}
              />
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-8 max-w-2xl mx-auto">
            All prices are estimated monthly ranges in EGP. Final pricing depends on usage volume
            and deployment configuration.
          </p>
        </div>
      </section>

      {/* Add-ons Section */}
      <section className="py-16 md:py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <SectionHeading
            badge="Flexible Add-ons"
            title="Enhance Your Plan"
            subtitle="Add extra capabilities to any plan as your needs evolve."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {addOns.map((addon, i) => (
              <Card key={i} className="card-hover border-none shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-egypt-gold/10 rounded-lg flex items-center justify-center shrink-0">
                      <addon.icon className="h-5 w-5 text-egypt-gold" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{addon.title}</CardTitle>
                      <CardDescription>{addon.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <span className="text-lg font-bold text-egypt-navy">{addon.price}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Cost Calculator Section */}
      <section className="py-16 md:py-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <SectionHeading
            badge="Cost Calculator"
            title="Estimate Your Monthly Cost"
            subtitle="Adjust the sliders to see an approximate cost based on your expected usage."
          />
          <Card className="shadow-md">
            <CardContent className="pt-6 space-y-8">
              <Slider
                min={50}
                max={2000}
                step={50}
                value={certificates}
                onChange={setCertificates}
                label="Certificates per Month"
                formatValue={(v) => v.toLocaleString()}
              />
              <Slider
                min={1}
                max={50}
                step={1}
                value={users}
                onChange={setUsers}
                label="User Accounts"
                formatValue={(v) => `${v} users`}
              />
              <div className="border-t pt-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Calculator className="h-5 w-5 text-egypt-gold" />
                  <span className="text-sm text-muted-foreground font-medium">
                    Estimated Monthly Cost
                  </span>
                </div>
                <p className="text-4xl font-bold text-egypt-navy">
                  ~{estimatedCost.toLocaleString()} EGP
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  This is an estimate. Actual pricing may vary based on deployment and configuration.
                </p>
                <Link to="/contact" className="inline-block mt-4">
                  <Button variant="outline">
                    Get a Custom Quote
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <CTABanner
        title="Ready to Get Started?"
        subtitle="Choose a plan that fits your needs or contact us for a custom quote."
        primaryCTA={{ label: 'Register Organization', href: '/register' }}
        secondaryCTA={{ label: 'Contact Sales', href: '/contact' }}
        variant="navy"
      />
    </div>
  );
}
