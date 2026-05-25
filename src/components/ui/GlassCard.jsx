// @ts-nocheck
import React from 'react';
import { cn } from '@/lib/utils';

/**
 * GlassCard — премиум-стеклянная карточка.
 *
 * Variants:
 *   - default  — обычная карточка
 *   - elevated — приподнятая (для hero-блоков), усиленная тень + блик
 *   - subtle   — почти прозрачная, для мелких чипов / вторичной информации
 *
 * Props:
 *   - hover    — добавить .glass-hover (по умолчанию true)
 *   - animated — анимация появления (.lg-enter)
 */
export default function GlassCard({
  children,
  className,
  variant = 'default',
  hover = true,
  animated = false,
  as: Tag = 'div',
  ...props
}) {
  const isSubtle = variant === 'subtle';
  return (
    <Tag
      className={cn(
        'relative rounded-[1.35rem] overflow-hidden',
        isSubtle ? 'lg-subtle p-3' : 'glass p-5',
        hover && !isSubtle && 'glass-hover',
        variant === 'elevated' && 'lg-elevated',
        animated && 'lg-enter',
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
