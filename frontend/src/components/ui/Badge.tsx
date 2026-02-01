import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost';

type BadgeProps = {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
};

export default function Badge({ children, variant = 'primary', className }: BadgeProps) {
  const variants: Record<BadgeVariant, string> = {
    primary: 'bg-main-50 text-main-500 border border-main-100',
    secondary: 'bg-gray-100 text-gray-700 border border-gray-200',
    success: 'bg-green-50 text-green-600 border border-green-100',
    warning: 'bg-yellow-50 text-yellow-700 border border-yellow-100',
    danger: 'bg-red-50 text-red-600 border border-red-100',
    ghost: 'bg-transparent border border-gray-200 text-gray-600',
  };

  return <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', variants[variant], className)}>{children}</span>;
}
