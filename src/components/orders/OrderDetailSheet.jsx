import React, { useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useTheme } from '@/lib/ThemeContext';
import { t, getStatusLabel, getCategoryLabel } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import { Package, Calendar, Tag, Banknote, Clock } from 'lucide-react';

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

  if (!order) return null;

  const statusStyles = {
    pending: 'bg-muted text-muted-foreground',
    confirmed: 'bg-secondary text-secondary-foreground',
    sourcing: 'bg-secondary text-secondary-foreground',
    shipping: 'bg-primary/20 text-foreground',
    awaiting_pickup: 'bg-primary/30 text-foreground',
    delivered: 'bg-primary/10 text-muted-foreground',
    cancelled: 'bg-destructive/20 text-destructive',
  };

  const orderDateStr = formatDate(order.created_date, lang);

  const rows = [
    { icon: Calendar, label: lang === 'ru' ? 'Дата заказа' : 'Order date', value: orderDateStr },
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

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose?.();
      }}
    >
      <SheetContent side="bottom" className="rounded-t-3xl glass border-border/20 max-h-[80vh]">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-base font-medium tracking-wide">
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
      </SheetContent>
    </Sheet>
  );
}
