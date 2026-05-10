import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils.js';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-neutral-100 text-neutral-700',
        primary: 'bg-primary-100 text-primary-700',
        success: 'bg-primary-100 text-primary-700',
        warning: 'bg-yellow-100 text-yellow-700',
        destructive: 'bg-destructive-100 text-destructive-700',
        info: 'bg-blue-100 text-blue-700',
        outline: 'border border-neutral-300 text-neutral-700 bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
