import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCounterProps {
  icon?: LucideIcon;
  value: string;
  label: string;
  suffix?: string;
  className?: string;
}

export function StatCounter({ icon: Icon, value, label, suffix, className }: StatCounterProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        'flex flex-col items-center p-6 opacity-0',
        isVisible && 'animate-count-up',
        className
      )}
    >
      {Icon && (
        <div className="w-12 h-12 bg-egypt-gold/10 rounded-full flex items-center justify-center mb-3">
          <Icon className="h-6 w-6 text-egypt-gold" />
        </div>
      )}
      <div className="text-3xl md:text-4xl font-bold text-egypt-navy">
        {value}{suffix}
      </div>
      <div className="mt-1 text-sm text-muted-foreground font-medium">{label}</div>
    </div>
  );
}
