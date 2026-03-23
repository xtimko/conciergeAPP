// @ts-nocheck
import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/lib/ThemeContext';
import { t } from '@/lib/i18n';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Copy, Check, Users, Gift, Link2 } from 'lucide-react';
import { toast } from 'sonner';

const REF_PREFIX = 'ref_';

export default function Referral() {
  const { lang } = useTheme();
  const [copiedCode, setCopiedCode] = React.useState(false);
  const [copiedLink, setCopiedLink] = React.useState(false);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: pub } = useQuery({
    queryKey: ['publicConfig'],
    queryFn: () => base44.public.config(),
  });

  const { data: statsData } = useQuery({
    queryKey: ['referralsStats'],
    queryFn: () => base44.auth.referralsStats(),
    enabled: !!user?.email,
  });

  const { data: myOrders = [] } = useQuery({
    queryKey: ['myOrders', user?.email],
    queryFn: () => base44.entities.Order.filter({ client_email: user.email }),
    enabled: !!user?.email,
  });

  const referrals = statsData?.referrals || [];

  const totalFromFriends = referrals.reduce((s, r) => s + Number(r.bonus_from_friend || 0), 0);

  const orderBonusRows = useMemo(() => {
    return myOrders
      .filter(
        (o) =>
          o.status === 'delivered' &&
          o.bonuses_applied &&
          Number(o.referral_bonus || 0) > 0,
      )
      .map((o) => {
        const raw = Number(o.referral_bonus || 0);
        const signed = o.client_bonus_mode === 'subtract' ? -raw : raw;
        return { o, signed };
      })
      .sort(
        (a, b) =>
          new Date(b.o.created_date || 0).getTime() - new Date(a.o.created_date || 0).getTime()
      );
  }, [myOrders]);

  const code = user?.referral_code || '';

  const referralLink = useMemo(() => {
    const bot = pub?.telegramBotUsername;
    if (!bot || !user?.id) return '';
    return `https://t.me/${bot}?startapp=${REF_PREFIX}${user.id}`;
  }, [pub?.telegramBotUsername, user?.id]);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    toast.success(t('codeCopied', lang));
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    toast.success(t('linkCopied', lang));
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!user) return null;

  return (
    <div className="px-4 pt-6 space-y-5">
      <div className="flex justify-center">
        <div className="w-14 h-14 rounded-full glass flex items-center justify-center">
          <Users className="w-6 h-6 text-muted-foreground" strokeWidth={1.25} />
        </div>
      </div>

      <GlassCard className="text-center">
        <p className="text-xs text-muted-foreground uppercase tracking-[0.15em] mb-2">
          {t('referralLink', lang)}
        </p>
        <p className="text-[11px] text-muted-foreground mb-3 px-1 leading-relaxed">
          {t('referralLinkHint', lang)}
        </p>
        {referralLink ? (
          <>
            <p className="text-[11px] font-mono break-all text-left bg-muted/20 rounded-lg px-2 py-2 mb-3">
              {referralLink}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="glass border-border/30 text-xs"
              onClick={copyLink}
            >
              {copiedLink ? <Check className="w-3 h-3 mr-2 text-green-400" /> : <Link2 className="w-3 h-3 mr-2" />}
              {copiedLink ? (lang === 'ru' ? 'Скопировано!' : 'Copied!') : t('copyReferralLink', lang)}
            </Button>
          </>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-2">
            {lang === 'ru'
              ? 'Задайте TELEGRAM_BOT_USERNAME на сервере в .env — тогда здесь появится ссылка.'
              : 'Set TELEGRAM_BOT_USERNAME in server .env to show the referral link.'}
          </p>
        )}
      </GlassCard>

      <GlassCard className="text-center">
        <p className="text-xs text-muted-foreground uppercase tracking-[0.15em] mb-3">
          {t('referralCode', lang)}
        </p>
        <p className="text-2xl font-light tracking-[0.3em] mb-4">{code || '—'}</p>
        {code && (
          <Button
            onClick={copyCode}
            variant="outline"
            size="sm"
            className="glass border-border/30 text-xs"
          >
            {copiedCode ? <Check className="w-3 h-3 mr-2 text-green-400" /> : <Copy className="w-3 h-3 mr-2" />}
            {copiedCode ? (lang === 'ru' ? 'Скопировано!' : 'Copied!') : t('copyCode', lang)}
          </Button>
        )}
      </GlassCard>

      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wide">{t('totalReferrals', lang)}</span>
          </div>
          <span className="text-lg font-light">{referrals.length}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Gift className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wide">{t('pointsFromFriendsTotal', lang)}</span>
          </div>
          <span className="text-lg font-light">{totalFromFriends.toLocaleString('ru-RU')}</span>
        </div>
      </GlassCard>

      <GlassCard>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-3">
          {t('bonusFromOrders', lang)}
        </p>
        {orderBonusRows.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">{t('noBonusHistory', lang)}</p>
        ) : (
          <div className="space-y-2">
            {orderBonusRows.map(({ o, signed }) => (
              <div
                key={o.id}
                className="flex items-center justify-between gap-2 py-2 border-b border-border/10 last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-light truncate">{o.item_name || '—'}</p>
                  <p className="text-[10px] text-muted-foreground font-mono truncate">{o.id}</p>
                </div>
                <span
                  className={`text-sm font-light tabular-nums shrink-0 ${
                    signed < 0 ? 'text-destructive' : 'text-foreground'
                  }`}
                >
                  {signed > 0 ? '+' : ''}
                  {signed.toLocaleString('ru-RU')}
                </span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2 px-0.5">
          {t('bonusFromFriendsStrip', lang)}
        </p>
        <div className="w-[calc(100%+1rem)] -mx-2 overflow-x-auto pb-1">
          <div className="flex gap-2 px-2 min-w-min">
            {referrals.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">{t('noReferrals', lang)}</p>
            ) : (
              referrals.map((ref) => (
                <div
                  key={ref.id}
                  className="w-[132px] shrink-0 rounded-2xl border border-border/25 bg-muted/15 px-3 py-2.5"
                >
                  <p className="text-[11px] font-light truncate leading-tight">
                    {ref.first_name || ref.full_name || ref.email}
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums mt-1">
                    +{Number(ref.bonus_from_friend || 0).toLocaleString('ru-RU')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
