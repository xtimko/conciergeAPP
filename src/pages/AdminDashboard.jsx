import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import GlassCard from '@/components/ui/GlassCard';
import { ClipboardList, Users, Package, TrendingUp } from 'lucide-react';

export default function AdminDashboard() {
  const { data: orders = [] } = useQuery({
    queryKey: ['allOrders'],
    queryFn: () => base44.entities.Order.list('-created_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['allClients'],
    queryFn: () => base44.entities.User.list(),
  });

  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const totalRevenue = orders.reduce((sum, o) => sum + (o.price || 0), 0);

  const stats = [
    { icon: ClipboardList, label: 'Total Orders', value: orders.length },
    { icon: Package, label: 'Active Orders', value: activeOrders.length },
    { icon: Users, label: 'Clients', value: clients.length },
    { icon: TrendingUp, label: 'Revenue', value: `${totalRevenue.toLocaleString()} ₽` },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, i) => (
          <GlassCard key={i} className="text-center">
            <stat.icon className="w-5 h-5 mx-auto text-muted-foreground mb-2" />
            <p className="text-xl font-light">{stat.value}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">{stat.label}</p>
          </GlassCard>
        ))}
      </div>

      <GlassCard>
        <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Recent Orders</h3>
        {orders.slice(0, 10).map(order => (
          <div key={order.id} className="flex items-center justify-between py-2 border-b border-border/10 last:border-0">
            <div>
              <p className="text-sm font-light">{order.item_name}</p>
              <p className="text-xs text-muted-foreground">{order.client_name || order.client_email}</p>
            </div>
            <span className="text-xs text-muted-foreground">{order.status}</span>
          </div>
        ))}
      </GlassCard>
    </div>
  );
}