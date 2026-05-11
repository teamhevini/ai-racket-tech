import * as React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      'flex min-h-[80px] w-full border border-border bg-secondary px-3 py-2 text-sm text-court-white placeholder:text-net-grey focus:outline-none focus:ring-2 focus:ring-hevini-red disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    style={{ borderRadius: '2px' }}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export { Textarea };
