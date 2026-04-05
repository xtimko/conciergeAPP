import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, Wallet, TrendingUp, Package, Percent, CalendarRange } from 'lucide-react';
import { toast } from 'sonner';
import { exportDeliveredPnLFile, exportMonthlySummaryFile } from '@/lib/exportFinanceCsv';
import { hapticSuccess, hapticError } from '@/lib/telegramHaptics';
import { orderPriceRub, orderCostRub } from '@/lib/orderFinanceRub';

export default function AdminFinance() {
  const { data: orders = [], isPending: loading } = useQuery({
    queryKey: ['allOrders'],
    queryFn: () => base44.entities.Order.list(),
  });

  const metrics = useMemo(() => {
    const delivered = orders.filter((o) => o.status === 'delivered');
    const active = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status));
    const revDel = delivered.reduce((s, o) => s + orderPriceRub(o), 0);
    const costDel = delivered.reduce((s, o) => s + orderCostRub(o), 0);
    const profitDel = revDel - costDel;
    const pipeline = active.reduce((s, o) => s + orderPriceRub(o), 0);
    const marginPct =
      revDel > 0 ? Math.round((profitDel / revDel) * 1000) / 10 : null;
    return {
      deliveredCount: delivered.length,
      revDel,
      costDel,
      profitDel,
      activeCount: active.length,
      pipeline,
      marginPct,
      cancelledCount: orders.filter((o) => o.status === 'cancelled').length,
    };
  }, [orders]);

  const runExport = async (kind) => {
    const d = new Date().toISOString().slice(0, 10);
    let result;
    if (kind === 'pnl') {
      result = await exportDeliveredPnLFile(orders, `delivered-pnl-${d}.csv`);
    } else {
      result = await exportMonthlySummaryFile(orders, `finance-months-${d}.csv`);
    }
    if (result === 'empty') {
      hapticError();
      toast.error('Нет доставленных заказов для выгрузки');
      return;
    }
    if (result === 'share') {
      hapticSuccess();
      toast.success('Откройте «Поделиться» и сохраните файл');
    } else if (result === 'download') {
      hapticSuccess();
      toast.success('Файл скачан');
    } else if (result === 'clipboard') {
      hapticSuccess();
      toast.success('CSV в буфере — вставьте в таблицу');
    } else {
      hapticError();
      toast.error('Не удалось выгрузить');
    }
  };

  const statCards = [
    {
      icon: Package,
      label: 'Доставлено',
      value: loading ? '…' : metrics.deliveredCount,
      sub: 'заказов',
    },
    {
      icon: TrendingUp,
      label: 'Выручка (доставлено)',
      value: loading ? '…' : `${metrics.revDel.toLocaleString('ru-RU')} ₽`,
      sub: 'по цене клиента',
    },
    {
      icon: Wallet,
      label: 'Прибыль (доставлено)',
      value: loading ? '…' : `${metrics.profitDel.toLocaleString('ru-RU')} ₽`,
      sub: 'цена − себестоимость',
    },
    {
      icon: Percent,
      label: 'Маржа',
      value:
        loading || metrics.marginPct == null
          ? '—'
          : `${metrics.marginPct} %`,
      sub: 'от выручки доставленных',
    },
    {
      icon: CalendarRange,
      label: 'В работе',
      value: loading ? '…' : metrics.activeCount,
      sub: loading ? '' : `сумма заказов ~${metrics.pipeline.toLocaleString('ru-RU')} ₽`,
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Показатели по <strong>доставленным</strong> заказам — для бухгалтерии и контроля маржи. Выгрузки в CSV
        откроются через «Поделиться» в Telegram или скачаются в браузере.
      </p>

      <div className="grid grid-cols-2 gap-2">
        {loading
          ? [1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-2xl border border-border/20 p-2.5">
                <Skeleton className="h-4 w-4 mx-auto mb-2 rounded-md" />
                <Skeleton className="h-6 w-16 mx-auto mb-1" />
                <Skeleton className="h-2.5 w-20 mx-auto" />
              </div>
            ))
          : statCards.map((s, i) => (
              <GlassCard key={i} className="text-center py-2.5 px-2">
                <s.icon className="w-4 h-4 mx-auto text-muted-foreground mb-1" strokeWidth={1.5} />
                <p className="text-base font-light tabular-nums leading-tight">{s.value}</p>
                <p className="text-[9px] uppercase tracking-wide text-muted-foreground mt-0.5 leading-tight">
                  {s.label}
                </p>
                {s.sub ? (
                  <p className="text-[8px] text-muted-foreground/80 mt-0.5 leading-snug px-1">{s.sub}</p>
                ) : null}
              </GlassCard>
            ))}
      </div>

      <GlassCard className="p-4 space-y-3">
        <h3 className="text-xs uppercase tracking-wide text-muted-foreground">Выгрузка файлов</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            className="glass border-border/30 justify-start h-auto py-3 px-4"
            onClick={() => runExport('pnl')}
          >
            <Download className="w-4 h-4 mr-3 shrink-0" />
            <span className="text-left text-sm">
              <span className="block font-medium">Доставленные + прибыль</span>
              <span className="block text-[11px] text-muted-foreground font-normal">
                Каждый заказ: цена, себестоимость, profit
              </span>
            </span>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="glass border-border/30 justify-start h-auto py-3 px-4"
            onClick={() => runExport('monthly')}
          >
            <Download className="w-4 h-4 mr-3 shrink-0" />
            <span className="text-left text-sm">
              <span className="block font-medium">Помесячно</span>
              <span className="block text-[11px] text-muted-foreground font-normal">
                Сводка выручки, себестоимости и прибыли по месяцам
              </span>
            </span>
          </Button>
        </div>
      </GlassCard>

      {!loading && metrics.cancelledCount > 0 ? (
        <p className="text-[11px] text-muted-foreground text-center">
          Отменённых заказов: {metrics.cancelledCount} (не входят в финансовые итоги доставленных)
        </p>
      ) : null}
    </div>
  );
}
