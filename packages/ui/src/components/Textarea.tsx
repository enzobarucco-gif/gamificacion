import * as React from 'react';
import { cn } from '../lib/utils.js';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-md border bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
          'disabled:cursor-not-allowed disabled:opacity-50 resize-y',
          error
            ? 'border-destructive-500 focus-visible:ring-destructive-400'
            : 'border-neutral-300 focus-visible:ring-primary-500',
          className,
        )}
        ref={ref}
        aria-invalid={error ? 'true' : undefined}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea };
