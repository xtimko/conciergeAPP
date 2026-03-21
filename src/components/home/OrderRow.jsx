import React from 'react';
import { useTheme } from '@/lib/ThemeContext';
import { getStatusLabel } from '@/lib/i18n';
import { getOrderEtaHint } from '@/lib/orderEta';
import { Badge } from '@/components/ui/badge';

const statusTone = {
  pending: 'bg-muted/80 text-muted-foreground border-border/30',
  confirmed: 'bg-secondary/50 text-secondary-foreground border-border/20',
  sourcing: 'bg-secondary/50 text-secondary-foreground border-border/20',
  shipping: 'bg-primary/15 text-foreground border-primary/20',
  awaiting_pickup: 'bg-primary/25 text-foreground border-primary/25',
  delivered: 'bg-muted/50 text-muted-foreground border-border/20',
  cancelled: 'bg-destructive/15 text-destructive border-destructive/20',
};

export default function OrderRow({ order, onClick }) {
  const { lang } = useTheme();
  const title = order.item_name || '—';
  const meta = [order.brand, order.item_size].filter(Boolean).join(' · ');
  const statusText = getStatusLabel(order.status, lang);
  const etaHint = getOrderEtaHint(order, lang);
  const priceStr =
    order.price != null && order.price !== ''
      ? `${Number(order.price).toLocaleString()} ${order.currency || '₽'}`
      : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl border border-border/25 bg-muted/10 hover:bg-muted/25 active:scale-[0.99] transition-all p-2.5 mb-2 last:mb-0"
    >
      <div className="flex gap-2.5">
        {order.image_url ? (
          <img
            src={order.image_url}
            alt=""
            className="w-[52px] h-[52px] rounded-lg object-cover shrink-0 bg-muted/30"
          />
        ) : (
          <div className="w-[52px] h-[52px] rounded-lg shrink-0 bg-muted/30" />
        )}

        <div className="min-w-0 flex-1 flex flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[13px] font-medium leading-tight line-clamp-2">{title}</p>
            <Badge
              variant="outline"
              className={`shrink-0 text-[9px] px-1.5 py-0 h-5 font-normal border ${statusTone[order.status] || ''}`}
            >
              {statusText}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
            {meta ? <span className="line-clamp-1">{meta}</span> : null}
            {priceStr ? (
              <span className="text-foreground/90 tabular-nums font-medium">{priceStr}</span>
            ) : null}
          </div>

          {etaHint ? (
            <p className="text-[10px] text-muted-foreground/90 leading-snug flex items-center gap-1">
              <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground/50 shrink-0" />
              {etaHint}
            </p>
          ) : null}
        </div>
      </div>
    </button>
  );
}
