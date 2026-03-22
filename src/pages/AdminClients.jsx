import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Pencil, ClipboardList, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import OrderDetailSheet from '@/components/orders/OrderDetailSheet';
import { hapticSuccess, hapticError } from '@/lib/telegramHaptics';
import { buildClientDeliveryAddress } from '@/lib/clientAddress';
import {
  getClientDisplayHandle,
  getClientPrimaryName,
  getClientEmailForOrder,
  getClientPublicId,
} from '@/lib/clientDisplay';

export default function AdminClients() {
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showOrders, setShowOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailClient, setDetailClient] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const queryClient = useQueryClient();

  const { data: clients = [], isPending: clientsLoading } = useQuery({
    queryKey: ['allClients'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: clientOrders = [], isPending: clientOrdersLoading } = useQuery({
    queryKey: ['clientOrders', selectedClient?.id],
    queryFn: () =>
      base44.entities.Order.filter({ client_email: getClientEmailForOrder(selectedClient) }),
    enabled: !!selectedClient && showOrders,
  });

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      !q ||
      [
        c.full_name,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        c.city,
        c.referral_code,
        c.id,
        c.telegram_id,
        c.telegram_username,
      ].some((f) => String(f || '')
        .toLowerCase()
        .includes(q))
    );
  });

  const openEdit = (client) => {
    setDetailClient(null);
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
      toast.success('Клиент обновлён');
      hapticSuccess();
      setSelectedClient(null);
    } catch (e) {
      hapticError();
      toast.error(e?.message || 'Не удалось сохранить');
    }
  };

  const copyText = async (text, fieldKey, e) => {
    e?.stopPropagation();
    if (!text) {
      toast.error('Нечего копировать');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldKey);
      hapticSuccess();
      toast.success('Скопировано');
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      hapticError();
      toast.error('Не удалось скопировать');
    }
  };

  const copyFullAddress = (client, e) => {
    const addr = buildClientDeliveryAddress(client) || client.delivery_address || '';
    return copyText(addr, `addr-${client.id}`, e);
  };

  const viewOrders = (client) => {
    setDetailClient(null);
    setSelectedClient(client);
    setShowOrders(true);
  };

  const openEditFromCard = (client) => {
    setDetailClient(null);
    openEdit(client);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск: имя, телефон, @telegram, ID…"
          className="pl-10 bg-transparent glass border-border/30"
        />
      </div>

      <Dialog open={!!detailClient} onOpenChange={(v) => !v && setDetailClient(null)}>
        <DialogContent className="max-w-md max-h-[82vh] overflow-y-auto border-border/60 bg-background">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium tracking-wide">Карточка клиента</DialogTitle>
          </DialogHeader>
          {detailClient && (
            <div className="space-y-0 mt-1">
              {[
                ['Имя', [detailClient.first_name, detailClient.last_name].filter(Boolean).join(' ').trim()],
                ['Номер клиента', detailClient.public_id || getClientPublicId(detailClient)],
                ['Телефон', detailClient.phone],
                [
                  'Telegram',
                  detailClient.telegram_username
                    ? `@${String(detailClient.telegram_username).replace(/^@/, '')}`
                    : '',
                ],
                ...(detailClient.telegram_id
                  ? [['Telegram ID', String(detailClient.telegram_id)]]
                  : []),
                ['ID в системе', detailClient.id],
                ['Город', detailClient.city],
                ['Улица', detailClient.address_street],
                ['Дом', detailClient.address_house],
                ['Кв.', detailClient.address_apartment],
                ['Этаж', detailClient.address_floor],
                ['Подъезд', detailClient.address_entrance],
                ['Домофон', detailClient.intercom],
                ['Комментарий курьеру', detailClient.courier_comment],
                [
                  'Полный адрес',
                  buildClientDeliveryAddress(detailClient) || detailClient.delivery_address || '',
                ],
                ['Реф. код', detailClient.referral_code],
                ['Баллы', `${detailClient.bonus_balance ?? 0} pts`],
              ].map(([label, val], i) => {
                if (val == null || String(val).trim() === '') return null;
                const key = `f-${detailClient.id}-${i}`;
                return (
                  <div
                    key={key}
                    className="flex items-start justify-between gap-2 py-2 border-b border-border/10"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                      <p className="text-sm font-light break-words">{String(val)}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={(e) => copyText(String(val), key, e)}
                      aria-label={`Копировать ${label}`}
                    >
                      {copiedField === key ? (
                        <Check className="w-3.5 h-3.5 text-green-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                );
              })}
              <DialogFooter className="flex-col gap-2 sm:flex-col pt-4 pb-1 px-0">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full h-11"
                  onClick={() => setDetailClient(null)}
                >
                  Закрыть
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
              <div className="flex items-stretch justify-between gap-2">
                <button
                  type="button"
                  className="flex-1 min-w-0 text-left rounded-lg -m-1 p-1 hover:bg-white/[0.04] transition-colors"
                  onClick={() => setDetailClient(client)}
                >
                  <p className="text-sm font-medium truncate">
                    {getClientPrimaryName(client) || getClientDisplayHandle(client)}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {getClientPrimaryName(client)
                      ? getClientPublicId(client)
                      : [client.phone, client.city].filter(Boolean).join(' · ') || '\u00a0'}
                  </p>
                  <div className="flex gap-3 mt-1 flex-wrap">
                    {getClientPrimaryName(client) ? (
                      <>
                        {client.phone && (
                          <span className="text-xs text-muted-foreground">{client.phone}</span>
                        )}
                        {client.city && (
                          <span className="text-xs text-muted-foreground">{client.city}</span>
                        )}
                      </>
                    ) : null}
                  </div>
                </button>
                <div className="flex items-center gap-0.5 shrink-0">
                  <span className="text-xs font-light mr-1 hidden sm:inline">
                    {(client.bonus_balance || 0).toLocaleString()} pts
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => copyFullAddress(client, e)}
                    className="h-11 w-11 min-h-[44px] min-w-[44px]"
                    aria-label="Копировать адрес доставки"
                  >
                    {copiedField === `addr-${client.id}` ? (
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
                    onClick={() => openEditFromCard(client)}
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
            <DialogTitle className="text-sm font-medium tracking-wide">Редактирование клиента</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div>
              <Label className="text-xs">Имя</Label>
              <Input
                value={editForm.first_name}
                onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                className="mt-1 bg-transparent border-border/30"
              />
            </div>
            <div>
              <Label className="text-xs">Фамилия</Label>
              <Input
                value={editForm.last_name}
                onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                className="mt-1 bg-transparent border-border/30"
              />
            </div>
            <div>
              <Label className="text-xs">Телефон</Label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="mt-1 bg-transparent border-border/30"
              />
            </div>
            <div>
              <Label className="text-xs">Город</Label>
              <Input
                value={editForm.city}
                onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                className="mt-1 bg-transparent border-border/30"
              />
            </div>
            <div>
              <Label className="text-xs">Баланс баллов</Label>
              <Input
                type="number"
                value={editForm.bonus_balance}
                onChange={(e) => setEditForm({ ...editForm, bonus_balance: e.target.value })}
                className="mt-1 bg-transparent border-border/30"
              />
            </div>
            <div>
              <Label className="text-xs">Реф. код</Label>
              <Input
                value={editForm.referral_code}
                onChange={(e) => setEditForm({ ...editForm, referral_code: e.target.value })}
                className="mt-1 bg-transparent border-border/30"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setSelectedClient(null)} className="glass border-border/30">
              Отмена
            </Button>
            <Button onClick={handleSave} className="bg-foreground text-background hover:bg-foreground/90">
              Сохранить
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
              Заказы —{' '}
              {selectedClient
                ? getClientPrimaryName(selectedClient) || getClientDisplayHandle(selectedClient)
                : ''}
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
