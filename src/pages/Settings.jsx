import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/lib/ThemeContext';
import { t } from '@/lib/i18n';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Globe, LogOut } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const { lang, setLang } = useTheme();
  const queryClient = useQueryClient();

  const handleLangChange = async (newLang) => {
    setLang(newLang);
    await base44.auth.updateMe({ language: newLang });
    queryClient.invalidateQueries({ queryKey: ['me'] });
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="px-4 pt-6 space-y-5">
      <h2 className="text-center text-sm font-medium tracking-wide">{t('settings', lang)}</h2>

      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{t('language', lang)}</span>
        </div>
        <div className="flex gap-2">
          <Button
            variant={lang === 'ru' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleLangChange('ru')}
            className={lang === 'ru' ? 'bg-foreground text-background' : 'glass border-border/30'}
          >
            {t('russian', lang)}
          </Button>
          <Button
            variant={lang === 'en' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleLangChange('en')}
            className={lang === 'en' ? 'bg-foreground text-background' : 'glass border-border/30'}
          >
            {t('english', lang)}
          </Button>
        </div>
      </GlassCard>



      <div className="pt-4 text-center">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="text-sm font-light text-destructive hover:text-destructive/80"
        >
          <LogOut className="w-4 h-4 mr-2" />
          {t('logout', lang)}
        </Button>
      </div>
    </div>
  );
}