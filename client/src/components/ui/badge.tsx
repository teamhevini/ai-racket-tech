import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center border px-2.5 py-0.5 text-[10px] font-bold tracking-widest uppercase transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-hevini-red text-white',
        secondary: 'border-transparent bg-secondary text-court-white',
        outline: 'border-border text-court-white',
        high: 'border-green-600 bg-green-900/20 text-green-400',
        medium: 'border-yellow-600 bg-yellow-900/20 text-yellow-400',
        estimated: 'border-net-grey/40 bg-net-grey/10 text-net-grey',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant }), className)}
      style={{ borderRadius: '2px' }}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
