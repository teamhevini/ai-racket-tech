import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full border border-border bg-secondary px-3 py-2 text-sm text-court-white placeholder:text-net-grey focus:outline-none focus:ring-2 focus:ring-hevini-red disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      style={{ borderRadius: '2px' }}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = 'Input';

export { Input };
