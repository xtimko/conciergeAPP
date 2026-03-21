import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import GlassCard from '@/components/ui/GlassCard';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList, Users, Package, TrendingUp, Wallet } from 'lucide-react';
import { getClientDisplayHandle, getClientPrimaryName } from '@/lib/clientDisplay';

export default function AdminDashboard() {
  const { data: orders = [], isPending: ordersLoading } = useQuery({
    queryKey: ['allOrders'],
    queryFn: () => base44.entities.Order.list(),
  });

  const { data: clients = [], isPending: clientsLoading } = useQuery({
    queryKey: ['allClients'],
    queryFn: () => base44.entities.User.list(),
  });

  const loading = ordersLoading || clientsLoading;

  const recentOrders = useMemo(() => {
    const arr = [...orders];
    arr.sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
    return arr.slice(0, 10);
  }, [orders]);

  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.price || 0), 0);
  const totalProfit = orders.reduce(
    (sum, o) => sum + (Number(o.price || 0) - Number(o.cost_price || 0)),
    0,
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
      <div className="grid grid-cols-2 gap-3">
        {loading
          ? [1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-[1.35rem] border border-border/20 p-4">
                <Skeleton className="h-5 w-5 mx-auto mb-3 rounded-md" />
                <Skeleton className="h-7 w-16 mx-auto mb-2" />
                <Skeleton className="h-3 w-24 mx-auto" />
              </div>
            ))
          : stats.map((stat, i) => (
              <GlassCard key={i} className="text-center">
                <stat.icon className="w-5 h-5 mx-auto text-muted-foreground mb-2" />
                <p className="text-xl font-light">{stat.value}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">{stat.label}</p>
              </GlassCard>
            ))}
      </div>

      <GlassCard>
        <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Recent Orders</h3>
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
              order.status === 'delivered'
                ? Math.round(Number(order.price || 0) - Number(order.cost_price || 0))
                : null;
            return (
              <div
                key={order.id}
                className="flex items-center justify-between gap-2 py-2 border-b border-border/10 last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-light truncate">{order.item_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{subLine}</p>
                </div>
                <span className="text-xs text-muted-foreground text-right shrink-0 whitespace-nowrap">
                  {order.status}
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