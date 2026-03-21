import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useTheme } from '@/lib/ThemeContext';
import { t, getStatusLabel, getCategoryLabel } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import { Package, Calendar, Tag, Banknote } from 'lucide-react';

export default function OrderDetailSheet({ order, open, onClose }) {
  const { lang } = useTheme();
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

  const rows = [
    { icon: Package, label: t('brand', lang), value: order.brand },
    { icon: Tag, label: t('size', lang), value: order.item_size },
    { icon: Tag, label: t('category', lang), value: order.item_category ? getCategoryLabel(order.item_category, lang) : null },
    { icon: Banknote, label: t('price', lang), value: order.price ? `${order.price.toLocaleString()} ${order.currency || 'RUB'}` : null },
    { icon: Calendar, label: t('estimatedDays', lang), value: order.estimated_days },
  ].filter(r => r.value);

  return (
    <Sheet open={open} onOpenChange={onClose}>
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
            <div key={i} className="flex items-center justify-between py-2 border-b border-border/10 last:border-0">
              <div className="flex items-center gap-2 text-muted-foreground">
                <row.icon className="w-4 h-4" />
                <span className="text-xs">{row.label}</span>
              </div>
              <span className="text-sm font-light">{row.value}</span>
            </div>
          ))}
        </div>

        {order.notes && (
          <div className="mt-4 p-3 rounded-xl bg-muted/30">
            <p className="text-xs text-muted-foreground">{t('notes', lang)}</p>
            <p className="text-sm font-light mt-1">{order.notes}</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}