import * as React from 'react';
import { cn } from '../lib/utils.js';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-md border bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
          'disabled:cursor-not-allowed disabled:opacity-50',
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
Input.displayName = 'Input';

export { Input };
