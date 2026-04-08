import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, ArrowDown } from 'lucide-react';

interface DiagramNode {
  label: string;
  icon: LucideIcon;
  color: 'navy' | 'green' | 'gold' | 'blue' | 'gray';
  sublabel?: string;
}

interface DiagramBlockProps {
  nodes: DiagramNode[];
  direction?: 'horizontal' | 'vertical';
  title?: string;
  className?: string;
}

const colorMap = {
  navy: 'bg-egypt-navy/10 text-egypt-navy border-egypt-navy/20',
  green: 'bg-egypt-green/10 text-egypt-green border-egypt-green/20',
  gold: 'bg-egypt-gold/10 text-egypt-gold border-egypt-gold/20',
  blue: 'bg-primary/10 text-primary border-primary/20',
  gray: 'bg-muted text-muted-foreground border-border',
};

export function DiagramBlock({ nodes, direction = 'horizontal', title, className }: DiagramBlockProps) {
  const Arrow = direction === 'horizontal' ? ArrowRight : ArrowDown;

  return (
    <div className={cn('', className)}>
      {title && <h3 className="text-lg font-semibold mb-6 text-center">{title}</h3>}
      <div className={cn(
        'flex items-center gap-2',
        direction === 'horizontal' ? 'flex-row flex-wrap justify-center' : 'flex-col'
      )}>
        {nodes.map((node, i) => (
          <div key={i} className={cn('flex items-center gap-2', direction === 'vertical' && 'flex-col')}>
            <div className={cn(
              'flex items-center gap-2 px-3 md:px-4 py-2.5 md:py-3 rounded-lg border-2 min-w-[100px] md:min-w-[120px] justify-center',
              colorMap[node.color]
            )}>
              <node.icon className="h-5 w-5 shrink-0" />
              <div>
                <span className="text-sm font-semibold">{node.label}</span>
                {node.sublabel && <p className="text-xs opacity-70">{node.sublabel}</p>}
              </div>
            </div>
            {i < nodes.length - 1 && (
              <Arrow className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface SplitDiagramProps {
  title?: string;
  left: { title: string; items: { label: string; icon: LucideIcon }[] };
  right: { title: string; items: { label: string; icon: LucideIcon }[] };
  className?: string;
}

export function SplitDiagram({ title, left, right, className }: SplitDiagramProps) {
  return (
    <div className={cn('', className)}>
      {title && <h3 className="text-lg font-semibold mb-6 text-center">{title}</h3>}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-egypt-navy/5 rounded-xl p-6 border-2 border-egypt-navy/10">
          <h4 className="font-semibold text-egypt-navy mb-4 text-center">{left.title}</h4>
          <div className="space-y-2">
            {left.items.map((item, i) => (
              <div key={i} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 text-sm">
                <item.icon className="h-4 w-4 text-egypt-navy" />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-egypt-green/5 rounded-xl p-6 border-2 border-egypt-green/10">
          <h4 className="font-semibold text-egypt-green mb-4 text-center">{right.title}</h4>
          <div className="space-y-2">
            {right.items.map((item, i) => (
              <div key={i} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 text-sm">
                <item.icon className="h-4 w-4 text-egypt-green" />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
