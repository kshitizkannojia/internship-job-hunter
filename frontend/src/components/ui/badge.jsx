import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-red-500 text-white',
        outline: 'text-foreground',
        // Custom status pills for the outreach table
        sent: 'border-transparent bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
        replied: 'border-transparent bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
        followup: 'border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
        nomatch: 'border-transparent bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
