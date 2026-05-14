import React from 'react';

const variantClasses: Record<string, string> = {
  warning: 'bg-amber-100 text-amber-700',
  neutral: 'bg-gray-100 text-gray-500',
  success: 'bg-green-100 text-green-700',
  danger:  'bg-red-100 text-red-600',
};

interface BadgeProps {
  variant: 'warning' | 'neutral' | 'success' | 'danger';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant, children, className = '' }: BadgeProps) {
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}
