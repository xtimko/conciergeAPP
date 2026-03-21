import React, { useState, useMemo } from 'react';
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
  client_email: '',
  client_name: '',
  item_name: '',
  item_size: '',
  item_category: 'footwear',
  brand: '',
  price: '',
  currency: 'RUB',
  status: 'pending',
  estimated_days: '',
  notes: '',
  image_url: '',
  referrer_bonus: 0,
  referral_bonus: 0,
  referrer_email: '',
  client_bonus_mode: 'add',
};

function formatClientLine(c) {
  const name = c.first_name
    ? `${c.first_name} ${c.last_name || ''}`.trim()
    : c.full_name || 'Без имени';
  const phone = c.phone || '';
  const tg = c.telegram_username ? `@${c.telegram_username.replace(/^@/, '')}` : '';
  return [name, phone, tg].filter(Boolean).join(' · ');
}

export default function AdminOrders() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [form, setForm] = useState(emptyOrder);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [clientAddress, setClientAddress] = useState('');
  const [addrCopied, setAddrCopied] = useState(false);
  const queryClient = useQueryClient();

  const { data: orders = [] } = useQuery({
    queryKey: ['allOrders'],
    queryFn: () => base44.entities.Order.list(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['allClients'],
    queryFn: () => base44.entities.User.list(),
  });

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) || null,
    [clients, selectedClientId],
  );

  const referrerUser = useMemo(() => {
    if (!selectedClient?.referred_by) return null;
    return clients.find((c) => c.email === selectedClient.referred_by) || null;
  }, [clients, selectedClient]);

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    return (
      !q ||
      [o.item_name, o.client_name, o.client_email, o.brand, o.status].some((f) =>
        f?.toLowerCase().includes(q),
      )
    );
  });

  const openNew = () => {
    setEditingOrder(null);
    setForm(emptyOrder);
    setClientSearch('');
    setSelectedClientId(null);
    setClientAddress('');
    setAddrCopied(false);
    setDialogOpen(true);
  };

  const openEdit = async (order) => {
    setEditingOrder(order);
    setAddrCopied(false);
    const found = order.client_email
      ? clients.find((c) => c.email === order.client_email)
      : null;
    if (found) {
      setSelectedClientId(found.id);
      setClientSearch(formatClientLine(found));
      setClientAddress(found.delivery_address || '');
    } else {
      setSelectedClientId(null);
      setClientSearch(order.client_name || '');
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
      client_bonus_mode: order.client_bonus_mode === 'subtract' ? 'subtract' : 'add',
    });
    setDialogOpen(true);
  };

  const handleClientSelect = (client) => {
    const name = client.first_name
      ? `${client.first_name} ${client.last_name || ''}`.trim()
      : client.full_name || '';
    setSelectedClientId(client.id);
    setClientSearch(formatClientLine(client));
    setClientAddress(client.delivery_address || '');
    setForm((prev) => ({
      ...prev,
      client_email: client.email,
      client_name: name,
      referrer_email: client.referred_by || '',
    }));
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(clientAddress);
    setAddrCopied(true);
    setTimeout(() => setAddrCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!editingOrder && (!selectedClientId || !form.client_email)) {
      toast.error('Выберите клиента из списка');
      return;
    }
    if (!form.item_name?.trim()) {
      toast.error('Укажите название товара');
      return;
    }

    const data = {
      ...form,
      price: form.price ? Number(form.price) : 0,
      estimated_days: form.estimated_days ? Number(form.estimated_days) : 0,
      referrer_bonus: Number(form.referrer_bonus) || 0,
      referral_bonus: Number(form.referral_bonus) || 0,
      client_bonus_mode: form.client_bonus_mode === 'subtract' ? 'subtract' : 'add',
    };

    if (editingOrder) {
      await base44.entities.Order.update(editingOrder.id, data);
      toast.success('Заказ обновлён');
    } else {
      await base44.entities.Order.create(data);
      toast.success('Заказ создан');
    }

    queryClient.invalidateQueries({ queryKey: ['allOrders'] });
    queryClient.invalidateQueries({ queryKey: ['allClients'] });
    setDialogOpen(false);
  };

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const hasReferrer = !!(selectedClient?.referred_by && referrerUser);
  const clientBonusBalance = selectedClient?.bonus_balance ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск заказов…"
            className="pl-10 bg-transparent glass border-border/30"
          />
        </div>
        <Button onClick={openNew} size="sm" className="bg-foreground text-background hover:bg-foreground/90">
          <Plus className="w-4 h-4 mr-1" /> Новый
        </Button>
      </div>

      <div className="space-y-2">
        {filtered.map((order) => (
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
              {order.price ? (
                <span className="text-xs font-light">
                  {order.price.toLocaleString()} {order.currency}
                </span>
              ) : null}
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
              {editingOrder ? 'Редактирование заказа' : 'Новый заказ'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <ClientEmailAutocomplete
              value={clientSearch}
              onChange={(v) => {
                setClientSearch(v);
                setSelectedClientId(null);
                setForm((p) => ({ ...p, client_email: '', referrer_email: '' }));
              }}
              onClientSelect={handleClientSelect}
              clients={clients}
              label="Клиент *"
            />
            <div>
              <Label className="text-xs">Имя клиента</Label>
              <Input
                value={form.client_name}
                onChange={(e) => updateField('client_name', e.target.value)}
                className="mt-1 bg-transparent border-border/30"
              />
            </div>
            <div>
              <Label className="text-xs">Бренд</Label>
              <Input
                value={form.brand}
                onChange={(e) => updateField('brand', e.target.value)}
                className="mt-1 bg-transparent border-border/30"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Товар *</Label>
              <Input
                value={form.item_name}
                onChange={(e) => updateField('item_name', e.target.value)}
                className="mt-1 bg-transparent border-border/30"
              />
            </div>
            <div>
              <Label className="text-xs">Размер</Label>
              <Input
                value={form.item_size}
                onChange={(e) => updateField('item_size', e.target.value)}
                className="mt-1 bg-transparent border-border/30"
              />
            </div>
            <div>
              <Label className="text-xs">Категория</Label>
              <Select value={form.item_category} onValueChange={(v) => updateField('item_category', v)}>
                <SelectTrigger className="mt-1 bg-transparent border-border/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Цена</Label>
              <Input
                type="number"
                value={form.price}
                onChange={(e) => updateField('price', e.target.value)}
                className="mt-1 bg-transparent border-border/30"
              />
            </div>
            <div>
              <Label className="text-xs">Валюта</Label>
              <Select value={form.currency} onValueChange={(v) => updateField('currency', v)}>
                <SelectTrigger className="mt-1 bg-transparent border-border/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Статус</Label>
              <Select value={form.status} onValueChange={(v) => updateField('status', v)}>
                <SelectTrigger className="mt-1 bg-transparent border-border/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {getStatusLabel(s, 'ru')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Срок доставки (дн.)</Label>
              <Input
                type="number"
                value={form.estimated_days}
                onChange={(e) => updateField('estimated_days', e.target.value)}
                className="mt-1 bg-transparent border-border/30"
              />
            </div>

            <ImageUploadField value={form.image_url} onChange={(v) => updateField('image_url', v)} />

            {clientAddress && (
              <div className="col-span-2">
                <Label className="text-xs">Адрес доставки клиента</Label>
                <div className="mt-1 flex items-center gap-2 p-2 rounded-lg glass border border-border/20">
                  <span className="text-sm font-light flex-1 break-all">{clientAddress}</span>
                  <button
                    type="button"
                    onClick={copyAddress}
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors ml-2"
                  >
                    {addrCopied ? (
                      <Check className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="col-span-2">
              <Label className="text-xs">Примечания</Label>
              <Input
                value={form.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                className="mt-1 bg-transparent border-border/30"
              />
            </div>

            <div className="col-span-2 border-t border-border/20 pt-3 mt-1">
              <p className="text-xs font-medium mb-2">Бонусы по заказу</p>
              {selectedClientId ? (
                <p className="text-xs text-muted-foreground mb-3">
                  Баланс клиента: <span className="text-foreground font-medium">{clientBonusBalance}</span>{' '}
                  бонусов
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mb-3">Выберите клиента, чтобы видеть баланс</p>
              )}
            </div>

            {hasReferrer && (
              <>
                <div className="col-span-2 rounded-lg border border-border/20 p-3 space-y-1">
                  <p className="text-xs font-medium">Реферер (пригласивший)</p>
                  <p className="text-sm font-light">
                    {referrerUser?.first_name
                      ? `${referrerUser.first_name} ${referrerUser.last_name || ''}`.trim()
                      : referrerUser?.full_name || '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">{referrerUser?.phone || '—'}</p>
                  <p className="text-xs text-muted-foreground">
                    TG id: {referrerUser?.telegram_id || '—'}
                    {referrerUser?.telegram_username
                      ? ` · @${referrerUser.telegram_username.replace(/^@/, '')}`
                      : ''}
                  </p>
                </div>
                <div>
                  <Label className="text-xs">Друг — бонусы владельцу реф. кода</Label>
                  <Input
                    type="number"
                    value={form.referrer_bonus}
                    onChange={(e) => updateField('referrer_bonus', e.target.value)}
                    className="mt-1 bg-transparent border-border/30"
                  />
                </div>
              </>
            )}

            <div className="col-span-2 flex flex-wrap gap-2 items-center">
              <span className="text-xs text-muted-foreground">Заказчик:</span>
              <div className="flex rounded-lg border border-border/30 overflow-hidden">
                <button
                  type="button"
                  className={`px-3 py-1.5 text-xs ${
                    form.client_bonus_mode !== 'subtract' ? 'bg-foreground text-background' : 'glass'
                  }`}
                  onClick={() => updateField('client_bonus_mode', 'add')}
                >
                  Накопить
                </button>
                <button
                  type="button"
                  className={`px-3 py-1.5 text-xs ${
                    form.client_bonus_mode === 'subtract' ? 'bg-foreground text-background' : 'glass'
                  }`}
                  onClick={() => updateField('client_bonus_mode', 'subtract')}
                >
                  Списать
                </button>
              </div>
            </div>
            <div className="col-span-2">
              <Label className="text-xs">
                {form.client_bonus_mode === 'subtract'
                  ? 'Сумма списания с заказчика (при доставке)'
                  : 'Сумма начисления заказчику (при доставке)'}
              </Label>
              <Input
                type="number"
                min={0}
                value={form.referral_bonus}
                onChange={(e) => updateField('referral_bonus', e.target.value)}
                className="mt-1 bg-transparent border-border/30"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="glass border-border/30">
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              disabled={!editingOrder && !selectedClientId}
              className="bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50"
            >
              Сохранить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
