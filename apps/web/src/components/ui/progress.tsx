import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface ProgressStepsProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export function ProgressSteps({ steps, currentStep, className }: ProgressStepsProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      {steps.map((step, index) => (
        <div key={index} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors',
                index < currentStep
                  ? 'border-egypt-green bg-egypt-green text-white'
                  : index === currentStep
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-muted-foreground/30 text-muted-foreground'
              )}
            >
              {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            <span className={cn(
              'mt-1.5 text-xs font-medium max-w-[80px] text-center',
              index <= currentStep ? 'text-foreground' : 'text-muted-foreground'
            )}>
              {step}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className={cn(
              'mx-2 h-0.5 w-12 md:w-20',
              index < currentStep ? 'bg-egypt-green' : 'bg-muted-foreground/20'
            )} />
          )}
        </div>
      ))}
    </div>
  );
}
