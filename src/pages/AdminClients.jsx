import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Pencil, ClipboardList, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import OrderDetailSheet from '@/components/orders/OrderDetailSheet';
import { hapticSuccess, hapticError } from '@/lib/telegramHaptics';

export default function AdminClients() {
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showOrders, setShowOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [copiedEmail, setCopiedEmail] = useState(null);
  const queryClient = useQueryClient();

  const { data: clients = [], isPending: clientsLoading } = useQuery({
    queryKey: ['allClients'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: clientOrders = [], isPending: clientOrdersLoading } = useQuery({
    queryKey: ['clientOrders', selectedClient?.email],
    queryFn: () => base44.entities.Order.filter({ client_email: selectedClient.email }),
    enabled: !!selectedClient?.email && showOrders,
  });

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      !q ||
      [c.full_name, c.first_name, c.last_name, c.email, c.phone, c.city, c.referral_code].some((f) =>
        f?.toLowerCase().includes(q),
      )
    );
  });

  const openEdit = (client) => {
    setSelectedClient(client);
    setShowOrders(false);
    setEditForm({
      first_name: client.first_name || '',
      last_name: client.last_name || '',
      phone: client.phone || '',
      city: client.city || '',
      bonus_balance: client.bonus_balance || 0,
      referral_code: client.referral_code || '',
    });
  };

  const handleSave = async () => {
    try {
      await base44.entities.User.update(selectedClient.id, {
        ...editForm,
        bonus_balance: Number(editForm.bonus_balance) || 0,
      });
      queryClient.invalidateQueries({ queryKey: ['allClients'] });
      toast.success('Client updated');
      hapticSuccess();
      setSelectedClient(null);
    } catch (e) {
      hapticError();
      toast.error(e?.message || 'Не удалось сохранить');
    }
  };

  const copyEmail = async (email, e) => {
    e?.stopPropagation();
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmail(email);
      hapticSuccess();
      toast.success('Email скопирован');
      setTimeout(() => setCopiedEmail(null), 2000);
    } catch {
      hapticError();
      toast.error('Не удалось скопировать');
    }
  };

  const viewOrders = (client) => {
    setSelectedClient(client);
    setShowOrders(true);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск: имя, email, телефон, город…"
          className="pl-10 bg-transparent glass border-border/30"
        />
      </div>

      <div className="space-y-2">
        {clientsLoading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-[1.35rem] border border-border/20 p-4 flex gap-3">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-64 max-w-full" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-11 w-11 rounded-lg shrink-0" />
            </div>
          ))
        ) : (
          filtered.map((client) => (
            <GlassCard key={client.id} className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {client.first_name || ''} {client.last_name || client.full_name || client.email}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                  <div className="flex gap-3 mt-1 flex-wrap">
                    {client.phone && <span className="text-xs text-muted-foreground">{client.phone}</span>}
                    {client.city && <span className="text-xs text-muted-foreground">{client.city}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <span className="text-xs font-light mr-1 hidden sm:inline">
                    {(client.bonus_balance || 0).toLocaleString()} pts
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => copyEmail(client.email, e)}
                    className="h-11 w-11 min-h-[44px] min-w-[44px]"
                    aria-label="Копировать email"
                  >
                    {copiedEmail === client.email ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => viewOrders(client)}
                    className="h-11 w-11 min-h-[44px] min-w-[44px]"
                    aria-label="Заказы клиента"
                  >
                    <ClipboardList className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(client)}
                    className="h-11 w-11 min-h-[44px] min-w-[44px]"
                    aria-label="Редактировать клиента"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </GlassCard>
          ))
        )}
      </div>

      <Dialog open={!!selectedClient && !showOrders} onOpenChange={() => setSelectedClient(null)}>
        <DialogContent className="max-w-md border-border/60 bg-background">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium tracking-wide">Edit Client</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div>
              <Label className="text-xs">First Name</Label>
              <Input
                value={editForm.first_name}
                onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                className="mt-1 bg-transparent border-border/30"
              />
            </div>
            <div>
              <Label className="text-xs">Last Name</Label>
              <Input
                value={editForm.last_name}
                onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                className="mt-1 bg-transparent border-border/30"
              />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="mt-1 bg-transparent border-border/30"
              />
            </div>
            <div>
              <Label className="text-xs">City</Label>
              <Input
                value={editForm.city}
                onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                className="mt-1 bg-transparent border-border/30"
              />
            </div>
            <div>
              <Label className="text-xs">Bonus Balance</Label>
              <Input
                type="number"
                value={editForm.bonus_balance}
                onChange={(e) => setEditForm({ ...editForm, bonus_balance: e.target.value })}
                className="mt-1 bg-transparent border-border/30"
              />
            </div>
            <div>
              <Label className="text-xs">Referral Code</Label>
              <Input
                value={editForm.referral_code}
                onChange={(e) => setEditForm({ ...editForm, referral_code: e.target.value })}
                className="mt-1 bg-transparent border-border/30"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setSelectedClient(null)} className="glass border-border/30">
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-foreground text-background hover:bg-foreground/90">
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selectedClient && showOrders}
        onOpenChange={() => {
          setSelectedClient(null);
          setShowOrders(false);
        }}
      >
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto border-border/60 bg-background">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium tracking-wide">
              Заказы — {selectedClient?.first_name || selectedClient?.full_name || selectedClient?.email}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {clientOrdersLoading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="rounded-[1.35rem] border border-border/20 p-3 flex gap-3">
                  <Skeleton className="h-14 w-14 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <Skeleton className="h-4 w-full max-w-[200px]" />
                    <Skeleton className="h-3 w-full max-w-[120px]" />
                  </div>
                </div>
              ))
            ) : clientOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Нет заказов</p>
            ) : (
              clientOrders.map((order) => (
                <GlassCard key={order.id} className="p-3">
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 text-left min-h-[3.5rem] py-1"
                    onClick={() => setSelectedOrder(order)}
                  >
                    {order.image_url ? (
                      <img
                        src={order.image_url}
                        alt=""
                        className="w-14 h-14 rounded-lg object-cover shrink-0 bg-muted/30"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg shrink-0 bg-muted/30" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-light truncate">{order.item_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.status} • {order.price ? `${order.price.toLocaleString()} ${order.currency}` : ''}
                      </p>
                    </div>
                  </button>
                </GlassCard>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <OrderDetailSheet
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        readOnly
      />
    </div>
  );
}
