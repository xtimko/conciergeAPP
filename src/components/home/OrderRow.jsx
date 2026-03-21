import React from 'react';
import { useTheme } from '@/lib/ThemeContext';
import { getStatusLabel } from '@/lib/i18n';

export default function OrderRow({ order, onClick }) {
  const { lang } = useTheme();
  const label = `${order.item_name}${order.item_size ? ` — ${order.item_size}` : ''}`;
  const statusText = getStatusLabel(order.status, lang);

  const statusColors = {
    pending: 'text-muted-foreground',
    confirmed: 'text-foreground/70',
    sourcing: 'text-foreground/70',
    shipping: 'text-foreground',
    awaiting_pickup: 'text-foreground',
    delivered: 'text-muted-foreground',
    cancelled: 'text-destructive'
  };

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between py-3 px-1 border-b border-border/20 last:border-0 hover:bg-accent/30 transition-colors rounded-lg text-left">
      
      <span className="pr-4 pl-1 text-sm font-light truncate flex-1">{label}</span>
      <span className="text-muted-foreground pr-1 text-xs font-medium tracking-wide whitespace-nowrap">
        {statusText}
      </span>
    </button>);

}