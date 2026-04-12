import { cn } from '@/lib/utils';
import { Check, X, Minus } from 'lucide-react';

interface ComparisonRow {
  feature: string;
  traditional: 'yes' | 'no' | 'partial' | string;
  blockchain: 'yes' | 'no' | 'partial' | string;
}

interface ComparisonTableProps {
  title?: string;
  headers: [string, string];
  rows: ComparisonRow[];
  className?: string;
}

function CellIcon({ value }: { value: string }) {
  if (value === 'yes') return <Check className="h-5 w-5 text-egypt-green mx-auto" />;
  if (value === 'no') return <X className="h-5 w-5 text-destructive mx-auto" />;
  if (value === 'partial') return <Minus className="h-5 w-5 text-warning mx-auto" />;
  return <span className="text-sm text-center block">{value}</span>;
}

export function ComparisonTable({ title, headers, rows, className }: ComparisonTableProps) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left text-sm font-semibold p-3 border-b-2 border-border">Feature</th>
            <th className="text-center text-sm font-semibold p-3 border-b-2 border-border bg-muted/50">{headers[0]}</th>
            <th className="text-center text-sm font-semibold p-3 border-b-2 border-border bg-egypt-green/5">{headers[1]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border hover:bg-muted/30 transition-colors">
              <td className="text-sm p-3 font-medium">{row.feature}</td>
              <td className="p-3 bg-muted/20"><CellIcon value={row.traditional} /></td>
              <td className="p-3 bg-egypt-green/5"><CellIcon value={row.blockchain} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
