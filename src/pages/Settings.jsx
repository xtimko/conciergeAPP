import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/lib/ThemeContext';
import { t } from '@/lib/i18n';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Globe, Moon, Sun, Settings as SettingsIcon, Bell } from 'lucide-react';
import { toast } from 'sonner';

const defaultNotifyPrefs = () => ({
  orders: true,
  marketing: false,
  system: true,
});

export default function Settings() {
  const { lang, setLang, theme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const prefs = { ...defaultNotifyPrefs(), ...(me?.notify_preferences || {}) };

  const setNotifyKey = async (key, value) => {
    try {
      await base44.auth.updateMe({
        notify_preferences: { ...prefs, [key]: value },
      });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    } catch (e) {
      toast.error(lang === 'ru' ? 'Не удалось сохранить' : 'Could not save');
    }
  };

  const handleLangChange = async (newLang) => {
    setLang(newLang);
    await base44.auth.updateMe({ language: newLang });
    queryClient.invalidateQueries({ queryKey: ['me'] });
  };

  const handleThemeChange = async (newTheme) => {
    setTheme(newTheme);
    try {
      await base44.auth.updateMe({ theme: newTheme });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    } catch (e) {
      toast.error(lang === 'ru' ? 'Не удалось сохранить тему' : 'Could not save theme');
    }
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="px-4 pt-6 space-y-5">
      <div className="flex justify-center">
        <div className="w-14 h-14 rounded-full glass flex items-center justify-center">
          <SettingsIcon className="w-6 h-6 text-muted-foreground" strokeWidth={1.25} />
        </div>
      </div>

      <GlassCard className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sun className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{t('theme', lang)}</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={theme === 'light' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleThemeChange('light')}
            className={
              theme === 'light'
                ? 'bg-foreground text-background'
                : 'glass border-border/30'
            }
          >
            <Sun className="w-3.5 h-3.5 mr-1.5" />
            {t('lightTheme', lang)}
          </Button>
          <Button
            variant={theme === 'dark' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleThemeChange('dark')}
            className={
              theme === 'dark'
                ? 'bg-foreground text-background'
                : 'glass border-border/30'
            }
          >
            <Moon className="w-3.5 h-3.5 mr-1.5" />
            {t('darkTheme', lang)}
          </Button>
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{t('notifySection', lang)}</span>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-light">{t('notifyOrders', lang)}</span>
            <Switch
              checked={prefs.orders}
              onCheckedChange={(v) => setNotifyKey('orders', v)}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-light">{t('notifyMarketing', lang)}</span>
            <Switch
              checked={prefs.marketing}
              onCheckedChange={(v) => setNotifyKey('marketing', v)}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-light">{t('notifySystem', lang)}</span>
            <Switch
              checked={prefs.system}
              onCheckedChange={(v) => setNotifyKey('system', v)}
            />
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-4">
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
    </div>
  );
}
