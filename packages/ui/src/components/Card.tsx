import React from 'react';

const paddingClasses: Record<string, string> = {
  none: '',
  sm:   'p-3',
  md:   'p-4',
};

interface CardProps {
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md';
  className?: string;
}

export function Card({ children, padding = 'md', className = '' }: CardProps) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  );
}
