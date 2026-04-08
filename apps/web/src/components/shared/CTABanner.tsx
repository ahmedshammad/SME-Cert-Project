import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface CTABannerProps {
  title: string;
  subtitle?: string;
  primaryCTA: { label: string; href: string };
  secondaryCTA?: { label: string; href: string };
  variant?: 'navy' | 'gold' | 'light';
  className?: string;
}

export function CTABanner({ title, subtitle, primaryCTA, secondaryCTA, variant = 'navy', className }: CTABannerProps) {
  return (
    <section className={cn(
      'py-16 px-4',
      variant === 'navy' && 'gradient-navy text-white',
      variant === 'gold' && 'gradient-gold text-egypt-navy',
      variant === 'light' && 'bg-muted',
      className
    )}>
      <div className="container mx-auto max-w-4xl text-center">
        <h2 className={cn('text-2xl md:text-3xl font-bold mb-3', variant === 'light' && 'text-foreground')}>
          {title}
        </h2>
        {subtitle && (
          <p className={cn('text-lg mb-8 opacity-90', variant === 'light' && 'text-muted-foreground')}>
            {subtitle}
          </p>
        )}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to={primaryCTA.href}>
            <Button
              size="lg"
              className={cn(
                variant === 'navy' && 'bg-egypt-gold text-egypt-navy hover:bg-egypt-gold-light',
                variant === 'gold' && 'bg-egypt-navy text-white hover:bg-egypt-navy-light'
              )}
            >
              {primaryCTA.label}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          {secondaryCTA && (
            <Link to={secondaryCTA.href}>
              <Button
                size="lg"
                variant="outline"
                className={cn(
                  (variant === 'navy' || variant === 'gold') && 'border-white/30 text-white hover:bg-white/10'
                )}
              >
                {secondaryCTA.label}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
