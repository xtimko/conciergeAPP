import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Pencil, Copy, Check, ListChecks, CheckCircle2, Download, ListTodo } from 'lucide-react';
import { toast } from 'sonner';
import { getStatusLabel } from '@/lib/i18n';
import ClientEmailAutocomplete from '@/components/admin/ClientEmailAutocomplete';
import ImageUploadField from '@/components/admin/ImageUploadField';
import { exportOrdersCsv } from '@/lib/exportOrdersCsv';
import { hapticSuccess, hapticError, hapticImpact, hapticSelection } from '@/lib/telegramHaptics';

function inDateRange(iso, fromStr, toStr) {
  if (!fromStr && !toStr) return true;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return true;
  if (fromStr) {
    const from = new Date(`${fromStr}T00:00:00`);
    if (d < from) return false;
  }
  if (toStr) {
    const to = new Date(`${toStr}T23:59:59.999`);
    if (d > to) return false;
  }
  return true;
}

const STATUSES = ['pending', 'confirmed', 'sourcing', 'shipping', 'awaiting_pickup', 'delivered', 'cancelled'];
const TERMINAL_STATUSES = ['delivered', 'cancelled'];
const isActiveOrder = (o) => o && !TERMINAL_STATUSES.includes(o.status);
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
  cost_price: '',
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
  /** all | active | completed */
  const [orderFilter, setOrderFilter] = useState('all');
  /** быстрая смена статуса */
  const [statusQuick, setStatusQuick] = useState(null);
  const [quickStatusValue, setQuickStatusValue] = useState('pending');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkApplyStatus, setBulkApplyStatus] = useState('pending');
  const [copiedId, setCopiedId] = useState(null);
  /** created_desc | created_asc | updated_desc */
  const [sortMode, setSortMode] = useState('created_desc');
  const queryClient = useQueryClient();

  const { data: orders = [], isPending: ordersLoading } = useQuery({
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

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orders.filter((o) => {
      const matchSearch =
        !q ||
        [o.item_name, o.client_name, o.client_email, o.brand, o.status, o.id].some((f) =>
          String(f || '')
            .toLowerCase()
            .includes(q),
        );
      if (!matchSearch) return false;
      if (orderFilter === 'active') return isActiveOrder(o);
      if (orderFilter === 'completed') return !isActiveOrder(o);
      return true;
    }).filter((o) => {
      if (statusFilter && o.status !== statusFilter) return false;
      if (!inDateRange(o.created_date, dateFrom, dateTo)) return false;
      return true;
    });
  }, [orders, search, orderFilter, statusFilter, dateFrom, dateTo]);

  const displayedOrders = useMemo(() => {
    const arr = [...filtered];
    const t = (iso) => new Date(iso || 0).getTime();
    const byCreatedDesc = (a, b) => t(b.created_date) - t(a.created_date);
    const byCreatedAsc = (a, b) => t(a.created_date) - t(b.created_date);
    const byUpdatedDesc = (a, b) =>
      t(b.updated_date || b.created_date) - t(a.updated_date || a.created_date);
    if (sortMode === 'created_desc') arr.sort(byCreatedDesc);
    else if (sortMode === 'created_asc') arr.sort(byCreatedAsc);
    else if (sortMode === 'updated_desc') arr.sort(byUpdatedDesc);
    return arr;
  }, [filtered, sortMode]);

  useEffect(() => {
    if (!selectionMode) setSelectedIds(new Set());
  }, [selectionMode]);

  const toggleSelected = useCallback((id) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
    hapticImpact('light');
  }, []);

  const selectAllInView = useCallback(() => {
    setSelectedIds(new Set(displayedOrders.map((o) => o.id)));
    hapticSelection();
  }, [displayedOrders]);

  const copyOrderId = async (id, e) => {
    e?.stopPropagation();
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      hapticSuccess();
      toast.success('ID заказа скопирован');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      hapticError();
      toast.error('Не удалось скопировать');
    }
  };

  const handleExportCsv = async () => {
    if (!displayedOrders.length) {
      toast.error('Нет заказов для экспорта');
      return;
    }
    const fn = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    const result = await exportOrdersCsv(displayedOrders, fn);
    if (result === 'share') {
      hapticSuccess();
      toast.success('Откройте меню «Поделиться» и сохраните файл');
    } else if (result === 'download') {
      hapticSuccess();
      toast.success('Файл скачан');
    } else if (result === 'clipboard') {
      hapticSuccess();
      toast.success('CSV скопирован — вставьте в Numbers/Excel или в заметки и сохраните');
    } else {
      hapticError();
      toast.error('Не удалось выгрузить — попробуйте в другом браузере');
    }
  };

  const applyBulkStatus = async () => {
    const ids = [...selectedIds].filter((id) => displayedOrders.some((o) => o.id === id));
    if (!ids.length) {
      toast.error('Выберите заказы');
      return;
    }
    try {
      await Promise.all(ids.map((id) => base44.entities.Order.update(id, { status: bulkApplyStatus })));
      queryClient.invalidateQueries({ queryKey: ['allOrders'] });
      queryClient.invalidateQueries({ queryKey: ['allClients'] });
      setSelectedIds(new Set());
      setSelectionMode(false);
      hapticSuccess();
      toast.success(`Обновлено заказов: ${ids.length}`);
    } catch (e) {
      hapticError();
      toast.error(e?.message || 'Ошибка массового обновления');
    }
  };

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
      cost_price: order.cost_price != null ? order.cost_price : '',
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
      hapticError();
      toast.error('Выберите клиента из списка');
      return;
    }
    if (!form.item_name?.trim()) {
      hapticError();
      toast.error('Укажите название товара');
      return;
    }

    const data = {
      ...form,
      price: form.price ? Number(form.price) : 0,
      cost_price: form.cost_price !== '' && form.cost_price != null ? Number(form.cost_price) : 0,
      estimated_days: form.estimated_days ? Number(form.estimated_days) : 0,
      referrer_bonus: Number(form.referrer_bonus) || 0,
      referral_bonus: Number(form.referral_bonus) || 0,
      client_bonus_mode: form.client_bonus_mode === 'subtract' ? 'subtract' : 'add',
    };

    try {
      if (editingOrder) {
        await base44.entities.Order.update(editingOrder.id, data);
        toast.success('Заказ обновлён');
      } else {
        await base44.entities.Order.create(data);
        toast.success('Заказ создан');
      }
      hapticSuccess();
      queryClient.invalidateQueries({ queryKey: ['allOrders'] });
      queryClient.invalidateQueries({ queryKey: ['allClients'] });
      setDialogOpen(false);
    } catch (e) {
      hapticError();
      toast.error(e?.message || 'Не удалось сохранить');
    }
  };

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const hasReferrer = !!(selectedClient?.referred_by && referrerUser);
  const clientBonusBalance = selectedClient?.bonus_balance ?? 0;

  const openQuickStatus = (order) => {
    setStatusQuick(order);
    setQuickStatusValue(order.status || 'pending');
  };

  const saveQuickStatus = async () => {
    if (!statusQuick) return;
    try {
      await base44.entities.Order.update(statusQuick.id, { status: quickStatusValue });
      toast.success('Статус обновлён');
      hapticSuccess();
      queryClient.invalidateQueries({ queryKey: ['allOrders'] });
      queryClient.invalidateQueries({ queryKey: ['allClients'] });
      setStatusQuick(null);
    } catch (e) {
      hapticError();
      toast.error(e?.message || 'Не удалось обновить статус');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск заказов…"
            className="pl-10 bg-transparent glass border-border/30"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          className="glass border-border/30 shrink-0 h-10 px-3"
          title="Экспорт CSV"
        >
          <Download className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant={selectionMode ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setSelectionMode((v) => !v);
            hapticImpact('light');
          }}
          className={
            selectionMode
              ? 'bg-foreground text-background shrink-0 h-10'
              : 'glass border-border/30 shrink-0 h-10'
          }
          title="Массовая смена статуса"
        >
          <ListTodo className="w-4 h-4" />
        </Button>
        <Button onClick={openNew} size="sm" className="bg-foreground text-background hover:bg-foreground/90 shrink-0 h-10">
          <Plus className="w-4 h-4 mr-1" /> Новый
        </Button>
      </div>

      {selectionMode && (
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-border/30 bg-muted/20">
          <span className="text-xs text-muted-foreground">
            Выбрано: {selectedIds.size} / {displayedOrders.length}
          </span>
          <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={selectAllInView}>
            Все на экране
          </Button>
          <Select value={bulkApplyStatus} onValueChange={setBulkApplyStatus}>
            <SelectTrigger className="h-9 w-[180px] bg-transparent border-border/30 text-xs">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {getStatusLabel(s, 'ru')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            className="bg-foreground text-background h-9"
            onClick={applyBulkStatus}
            disabled={!selectedIds.size}
          >
            Применить статус
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-x-2 gap-y-1.5">
        <div className="min-w-[130px] flex-1 sm:max-w-[200px]">
          <Label className="text-[9px] uppercase tracking-wide text-muted-foreground leading-none">Статус</Label>
          <Select
            value={statusFilter || 'all'}
            onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}
          >
            <SelectTrigger className="mt-0.5 h-8 text-xs py-0 bg-transparent border-border/30">
              <SelectValue placeholder="Все" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                Все статусы
              </SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">
                  {getStatusLabel(s, 'ru')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[140px] flex-1 sm:max-w-[190px]">
          <Label className="text-[9px] uppercase tracking-wide text-muted-foreground leading-none">Сортировка</Label>
          <Select value={sortMode} onValueChange={setSortMode}>
            <SelectTrigger className="mt-0.5 h-8 text-xs py-0 bg-transparent border-border/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_desc" className="text-xs">
                Дата создания ↓
              </SelectItem>
              <SelectItem value="created_asc" className="text-xs">
                Дата создания ↑
              </SelectItem>
              <SelectItem value="updated_desc" className="text-xs">
                Обновлён ↓
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-1.5 items-end">
          <div>
            <Label className="text-[9px] uppercase tracking-wide text-muted-foreground leading-none block">С</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 text-[11px] px-2 w-[128px] sm:w-[132px] bg-transparent border-border/30"
            />
          </div>
          <div>
            <Label className="text-[9px] uppercase tracking-wide text-muted-foreground leading-none block">По</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 text-[11px] px-2 w-[128px] sm:w-[132px] bg-transparent border-border/30"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={orderFilter === 'all' ? 'default' : 'outline'}
          className={orderFilter === 'all' ? 'bg-foreground text-background' : 'glass border-border/30'}
          onClick={() => setOrderFilter('all')}
        >
          Все ({orders.length})
        </Button>
        <Button
          type="button"
          size="sm"
          variant={orderFilter === 'active' ? 'default' : 'outline'}
          className={orderFilter === 'active' ? 'bg-foreground text-background' : 'glass border-border/30'}
          onClick={() => setOrderFilter('active')}
        >
          <ListChecks className="w-3.5 h-3.5 mr-1" />
          Активные ({orders.filter(isActiveOrder).length})
        </Button>
        <Button
          type="button"
          size="sm"
          variant={orderFilter === 'completed' ? 'default' : 'outline'}
          className={orderFilter === 'completed' ? 'bg-foreground text-background' : 'glass border-border/30'}
          onClick={() => setOrderFilter('completed')}
        >
          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
          Завершённые ({orders.filter((o) => !isActiveOrder(o)).length})
        </Button>
      </div>

      <div className="space-y-2">
        {ordersLoading ? (
          <>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-[1.35rem] border border-border/20 p-4 flex gap-3">
                <Skeleton className="h-14 w-14 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full max-w-[240px]" />
                  <Skeleton className="h-3 w-full max-w-[160px]" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </>
        ) : (
          displayedOrders.map((order) => (
            <GlassCard
              key={order.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (selectionMode) toggleSelected(order.id);
                else openQuickStatus(order);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (selectionMode) toggleSelected(order.id);
                  else openQuickStatus(order);
                }
              }}
              className={`flex items-stretch justify-between min-h-[3.75rem] py-3 px-3 sm:px-4 cursor-pointer ${
                selectionMode && selectedIds.has(order.id) ? 'ring-1 ring-foreground/30' : ''
              }`}
            >
              {selectionMode && (
                <div
                  className="flex items-center pr-2"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={selectedIds.has(order.id)}
                    onCheckedChange={() => toggleSelected(order.id)}
                    className="h-5 w-5"
                  />
                </div>
              )}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {order.image_url && (
                  <img src={order.image_url} alt="" className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{order.item_name}</p>
                  <p className="text-xs text-muted-foreground">{order.client_name || order.client_email}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{getStatusLabel(order.status, 'ru')}</p>
                  <p className="text-[10px] text-muted-foreground/80 mt-0.5 font-mono truncate">
                    ID: {order.id}
                    {order.updated_date ? ` · обн. ${new Date(order.updated_date).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {order.price ? (
                  <span className="text-xs font-light hidden sm:inline mr-1">
                    {order.price.toLocaleString()} {order.currency}
                  </span>
                ) : null}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyOrderId(order.id, e);
                  }}
                  className="h-11 w-11 min-h-[44px] min-w-[44px]"
                  aria-label="Копировать ID заказа"
                >
                  {copiedId === order.id ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(order);
                  }}
                  className="h-11 w-11 min-h-[44px] min-w-[44px]"
                  aria-label="Редактировать заказ"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            </GlassCard>
          ))
        )}
        {!ordersLoading && displayedOrders.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Нет заказов по текущим фильтрам</p>
        )}
      </div>

      <Dialog open={!!statusQuick} onOpenChange={(v) => !v && setStatusQuick(null)}>
        <DialogContent className="max-w-sm border-border/60 bg-background">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium tracking-wide">Статус заказа</DialogTitle>
          </DialogHeader>
          {statusQuick && (
            <>
              <p className="text-sm font-light line-clamp-2">{statusQuick.item_name}</p>
              <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                <p className="text-[10px] font-mono text-muted-foreground break-all">ID: {statusQuick.id}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 shrink-0"
                  onClick={() => copyOrderId(statusQuick.id)}
                >
                  {copiedId === statusQuick.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
              </div>
              {statusQuick.updated_date && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Обновлён:{' '}
                  {new Date(statusQuick.updated_date).toLocaleString('ru-RU', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </p>
              )}
              <div className="mt-2">
                <Label className="text-xs">Новый статус</Label>
                <Select value={quickStatusValue} onValueChange={setQuickStatusValue}>
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
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setStatusQuick(null)} className="glass border-border/30">
                  Отмена
                </Button>
                <Button onClick={saveQuickStatus} className="bg-foreground text-background hover:bg-foreground/90">
                  Сохранить
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-y-auto border-border/60 bg-background"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
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
              <Label className="text-xs">Себестоимость</Label>
              <Input
                type="number"
                min={0}
                value={form.cost_price}
                onChange={(e) => updateField('cost_price', e.target.value)}
                className="mt-1 bg-transparent border-border/30"
                placeholder="0"
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
              <p className="text-xs font-medium mb-2">Баллы по заказу</p>
              {selectedClientId ? (
                <p className="text-xs text-muted-foreground mb-3">
                  Баланс клиента: <span className="text-foreground font-medium">{clientBonusBalance}</span>{' '}
                  баллов
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
                  <Label className="text-xs">Друг — баллы владельцу реф. кода</Label>
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
