import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/lib/ThemeContext';
import { t, getStatusLabel, getCategoryLabel } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import { Package, Calendar, Tag, Banknote, Clock, Copy, Check } from 'lucide-react';
import { hapticSuccess, hapticError, hapticImpact } from '@/lib/telegramHaptics';
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
  const [lightboxUrl, setLightboxUrl] = useState(null);

  useEffect(() => {
    setLightboxUrl(null);
  }, [order?.id]);

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
    <>
    <Drawer
      open={open && !!order}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose?.();
      }}
      shouldScaleBackground={false}
    >
      <DrawerContent className="max-h-[88vh] overflow-y-auto border-0 bg-background px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-1 outline-none">
        {!order ? null : (
          <>
            <DrawerHeader className="pb-3 text-left space-y-2">
              <DrawerTitle className="text-base font-medium tracking-wide pr-6">
                {order.item_name}
              </DrawerTitle>
              <Badge className={`w-fit text-xs ${statusStyles[order.status] || ''}`}>
                {getStatusLabel(order.status, lang)}
              </Badge>
            </DrawerHeader>

            {order.image_url && (
              <button
                type="button"
                className="w-full rounded-xl overflow-hidden mb-3 bg-muted/30 py-2 active:opacity-90"
                onClick={() => {
                  setLightboxUrl(order.image_url);
                  hapticImpact('light');
                }}
                aria-label={lang === 'ru' ? 'Увеличить фото' : 'Enlarge photo'}
              >
                <img
                  src={order.image_url}
                  alt=""
                  className="w-full max-h-[min(42vw,220px)] object-contain mx-auto block"
                />
              </button>
            )}

            <div className="flex items-start justify-between gap-2 py-2 border-b border-border/10 mb-2">
              <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                <Tag className="w-4 h-4 shrink-0" />
                <span className="text-xs">{lang === 'ru' ? 'ID заказа' : 'Order ID'}</span>
              </div>
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-[11px] font-mono text-right break-all">{order.id}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={copyId}
                  aria-label={lang === 'ru' ? 'Копировать ID' : 'Copy ID'}
                >
                  {idCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {rows.map((row, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 py-1.5 border-b border-border/10 last:border-0"
                >
                  <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                    <row.icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[11px]">{row.label}</span>
                  </div>
                  <span className="text-xs font-light text-right max-w-[58%] leading-snug">{row.value}</span>
                </div>
              ))}
            </div>

            {order.notes && (
              <div className="mt-3 p-3 rounded-xl bg-muted/30">
                <p className="text-[11px] text-muted-foreground">{t('notes', lang)}</p>
                <p className="text-sm font-light mt-1">{order.notes}</p>
              </div>
            )}

            {readOnly && (
              <p className="text-[10px] text-muted-foreground mt-3 text-center">
                {lang === 'ru' ? 'Только просмотр' : 'Read only'}
              </p>
            )}

            <DrawerFooter className="flex-col gap-2 px-0 pt-4 pb-0 sm:flex-col">
              <Button
                type="button"
                variant="secondary"
                className="w-full h-11 text-base"
                onClick={() => onClose?.()}
              >
                {lang === 'ru' ? 'Закрыть' : 'Close'}
              </Button>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
    {lightboxUrl && typeof document !== 'undefined'
      ? createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={lang === 'ru' ? 'Фото' : 'Photo'}
            className="fixed inset-0 z-[21000] flex items-center justify-center bg-black/85 p-4 touch-manipulation"
            onClick={() => setLightboxUrl(null)}
          >
            <img
              src={lightboxUrl}
              alt=""
              className="max-w-full max-h-[85dvh] w-auto h-auto object-contain rounded-lg shadow-2xl"
            />
          </div>,
          document.body
        )
      : null}
    </>
  );
}
