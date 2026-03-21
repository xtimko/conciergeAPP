import React from 'react';
import { cn } from '@/lib/utils';

export default function GlassCard({ children, className, ...props }) {
  return (
    <div
      className={cn(
        'glass glass-hover rounded-2xl p-5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}