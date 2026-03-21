import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, Pencil, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { getStatusLabel } from '@/lib/i18n';
import ClientEmailAutocomplete from '@/components/admin/ClientEmailAutocomplete';
import ImageUploadField from '@/components/admin/ImageUploadField';

const STATUSES = ['pending', 'confirmed', 'sourcing', 'shipping', 'awaiting_pickup', 'delivered', 'cancelled'];
const CATEGORIES = ['footwear', 'clothing', 'accessories', 'bags', 'other'];
const CURRENCIES = ['RUB', 'USD', 'EUR'];

const emptyOrder = {
  client_email: '', client_name: '', item_name: '', item_size: '',
  item_category: 'footwear', brand: '', price: '', currency: 'RUB',
  status: 'pending', estimated_days: '', notes: '', image_url: '',
  referrer_bonus: 0, referral_bonus: 0, referrer_email: '',
};

export default function AdminOrders() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [form, setForm] = useState(emptyOrder);
  const [clientAddress, setClientAddress] = useState('');
  const [addrCopied, setAddrCopied] = useState(false);
  const queryClient = useQueryClient();

  const { data: orders = [] } = useQuery({
    queryKey: ['allOrders'],
    queryFn: () => base44.entities.Order.list('-created_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['allClients'],
    queryFn: () => base44.entities.User.list(),
  });

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    return !q || [o.item_name, o.client_name, o.client_email, o.brand, o.status]
      .some(f => f?.toLowerCase().includes(q));
  });

  const openNew = () => {
    setEditingOrder(null);
    setForm(emptyOrder);
    setClientAddress('');
    setAddrCopied(false);
    setDialogOpen(true);
  };

  const openEdit = async (order) => {
    setEditingOrder(order);
    setAddrCopied(false);
    if (order.client_email) {
      const found = await base44.entities.User.filter({ email: order.client_email });
      setClientAddress(found[0]?.delivery_address || '');
    } else {
      setClientAddress('');
    }
    setForm({
      client_email: order.client_email || '',
      client_name: order.client_name || '',
      item_name: order.item_name || '',
      item_size: order.item_size || '',
      item_category: order.item_category || 'footwear',
      brand: order.brand || '',
      price: order.price || '',
      currency: order.currency || 'RUB',
      status: order.status || 'pending',
      estimated_days: order.estimated_days || '',
      notes: order.notes || '',
      image_url: order.image_url || '',
      referrer_bonus: order.referrer_bonus || 0,
      referral_bonus: order.referral_bonus || 0,
      referrer_email: order.referrer_email || '',
    });
    setDialogOpen(true);
  };

  const handleClientSelect = (client) => {
    const name = client.first_name
      ? `${client.first_name} ${client.last_name || ''}`.trim()
      : client.full_name || '';
    setClientAddress(client.delivery_address || '');
    setForm(prev => ({
      ...prev,
      client_email: client.email,
      client_name: name,
      referrer_email: client.referred_by || prev.referrer_email,
    }));
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(clientAddress);
    setAddrCopied(true);
    setTimeout(() => setAddrCopied(false), 2000);
  };

  const handleSave = async () => {
    const data = {
      ...form,
      price: form.price ? Number(form.price) : 0,
      estimated_days: form.estimated_days ? Number(form.estimated_days) : 0,
      referrer_bonus: Number(form.referrer_bonus) || 0,
      referral_bonus: Number(form.referral_bonus) || 0,
    };

    if (editingOrder) {
      await base44.entities.Order.update(editingOrder.id, data);
      if (data.status === 'delivered') {
        if (data.referral_bonus > 0) {
          const found = await base44.entities.User.filter({ email: data.client_email });
          if (found.length > 0) {
            await base44.entities.User.update(found[0].id, {
              bonus_balance: (found[0].bonus_balance || 0) + data.referral_bonus
            });
          }
        }
        if (data.referrer_bonus > 0 && data.referrer_email) {
          const found = await base44.entities.User.filter({ email: data.referrer_email });
          if (found.length > 0) {
            await base44.entities.User.update(found[0].id, {
              bonus_balance: (found[0].bonus_balance || 0) + data.referrer_bonus
            });
          }
        }
      }
      toast.success('Order updated');
    } else {
      await base44.entities.Order.create(data);
      toast.success('Order created');
    }

    queryClient.invalidateQueries({ queryKey: ['allOrders'] });
    setDialogOpen(false);
  };

  const updateField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders..."
            className="pl-10 bg-transparent glass border-border/30"
          />
        </div>
        <Button onClick={openNew} size="sm" className="bg-foreground text-background hover:bg-foreground/90">
          <Plus className="w-4 h-4 mr-1" /> New
        </Button>
      </div>

      <div className="space-y-2">
        {filtered.map(order => (
          <GlassCard key={order.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {order.image_url && (
                <img src={order.image_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{order.item_name}</p>
                <p className="text-xs text-muted-foreground">{order.client_name || order.client_email}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{getStatusLabel(order.status, 'ru')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {order.price && (
                <span className="text-xs font-light">{order.price.toLocaleString()} {order.currency}</span>
              )}
              <Button variant="ghost" size="icon" onClick={() => openEdit(order)} className="h-8 w-8">
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            </div>
          </GlassCard>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass border-border/20 max-h-[90vh] overflow-y-auto max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium tracking-wide">
              {editingOrder ? 'Edit Order' : 'New Order'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <ClientEmailAutocomplete
              value={form.client_email}
              onChange={(v) => updateField('client_email', v)}
              onClientSelect={handleClientSelect}
              clients={clients}
            />
            <div>
              <Label className="text-xs">Client Name</Label>
              <Input value={form.client_name} onChange={(e) => updateField('client_name', e.target.value)} className="mt-1 bg-transparent border-border/30" />
            </div>
            <div>
              <Label className="text-xs">Brand</Label>
              <Input value={form.brand} onChange={(e) => updateField('brand', e.target.value)} className="mt-1 bg-transparent border-border/30" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Item Name *</Label>
              <Input value={form.item_name} onChange={(e) => updateField('item_name', e.target.value)} className="mt-1 bg-transparent border-border/30" />
            </div>
            <div>
              <Label className="text-xs">Size</Label>
              <Input value={form.item_size} onChange={(e) => updateField('item_size', e.target.value)} className="mt-1 bg-transparent border-border/30" />
            </div>
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={form.item_category} onValueChange={(v) => updateField('item_category', v)}>
                <SelectTrigger className="mt-1 bg-transparent border-border/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Price</Label>
              <Input type="number" value={form.price} onChange={(e) => updateField('price', e.target.value)} className="mt-1 bg-transparent border-border/30" />
            </div>
            <div>
              <Label className="text-xs">Currency</Label>
              <Select value={form.currency} onValueChange={(v) => updateField('currency', v)}>
                <SelectTrigger className="mt-1 bg-transparent border-border/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={(v) => updateField('status', v)}>
                <SelectTrigger className="mt-1 bg-transparent border-border/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{getStatusLabel(s, 'ru')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Est. Days</Label>
              <Input type="number" value={form.estimated_days} onChange={(e) => updateField('estimated_days', e.target.value)} className="mt-1 bg-transparent border-border/30" />
            </div>

            <ImageUploadField value={form.image_url} onChange={(v) => updateField('image_url', v)} />

            {clientAddress && (
              <div className="col-span-2">
                <Label className="text-xs">Адрес доставки клиента</Label>
                <div className="mt-1 flex items-center gap-2 p-2 rounded-lg glass border border-border/20">
                  <span className="text-sm font-light flex-1 break-all">{clientAddress}</span>
                  <button type="button" onClick={copyAddress} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors ml-2">
                    {addrCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            <div className="col-span-2">
              <Label className="text-xs">Notes</Label>
              <Input value={form.notes} onChange={(e) => updateField('notes', e.target.value)} className="mt-1 bg-transparent border-border/30" />
            </div>

            <div className="col-span-2 border-t border-border/20 pt-3 mt-1">
              <p className="text-xs font-medium mb-2">Referral Bonuses</p>
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Referrer Email</Label>
              <Input value={form.referrer_email} onChange={(e) => updateField('referrer_email', e.target.value)} className="mt-1 bg-transparent border-border/30" placeholder="Auto-filled from client profile" />
            </div>
            <div>
              <Label className="text-xs">Referrer Bonus</Label>
              <Input type="number" value={form.referrer_bonus} onChange={(e) => updateField('referrer_bonus', e.target.value)} className="mt-1 bg-transparent border-border/30" />
            </div>
            <div>
              <Label className="text-xs">Referral Bonus (client)</Label>
              <Input type="number" value={form.referral_bonus} onChange={(e) => updateField('referral_bonus', e.target.value)} className="mt-1 bg-transparent border-border/30" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="glass border-border/30">Cancel</Button>
            <Button onClick={handleSave} className="bg-foreground text-background hover:bg-foreground/90">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}