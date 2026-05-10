import * as React from 'react';
import { cn } from '../lib/utils.js';

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-[3px]',
};

function Spinner({ size = 'md', className, ...props }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className={cn(
        'animate-spin rounded-full border-neutral-200 border-t-primary-600',
        sizeMap[size],
        className,
      )}
      {...props}
    />
  );
}

export { Spinner };
