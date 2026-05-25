// @ts-nocheck
import React from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '@/components/ui/GlassCard';
import { useTheme } from '@/lib/ThemeContext';
import { t } from '@/lib/i18n';
import { ChevronRight } from 'lucide-react';

/**
 * Premium hero-карточка с балансом баллов.
 * - Variant: elevated — усиленные тени и блик
 * - Большая цифра с tabular-nums
 * - Тонкая стрелка справа: «нажмите, чтобы открыть реферальную»
 */
export default function BonusCard({ balance }) {
  const { lang } = useTheme();
  const navigate = useNavigate();
  const formatted = (balance || 0).toLocaleString('ru-RU');

  return (
    <GlassCard
      variant="elevated"
      animated
      onClick={() => navigate('/Referral')}
      className="cursor-pointer p-6"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground font-medium lg-eyebrow">
            {t('bonusPoints', lang)}
          </p>
          <p className="text-[2.75rem] leading-none font-extralight tracking-[-0.02em] mt-2 lg-display lg-number">
            {formatted}
          </p>
        </div>
        <div className="shrink-0 w-10 h-10 rounded-full lg-subtle flex items-center justify-center">
          <ChevronRight className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
        </div>
      </div>
    </GlassCard>
  );
}
