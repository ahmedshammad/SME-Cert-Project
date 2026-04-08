import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PricingCardProps {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  cta: { label: string; href: string };
  popular?: boolean;
  className?: string;
}

export function PricingCard({ name, price, period = '/month', description, features, cta, popular, className }: PricingCardProps) {
  return (
    <div className={cn(
      'relative flex flex-col rounded-2xl border bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-lg',
      popular && 'border-egypt-gold shadow-md scale-[1.02]',
      className
    )}>
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-egypt-gold text-white text-xs font-semibold px-4 py-1 rounded-full">
            Most Popular
          </span>
        </div>
      )}
      <div className="mb-6">
        <h3 className="text-xl font-bold">{name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="mb-6">
        <span className="text-4xl font-bold text-egypt-navy">{price}</span>
        <span className="text-sm text-muted-foreground ml-1">EGP{period}</span>
      </div>
      <ul className="space-y-3 mb-8 flex-1">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <Check className="h-4 w-4 text-egypt-green mt-0.5 shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Link to={cta.href}>
        <Button
          className={cn('w-full', popular ? 'bg-egypt-gold hover:bg-egypt-gold-light text-egypt-navy' : '')}
          variant={popular ? 'default' : 'outline'}
          size="lg"
        >
          {cta.label}
        </Button>
      </Link>
    </div>
  );
}
