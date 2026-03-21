import React from 'react';
import { useTheme } from '@/lib/ThemeContext';
import { getStatusLabel } from '@/lib/i18n';

export default function OrderRow({ order, onClick }) {
  const { lang } = useTheme();
  const label = `${order.item_name}${order.item_size ? ` — ${order.item_size}` : ''}`;
  const statusText = getStatusLabel(order.status, lang);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between gap-3 py-3 px-1 border-b border-border/20 last:border-0 hover:bg-accent/30 transition-colors rounded-lg text-left"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {order.image_url ? (
          <img
            src={order.image_url}
            alt=""
            className="w-12 h-12 rounded-lg object-cover shrink-0 bg-muted/30"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg shrink-0 bg-muted/30" />
        )}
        <span className="text-sm font-light truncate">{label}</span>
      </div>
      <span className="text-muted-foreground pr-1 text-xs font-medium tracking-wide whitespace-nowrap shrink-0">
        {statusText}
      </span>
    </button>
  );
}
