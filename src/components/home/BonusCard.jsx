import React from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '@/components/ui/GlassCard';
import { useTheme } from '@/lib/ThemeContext';
import { t } from '@/lib/i18n';
import { ChevronRight } from 'lucide-react';

export default function BonusCard({ balance }) {
  const { lang } = useTheme();
  const navigate = useNavigate();
  const formatted = (balance || 0).toLocaleString('ru-RU');

  return (
    <GlassCard
      className="text-center cursor-pointer active:scale-[0.98] transition-transform"
      onClick={() => navigate('/Referral')}>
      
      <p className="text-4xl font-light tracking-tight">{formatted}</p>
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mt-1">
        {t('bonusPoints', lang)}
      </p>
      


      
    </GlassCard>);

}