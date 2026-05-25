// @ts-nocheck
import React, { useState } from 'react';
import { api } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/lib/ThemeContext';
import { t } from '@/lib/i18n';
import BonusCard from '@/components/home/BonusCard';
import OrderRow from '@/components/home/OrderRow';
import GlassCard from '@/components/ui/GlassCard';
import OrderDetailSheet from '@/components/orders/OrderDetailSheet';
import { cn } from '@/lib/utils';

export default function Home() {
  const { lang, theme } = useTheme();
  const [selectedOrder, setSelectedOrder] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.auth.me(),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['myOrders', user?.email],
    queryFn: () => api.entities.Order.filter({ client_email: user.email }),
    enabled: !!user?.email,
  });

  const displayName = user?.first_name || user?.full_name?.split(' ')[0] || '';
  const activeOrders = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status));
  const completedOrders = orders
    .filter((o) => ['delivered', 'cancelled'].includes(o.status))
    .sort(
      (a, b) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime()
    );

  return (
    <div className="px-4 pt-8 space-y-6">
      {/* Hero greeting */}
      {displayName && (
        <div className="text-center lg-enter">
          <p className="text-[10px] font-medium tracking-[0.24em] uppercase text-muted-foreground lg-eyebrow">
            {t('welcome', lang)}
          </p>
          <p className="text-[1.75rem] leading-tight font-extralight tracking-[-0.01em] text-foreground mt-2 lg-display">
            {displayName}
          </p>
        </div>
      )}

      <BonusCard balance={user?.bonus_balance} />

      {/* CTA: написать в Telegram */}
      <a
        href="https://t.me/waitanhour"
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'relative glass glass-hover rounded-[1.35rem] overflow-hidden block',
          'flex w-full max-w-full items-center justify-center gap-2.5 px-5 py-4 min-w-0',
          'text-[11px] font-medium tracking-[0.16em] uppercase text-foreground/95 text-center',
          'transition-transform active:scale-[0.985]',
          'motion-reduce:transition-none motion-reduce:active:scale-100',
        )}
      >
        <svg
          className={cn(
            'w-[1.05rem] h-[1.05rem] shrink-0',
            theme === 'dark' ? 'text-white/90' : 'text-black/85',
          )}
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"
          />
        </svg>
        {t('writeForOrder', lang)}
      </a>

      {/* Активные заказы */}
      <GlassCard hover={false} className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-medium tracking-[0.2em] uppercase text-muted-foreground lg-eyebrow">
            {t('activeOrders', lang)}
          </h3>
          {activeOrders.length > 0 && (
            <span className="text-[11px] tabular-nums text-muted-foreground lg-number">
              {activeOrders.length}
            </span>
          )}
        </div>
        {activeOrders.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6 font-light">
            {t('noOrders', lang)}
          </p>
        ) : (
          <div>
            {activeOrders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                onClick={() => setSelectedOrder(order)}
              />
            ))}
          </div>
        )}
      </GlassCard>

      {/* Завершённые заказы */}
      <GlassCard hover={false} className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-medium tracking-[0.2em] uppercase text-muted-foreground lg-eyebrow">
            {t('completedOrders', lang)}
          </h3>
          {completedOrders.length > 0 && (
            <span className="text-[11px] tabular-nums text-muted-foreground lg-number">
              {completedOrders.length}
            </span>
          )}
        </div>
        {completedOrders.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6 font-light">
            {t('noCompletedOrders', lang)}
          </p>
        ) : (
          <div>
            {completedOrders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                onClick={() => setSelectedOrder(order)}
              />
            ))}
          </div>
        )}
      </GlassCard>

      <OrderDetailSheet
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        readOnly={false}
      />
    </div>
  );
}
