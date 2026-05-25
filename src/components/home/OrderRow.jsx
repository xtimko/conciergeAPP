// @ts-nocheck
import React from 'react';
import { useTheme } from '@/lib/ThemeContext';
import { getStatusLabel } from '@/lib/i18n';
import { getOrderEtaHint } from '@/lib/orderEta';
import { cn } from '@/lib/utils';

/**
 * Premium order row.
 * - Тонкая glass-плашка вместо плоского bg-muted/10
 * - Refined типографика, ровные tabular-nums для цены
 * - Статус-чип через lg-pill (закруглённая стеклянная плашка)
 */
const statusTone = {
  pending:         'text-muted-foreground',
  confirmed:       'text-foreground/80',
  sourcing:        'text-foreground/80',
  shipping:        'text-foreground',
  awaiting_pickup: 'text-foreground',
  delivered:       'text-muted-foreground',
  cancelled:       'text-destructive',
};

const statusDot = {
  pending:         'bg-muted-foreground/50',
  confirmed:       'bg-foreground/60',
  sourcing:        'bg-foreground/60',
  shipping:        'bg-foreground',
  awaiting_pickup: 'bg-foreground',
  delivered:       'bg-muted-foreground/40',
  cancelled:       'bg-destructive',
};

export default function OrderRow({ order, onClick }) {
  const { lang } = useTheme();
  const title = order.item_name || '—';
  const meta = [order.brand, order.item_size].filter(Boolean).join(' · ');
  const statusText = getStatusLabel(order.status, lang);
  const etaHint = getOrderEtaHint(order, lang);
  const priceStr =
    order.price != null && order.price !== ''
      ? `${Number(order.price).toLocaleString('ru-RU')} ${order.currency || '₽'}`
      : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-2xl p-3 mb-2 last:mb-0',
        'lg-subtle',
        'transition-all duration-200 active:scale-[0.99]',
        'hover:bg-foreground/[0.04]',
      )}
    >
      <div className="flex gap-3">
        <div className="w-12 h-12 shrink-0 rounded-xl lg-subtle overflow-hidden flex items-center justify-center p-1">
          {order.image_url ? (
            <img
              src={order.image_url}
              alt=""
              className="max-h-full max-w-full w-auto h-auto object-contain"
            />
          ) : (
            <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
          )}
        </div>

        <div className="min-w-0 flex-1 flex flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[13px] font-normal leading-tight line-clamp-2 tracking-[-0.01em]">
              {title}
            </p>
            <div
              className={cn(
                'shrink-0 flex items-center gap-1.5 text-[9px] tracking-[0.14em] uppercase',
                statusTone[order.status] || 'text-muted-foreground',
              )}
            >
              <span
                className={cn(
                  'inline-block w-1.5 h-1.5 rounded-full',
                  statusDot[order.status] || 'bg-muted-foreground/40',
                )}
              />
              {statusText}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
            {meta ? <span className="line-clamp-1">{meta}</span> : null}
            {priceStr ? (
              <span className="text-foreground/95 tabular-nums lg-number font-light">
                {priceStr}
              </span>
            ) : null}
          </div>

          {etaHint ? (
            <p className="text-[10px] text-muted-foreground/85 leading-snug">
              {etaHint}
            </p>
          ) : null}
        </div>
      </div>
    </button>
  );
}
