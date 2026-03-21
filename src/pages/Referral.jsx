import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/lib/ThemeContext';
import { t } from '@/lib/i18n';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Copy, Check, Users, Gift } from 'lucide-react';
import { toast } from 'sonner';

export default function Referral() {
  const { lang } = useTheme();
  const [copied, setCopied] = React.useState(false);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: statsData } = useQuery({
    queryKey: ['referralsStats'],
    queryFn: () => base44.auth.referralsStats(),
    enabled: !!user?.email,
  });

  const referrals = statsData?.referrals || [];

  const totalFromFriends = referrals.reduce((s, r) => s + Number(r.bonus_from_friend || 0), 0);

  const code = user?.referral_code || '';

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    toast.success(t('codeCopied', lang));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) return null;

  return (
    <div className="px-4 pt-6 space-y-5">
      <div className="text-center">
        <Gift className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <h2 className="text-sm font-medium tracking-wide">{t('referral', lang)}</h2>
      </div>

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
            {copied ? <Check className="w-3 h-3 mr-2 text-green-400" /> : <Copy className="w-3 h-3 mr-2" />}
            {copied ? (lang === 'ru' ? 'Скопировано!' : 'Copied!') : t('copyCode', lang)}
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
            <span className="text-xs uppercase tracking-wide">
              {lang === 'ru' ? 'Бонусы от друзей' : 'Bonuses from friends'}
            </span>
          </div>
          <span className="text-lg font-light">{totalFromFriends.toLocaleString('ru-RU')}</span>
        </div>
      </GlassCard>

      {referrals.length > 0 && (
        <GlassCard>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
            {t('referralHistory', lang)}
          </p>
          {referrals.map((ref) => (
            <div
              key={ref.id}
              className="flex items-center justify-between py-2 border-b border-border/10 last:border-0 gap-2"
            >
              <span className="text-sm font-light truncate">
                {ref.first_name || ref.full_name || ref.email}
              </span>
              <span className="text-sm font-light text-muted-foreground shrink-0">
                +{Number(ref.bonus_from_friend || 0).toLocaleString('ru-RU')}
              </span>
            </div>
          ))}
        </GlassCard>
      )}
    </div>
  );
}
