import React, { useMemo } from 'react';
import { api } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import GlassCard from '@/components/ui/GlassCard';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList, Users, Package, TrendingUp, Wallet, Sparkles } from 'lucide-react';
import { getClientDisplayHandle, getClientPrimaryName } from '@/lib/clientDisplay';
import { formatOrderDisplayId } from '@/lib/orderDisplay';
import { getStatusLabel } from '@/lib/i18n';
import { orderPriceRub, orderProfitRub } from '@/lib/orderFinanceRub';

export default function AdminDashboard() {
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

  const stats = [
    { icon: ClipboardList, label: 'Заказы', value: orders.length },
    { icon: Package, label: 'Активные', value: activeOrders.length },
    { icon: Users, label: 'Клиенты', value: clients.length },
    { icon: TrendingUp, label: 'Выручка', value: `${totalRevenue.toLocaleString('ru-RU')} ₽` },
    { icon: Wallet, label: 'Прибыль', value: `${totalProfit.toLocaleString('ru-RU')} ₽` },
  ];

  return (
    <div className="space-y-4">
      <GlassCard className="border-amber-500/15 bg-amber-500/[0.06] py-3 px-3.5">
        {loading ? (
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
            <div className="space-y-2 flex-1 min-w-0">
              <Skeleton className="h-3 w-40 max-w-full" />
              <Skeleton className="h-7 w-28" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/12 text-amber-500/90">
              <Sparkles className="h-4 w-4" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Активные баллы клиентов
              </p>
              <p className="text-xl font-light tabular-nums tracking-tight text-foreground">
                {totalActiveClientBonuses.toLocaleString('ru-RU')}
                <span className="text-sm font-normal text-muted-foreground ml-1">баллов</span>
              </p>
            </div>
          </div>
        )}
      </GlassCard>

      <div className="grid grid-cols-2 gap-2">
        {loading
          ? [1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-2xl border border-border/20 p-2.5">
                <Skeleton className="h-4 w-4 mx-auto mb-2 rounded-md" />
                <Skeleton className="h-6 w-14 mx-auto mb-1" />
                <Skeleton className="h-2.5 w-20 mx-auto" />
              </div>
            ))
          : stats.map((stat, i) => (
              <GlassCard key={i} className="text-center py-2.5 px-2">
                <stat.icon className="w-4 h-4 mx-auto text-muted-foreground mb-1" strokeWidth={1.5} />
                <p className="text-base font-light tabular-nums leading-tight">{stat.value}</p>
                <p className="text-[9px] uppercase tracking-wide text-muted-foreground mt-0.5 leading-tight">
                  {stat.label}
                </p>
              </GlassCard>
            ))}
      </div>

      <GlassCard className="p-5">
        <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Последние заказы</h3>
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
              <div
                key={order.id}
                className="flex items-center justify-between gap-2 py-2 border-b border-border/10 last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground/90 font-mono truncate mb-0.5">
                    {formatOrderDisplayId(order)}
                  </p>
                  <p className="text-sm font-light truncate">{order.item_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{subLine}</p>
                </div>
                <span className="text-xs text-muted-foreground text-right shrink-0 whitespace-nowrap">
                  {getStatusLabel(order.status, 'ru')}
                  {profitDel != null ? (
                    <span className="text-emerald-500/90 font-medium tabular-nums ml-1.5">
                      +{profitDel.toLocaleString('ru-RU')}
                    </span>
                  ) : null}
                </span>
              </div>
            );
          })
        )}
      </GlassCard>
    </div>
  );
}