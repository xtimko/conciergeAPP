import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/lib/ThemeContext';
import { t } from '@/lib/i18n';
import BonusCard from '@/components/home/BonusCard';
import OrderRow from '@/components/home/OrderRow';
import GlassCard from '@/components/ui/GlassCard';
import OrderDetailSheet from '@/components/orders/OrderDetailSheet';

function generateCode() {
  return 'SNKRX-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function Home() {
  const { lang } = useTheme();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  // После онбординга: реферальный код + приветственные баллы
  useEffect(() => {
    if (user?.profile_completed && !user.referral_code) {
      base44.auth.updateMe({
        referral_code: generateCode(),
        bonus_balance: (user.bonus_balance || 0) + 500,
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['me'] });
      });
    }
  }, [user, queryClient]);

  const { data: orders = [] } = useQuery({
    queryKey: ['myOrders', user?.email],
    queryFn: () => base44.entities.Order.filter({ client_email: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const displayName = user?.first_name || user?.full_name?.split(' ')[0] || '';
  const activeOrders = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status));
  const completedOrders = orders
    .filter((o) => ['delivered', 'cancelled'].includes(o.status))
    .sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));

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

      <GlassCard>
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

      <GlassCard>
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
      />
    </div>
  );
}