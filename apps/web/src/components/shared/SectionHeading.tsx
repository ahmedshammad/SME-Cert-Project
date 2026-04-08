import { cn } from '@/lib/utils';

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  badge?: string;
  align?: 'left' | 'center';
  className?: string;
}

export function SectionHeading({ title, subtitle, badge, align = 'center', className }: SectionHeadingProps) {
  return (
    <div className={cn(align === 'center' ? 'text-center' : 'text-left', 'mb-12', className)}>
      {badge && (
        <div className={cn('inline-flex items-center gap-2 bg-egypt-gold/10 text-egypt-gold px-4 py-1.5 rounded-full mb-4', align === 'center' && 'mx-auto')}>
          <span className="text-xs font-semibold uppercase tracking-wider">{badge}</span>
        </div>
      )}
      <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{title}</h2>
      {subtitle && (
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>
      )}
    </div>
  );
}
