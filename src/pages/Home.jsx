import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['myOrders', user?.email],
    queryFn: () => base44.entities.Order.filter({ client_email: user.email }),
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
    <div className="px-4 pt-6 space-y-5">
      {displayName && (
        <div
          className="text-center"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          <p className="text-[11px] font-normal tracking-[0.2em] uppercase text-muted-foreground">
            {t('welcome', lang)},
          </p>
          <p className="text-base font-normal tracking-[0.08em] text-foreground mt-1.5">
            {displayName}!
          </p>
        </div>
      )}

      <BonusCard balance={user?.bonus_balance} />

      <a
        href="https://t.me/waitanhour"
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'relative glass glass-hover rounded-[1.35rem] overflow-hidden',
          'flex items-center justify-center gap-2 mx-auto max-w-sm w-full p-4',
          'text-xs font-medium tracking-wide text-foreground',
          'cursor-pointer active:scale-[0.98] transition-transform',
          'motion-reduce:transition-none motion-reduce:active:scale-100',
        )}
      >
        <svg
          className={cn(
            'w-4 h-4 shrink-0',
            theme === 'dark' ? 'text-white' : 'text-black',
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

      <GlassCard className="p-4">
        <h3 className="text-sm font-medium tracking-wide mb-3">
          {t('activeOrders', lang)}
        </h3>
        {activeOrders.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
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
            <p className="text-[10px] text-muted-foreground text-center mt-3">
              {t('tapForDetails', lang)}
            </p>
          </div>
        )}
      </GlassCard>

      <GlassCard className="p-4">
        <h3 className="text-sm font-medium tracking-wide mb-3">
          {t('completedOrders', lang)}
        </h3>
        {completedOrders.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">{t('noCompletedOrders', lang)}</p>
        ) : (
          <div>
            {completedOrders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                onClick={() => setSelectedOrder(order)}
              />
            ))}
            <p className="text-[10px] text-muted-foreground text-center mt-3">
              {t('tapForDetails', lang)}
            </p>
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