import * as React from 'react';
import { cn } from '../lib/utils.js';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Mensaje de error (string) o flag booleano — activa estilos de error */
  error?: string | boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    const hasError = Boolean(error);
    return (
      <div className="w-full">
        <input
          type={type}
          className={cn(
            'flex h-11 w-full rounded-md border bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
            'disabled:cursor-not-allowed disabled:opacity-50',
            hasError
              ? 'border-destructive-500 focus-visible:ring-destructive-400'
              : 'border-neutral-300 focus-visible:ring-primary-500',
            className,
          )}
          ref={ref}
          aria-invalid={hasError ? 'true' : undefined}
          {...props}
        />
        {typeof error === 'string' && error && (
          <p className="mt-1 text-xs text-red-600">{error}</p>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';

export { Input };
