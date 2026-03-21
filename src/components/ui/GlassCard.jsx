import React from 'react';
import { cn } from '@/lib/utils';

export default function GlassCard({ children, className, ...props }) {
  return (
    <div
      className={cn(
        'glass glass-hover rounded-[1.35rem] p-5 overflow-hidden',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
