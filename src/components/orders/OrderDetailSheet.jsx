import React, { useMemo, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/lib/ThemeContext';
import { t, getStatusLabel, getCategoryLabel } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import { Package, Calendar, Tag, Banknote, Clock, Copy, Check } from 'lucide-react';
import { hapticSuccess, hapticError } from '@/lib/telegramHaptics';
import { toast } from 'sonner';

function formatDate(iso, locale) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

export default function OrderDetailSheet({ order, open, onClose, readOnly }) {
  const { lang } = useTheme();
  const [idCopied, setIdCopied] = useState(false);

  const copyId = async () => {
    if (!order?.id) return;
    try {
      await navigator.clipboard.writeText(order.id);
      setIdCopied(true);
      hapticSuccess();
      toast.success(lang === 'ru' ? 'ID скопирован' : 'ID copied');
      setTimeout(() => setIdCopied(false), 2000);
    } catch {
      hapticError();
      toast.error(lang === 'ru' ? 'Не удалось скопировать' : 'Copy failed');
    }
  };

  const { etaLabel, daysLeftLabel } = useMemo(() => {
    if (!order) return { etaLabel: null, daysLeftLabel: null };
    const created = order.created_date ? new Date(order.created_date) : null;
    const estDays = Number(order.estimated_days || 0);
    if (!created || !estDays || estDays <= 0) {
      return { etaLabel: null, daysLeftLabel: null };
    }
    const eta = new Date(created.getTime() + estDays * 86400000);
    const locale = lang === 'ru' ? 'ru-RU' : 'en-US';
    const etaLabel = eta.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const now = new Date();
    const diffMs = eta.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffMs / 86400000);
    let daysLeftLabel;
    if (order.status === 'delivered' || order.status === 'cancelled') {
      daysLeftLabel = null;
    } else if (daysLeft <= 0) {
      daysLeftLabel = lang === 'ru' ? 'Срок истёк' : 'Past expected date';
    } else {
      daysLeftLabel =
        lang === 'ru'
          ? `Осталось дней: ${daysLeft}`
          : `${daysLeft} day(s) left`;
    }
    return { etaLabel, daysLeftLabel };
  }, [order, lang]);

  const statusStyles = {
    pending: 'bg-muted text-muted-foreground',
    confirmed: 'bg-secondary text-secondary-foreground',
    sourcing: 'bg-secondary text-secondary-foreground',
    shipping: 'bg-primary/20 text-foreground',
    awaiting_pickup: 'bg-primary/30 text-foreground',
    delivered: 'bg-primary/10 text-muted-foreground',
    cancelled: 'bg-destructive/20 text-destructive',
  };

  const rows = useMemo(() => {
    if (!order) return [];
    const orderDateStr = formatDate(order.created_date, lang);
    const updatedStr = order.updated_date
      ? new Date(order.updated_date).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', {
          dateStyle: 'short',
          timeStyle: 'short',
        })
      : null;
    return [
      { icon: Calendar, label: lang === 'ru' ? 'Дата заказа' : 'Order date', value: orderDateStr },
      ...(updatedStr
        ? [
            {
              icon: Clock,
              label: lang === 'ru' ? 'Обновлён' : 'Last updated',
              value: updatedStr,
            },
          ]
        : []),
      { icon: Package, label: t('brand', lang), value: order.brand },
      { icon: Tag, label: t('size', lang), value: order.item_size },
      {
        icon: Tag,
        label: t('category', lang),
        value: order.item_category ? getCategoryLabel(order.item_category, lang) : null,
      },
      {
        icon: Banknote,
        label: t('price', lang),
        value: order.price ? `${order.price.toLocaleString()} ${order.currency || 'RUB'}` : null,
      },
      {
        icon: Clock,
        label: lang === 'ru' ? 'Примерная дата получения' : 'Approx. delivery',
        value: etaLabel,
      },
      {
        icon: Calendar,
        label: lang === 'ru' ? 'До получения' : 'Until delivery',
        value: daysLeftLabel,
      },
    ].filter((r) => r.value);
  }, [order, lang, etaLabel, daysLeftLabel]);

  return (
    <Sheet
      open={open && !!order}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose?.();
      }}
    >
      <SheetContent
        side="bottom"
        className="rounded-t-[1.75rem] max-h-[85vh] overflow-y-auto border-0 bg-background pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] pt-2"
      >
        {!order ? null : (
          <>
        <SheetHeader className="pb-4">
          <SheetTitle className="text-base font-medium tracking-wide pr-8">
            {order.item_name}
          </SheetTitle>
          <Badge className={`w-fit text-xs ${statusStyles[order.status] || ''}`}>
            {getStatusLabel(order.status, lang)}
          </Badge>
        </SheetHeader>

        {order.image_url && (
          <div className="rounded-xl overflow-hidden mb-4">
            <img src={order.image_url} alt={order.item_name} className="w-full h-48 object-cover" />
          </div>
        )}

        <div className="flex items-start justify-between gap-2 py-2 border-b border-border/10 mb-2">
          <div className="flex items-center gap-2 text-muted-foreground min-w-0">
            <Tag className="w-4 h-4 shrink-0" />
            <span className="text-xs">{lang === 'ru' ? 'ID заказа' : 'Order ID'}</span>
          </div>
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-xs font-mono text-right break-all">{order.id}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={copyId}
              aria-label={lang === 'ru' ? 'Копировать ID' : 'Copy ID'}
            >
              {idCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {rows.map((row, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 border-b border-border/10 last:border-0"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <row.icon className="w-4 h-4" />
                <span className="text-xs">{row.label}</span>
              </div>
              <span className="text-sm font-light text-right max-w-[60%]">{row.value}</span>
            </div>
          ))}
        </div>

        {order.notes && (
          <div className="mt-4 p-3 rounded-xl bg-muted/30">
            <p className="text-xs text-muted-foreground">{t('notes', lang)}</p>
            <p className="text-sm font-light mt-1">{order.notes}</p>
          </div>
        )}

        {readOnly && (
          <p className="text-[10px] text-muted-foreground mt-4 text-center">
            {lang === 'ru' ? 'Только просмотр' : 'Read only'}
          </p>
        )}

        <SheetFooter className="flex-col gap-2 sm:flex-col pt-6 pb-1">
          <Button
            type="button"
            variant="secondary"
            className="w-full h-12 text-base"
            onClick={() => onClose?.()}
          >
            {lang === 'ru' ? 'Закрыть' : 'Close'}
          </Button>
        </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
