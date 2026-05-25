import React, { useMemo, useState } from 'react';
import { api } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import GlassCard from '@/components/ui/GlassCard';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList, Users, Package, TrendingUp, Wallet, Sparkles } from 'lucide-react';
import { getClientDisplayHandle, getClientPrimaryName } from '@/lib/clientDisplay';
import { formatOrderDisplayId } from '@/lib/orderDisplay';
import { getStatusLabel } from '@/lib/i18n';
import { orderPriceRub, orderProfitRub } from '@/lib/orderFinanceRub';
import OrderDetailSheet from '@/components/orders/OrderDetailSheet';

export default function AdminDashboard() {
  const [selectedOrder, setSelectedOrder] = useState(null);

  const { data: orders = [], isPending: ordersLoading } = useQuery({
    queryKey: ['allOrders'],
    queryFn: () => api.entities.Order.list(),
  });

  const { data: clients = [], isPending: clientsLoading } = useQuery({
    queryKey: ['allClients'],
    queryFn: () => api.entities.User.list(),
  });

  const loading = ordersLoading || clientsLoading;

  const recentOrders = useMemo(() => {
    const arr = [...orders];
    arr.sort(
      (a, b) =>
        +new Date(b.created_date || 0) - +new Date(a.created_date || 0)
    );
    return arr.slice(0, 10);
  }, [orders]);

  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const totalRevenue = orders.reduce((sum, o) => sum + orderPriceRub(o), 0);
  const totalProfit = orders.reduce((sum, o) => sum + orderProfitRub(o), 0);

  const totalActiveClientBonuses = useMemo(
    () =>
      clients
        .filter((c) => c.role !== 'admin')
        .reduce((sum, c) => sum + Math.max(0, Number(c.bonus_balance) || 0), 0),
    [clients]
  );

  /** Сумма баллов, которые ещё не отражены в bonus_balance: активные неотменённые заказы без применённых бонусов. */
  const bonusReserveInFlight = useMemo(() => {
    let sum = 0;
    for (const o of orders) {
      if (o.bonuses_applied || o.status === 'delivered' || o.status === 'cancelled') continue;
      sum += Number(o.referrer_bonus || 0) + Number(o.referral_bonus || 0);
    }
    return Math.round(sum);
  }, [orders]);

  const stats = [
    { icon: ClipboardList, label: 'Заказы', value: orders.length },
    { icon: Package, label: 'Активные', value: activeOrders.length },
    { icon: Users, label: 'Клиенты', value: clients.length },
    { icon: TrendingUp, label: 'Выручка', value: `${totalRevenue.toLocaleString('ru-RU')} ₽` },
    { icon: Wallet, label: 'Прибыль', value: `${totalProfit.toLocaleString('ru-RU')} ₽` },
    {
      icon: Sparkles,
      label: 'На счетах (клиенты)',
      value: totalActiveClientBonuses.toLocaleString('ru-RU'),
      subLabel: 'Резерв по активным заказам',
      subValue: bonusReserveInFlight.toLocaleString('ru-RU'),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {loading
          ? [1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-2xl border border-border/20 p-2.5">
                <Skeleton className="h-4 w-4 mx-auto mb-2 rounded-md" />
                <Skeleton className="h-6 w-14 mx-auto mb-1" />
                <Skeleton className="h-2.5 w-20 mx-auto" />
              </div>
            ))
          : stats.map((stat, i) => (
              <GlassCard
                key={i}
                hover={false}
                className="text-center py-4 px-3"
                animated
              >
                <div className="w-7 h-7 mx-auto mb-2 rounded-full lg-subtle flex items-center justify-center">
                  <stat.icon className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <p className="text-lg font-extralight tabular-nums leading-tight lg-display lg-number">
                  {stat.value}
                </p>
                <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mt-1 leading-tight font-medium lg-eyebrow">
                  {stat.label}
                </p>
                {stat.subValue != null ? (
                  <>
                    <p className="text-sm font-extralight tabular-nums leading-tight mt-3 lg-number">
                      {stat.subValue}
                    </p>
                    <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mt-1 leading-tight font-medium lg-eyebrow">
                      {stat.subLabel}
                    </p>
                  </>
                ) : null}
              </GlassCard>
            ))}
      </div>

      <GlassCard hover={false} className="p-5">
        <h3 className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium mb-4 lg-eyebrow">
          Последние заказы
        </h3>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-between gap-2 py-2 border-b border-border/10 last:border-0">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-full max-w-[200px]" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-4 w-16 shrink-0" />
              </div>
            ))}
          </div>
        ) : (
          recentOrders.map((order) => {
            const client = clients.find((c) => c.email === order.client_email);
            const subLine =
              order.client_name?.trim() ||
              getClientPrimaryName(client) ||
              getClientDisplayHandle(client) ||
              '—';
            const profitDel =
              order.status === 'delivered' ? Math.round(orderProfitRub(order)) : null;
            return (
              <button
                key={order.id}
                type="button"
                onClick={() => setSelectedOrder(order)}
                className="w-full flex items-center justify-between gap-2 py-2.5 border-b border-border/10 last:border-0 text-left transition-all active:scale-[0.99] hover:bg-foreground/[0.03] rounded-lg px-2 -mx-2"
              >
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground/90 font-mono truncate mb-0.5 lg-number">
                    {formatOrderDisplayId(order)}
                  </p>
                  <p className="text-sm font-light truncate">{order.item_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{subLine}</p>
                </div>
                <span className="text-xs text-muted-foreground text-right shrink-0 whitespace-nowrap">
                  {getStatusLabel(order.status, 'ru')}
                  {profitDel != null ? (
                    <span className="text-emerald-500/90 font-medium tabular-nums ml-1.5 lg-number">
                      +{profitDel.toLocaleString('ru-RU')}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })
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