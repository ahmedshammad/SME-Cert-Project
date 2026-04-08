import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface StepCardProps {
  number: number;
  title: string;
  description: string;
  detail?: string;
  icon: LucideIcon;
  className?: string;
}

export function StepCard({ number, title, description, detail, icon: Icon, className }: StepCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        'relative bg-white rounded-xl border border-border p-6 card-hover cursor-pointer',
        className
      )}
      onClick={() => detail && setExpanded(!expanded)}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-egypt-navy text-white flex items-center justify-center text-sm font-bold">
            {number}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Icon className="h-5 w-5 text-egypt-green" />
            <h3 className="font-semibold text-foreground">{title}</h3>
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
          {detail && (
            <>
              <div className={cn('overflow-hidden transition-all duration-300', expanded ? 'max-h-40 mt-3' : 'max-h-0')}>
                <p className="text-sm text-muted-foreground border-t pt-3">{detail}</p>
              </div>
              <ChevronDown className={cn('h-4 w-4 text-muted-foreground mt-2 transition-transform', expanded && 'rotate-180')} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
