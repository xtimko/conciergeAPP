import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Pencil, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminClients() {
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showOrders, setShowOrders] = useState(false);
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ['allClients'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: clientOrders = [] } = useQuery({
    queryKey: ['clientOrders', selectedClient?.email],
    queryFn: () => base44.entities.Order.filter({ client_email: selectedClient.email }, '-created_date'),
    enabled: !!selectedClient?.email && showOrders,
  });

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    return !q || [c.full_name, c.first_name, c.last_name, c.email, c.phone, c.city, c.referral_code]
      .some(f => f?.toLowerCase().includes(q));
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
    await base44.entities.User.update(selectedClient.id, {
      ...editForm,
      bonus_balance: Number(editForm.bonus_balance) || 0,
    });
    queryClient.invalidateQueries({ queryKey: ['allClients'] });
    toast.success('Client updated');
    setSelectedClient(null);
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
          placeholder="Search clients by name, email, phone, city..."
          className="pl-10 bg-transparent glass border-border/30"
        />
      </div>

      <div className="space-y-2">
        {filtered.map(client => (
          <GlassCard key={client.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {client.first_name || ''} {client.last_name || client.full_name || client.email}
                </p>
                <p className="text-xs text-muted-foreground">{client.email}</p>
                <div className="flex gap-3 mt-1">
                  {client.phone && <span className="text-xs text-muted-foreground">{client.phone}</span>}
                  {client.city && <span className="text-xs text-muted-foreground">{client.city}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-light mr-2">{(client.bonus_balance || 0).toLocaleString()} pts</span>
                <Button variant="ghost" size="icon" onClick={() => viewOrders(client)} className="h-8 w-8">
                  <ClipboardList className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => openEdit(client)} className="h-8 w-8">
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Edit Client Dialog */}
      <Dialog open={!!selectedClient && !showOrders} onOpenChange={() => setSelectedClient(null)}>
        <DialogContent className="glass border-border/20 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium tracking-wide">Edit Client</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div>
              <Label className="text-xs">First Name</Label>
              <Input value={editForm.first_name} onChange={(e) => setEditForm({...editForm, first_name: e.target.value})} className="mt-1 bg-transparent border-border/30" />
            </div>
            <div>
              <Label className="text-xs">Last Name</Label>
              <Input value={editForm.last_name} onChange={(e) => setEditForm({...editForm, last_name: e.target.value})} className="mt-1 bg-transparent border-border/30" />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} className="mt-1 bg-transparent border-border/30" />
            </div>
            <div>
              <Label className="text-xs">City</Label>
              <Input value={editForm.city} onChange={(e) => setEditForm({...editForm, city: e.target.value})} className="mt-1 bg-transparent border-border/30" />
            </div>
            <div>
              <Label className="text-xs">Bonus Balance</Label>
              <Input type="number" value={editForm.bonus_balance} onChange={(e) => setEditForm({...editForm, bonus_balance: e.target.value})} className="mt-1 bg-transparent border-border/30" />
            </div>
            <div>
              <Label className="text-xs">Referral Code</Label>
              <Input value={editForm.referral_code} onChange={(e) => setEditForm({...editForm, referral_code: e.target.value})} className="mt-1 bg-transparent border-border/30" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setSelectedClient(null)} className="glass border-border/30">Cancel</Button>
            <Button onClick={handleSave} className="bg-foreground text-background hover:bg-foreground/90">Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Client Orders Dialog */}
      <Dialog open={!!selectedClient && showOrders} onOpenChange={() => { setSelectedClient(null); setShowOrders(false); }}>
        <DialogContent className="glass border-border/20 max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium tracking-wide">
              Orders — {selectedClient?.first_name || selectedClient?.full_name || selectedClient?.email}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {clientOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No orders</p>
            ) : (
              clientOrders.map(order => (
                <GlassCard key={order.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-light">{order.item_name}</p>
                      <p className="text-xs text-muted-foreground">{order.status} • {order.price ? `${order.price.toLocaleString()} ${order.currency}` : ''}</p>
                    </div>
                  </div>
                </GlassCard>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}