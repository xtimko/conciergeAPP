import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useTheme } from '@/lib/ThemeContext';
import { t } from '@/lib/i18n';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { phoneChangeFromRawInput } from '@/lib/phoneRu';

export default function Onboarding() {
  const { lang } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [phoneDisplay, setPhoneDisplay] = useState('+7(');
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    city: '',
    address_street: '',
    address_house: '',
    address_apartment: '',
    address_floor: '',
    address_entrance: '',
    intercom: '',
    courier_comment: '',
    referral_code: ''
  });

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const onPhoneChange = (e) => {
    const { formatted, storage } = phoneChangeFromRawInput(e.target.value);
    setPhoneDisplay(formatted === '' ? '+7(' : formatted);
    update('phone', storage);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const digits = String(form.phone || '').replace(/\D/g, '');
    if (digits.length < 11) {
      toast.error(lang === 'ru' ? 'Введите полный номер в формате +7(999)123-45-67' : 'Enter full phone number');
      return;
    }
    setLoading(true);
    try {
      await base44.auth.completeOnboarding({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        address_street: form.address_street.trim(),
        address_house: form.address_house.trim(),
        address_apartment: form.address_apartment.trim(),
        address_floor: form.address_floor.trim(),
        address_entrance: form.address_entrance.trim(),
        intercom: form.intercom.trim(),
        courier_comment: form.courier_comment.trim(),
        referral_code: form.referral_code.trim()
      });
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success(lang === 'ru' ? 'Добро пожаловать!' : 'Welcome!');
      navigate('/Home', { replace: true });
    } catch (err) {
      toast.error(err?.message || (lang === 'ru' ? 'Ошибка сохранения' : 'Save failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background px-4 miniapp-header-pt pb-28">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-lg font-normal tracking-widest uppercase mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            Concierge
          </h1>
          <p className="text-sm text-muted-foreground">
            {lang === 'ru'
              ? 'Город и телефон обязательны; подробный адрес можно указать позже в профиле'
              : 'City and phone are required; you can add the full address later in your profile'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <GlassCard className="space-y-4">
            <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
              {lang === 'ru' ? 'Контакты' : 'Contacts'}
            </p>
            <div>
              <Label className="text-xs text-muted-foreground">{t('firstName', lang)} *</Label>
              <Input
                required
                value={form.first_name}
                onChange={(e) => update('first_name', e.target.value)}
                className="mt-1 bg-transparent border-border/30"
                autoComplete="given-name"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t('lastName', lang)} *</Label>
              <Input
                required
                value={form.last_name}
                onChange={(e) => update('last_name', e.target.value)}
                className="mt-1 bg-transparent border-border/30"
                autoComplete="family-name"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t('phone', lang)} * (+7)</Label>
              <Input
                required
                value={phoneDisplay}
                onChange={onPhoneChange}
                placeholder="+7(999)123-45-67"
                className="mt-1 bg-transparent border-border/30 font-mono text-[13px]"
                inputMode="tel"
                autoComplete="tel"
              />
            </div>
          </GlassCard>

          <GlassCard className="space-y-4">
            <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
              {lang === 'ru' ? 'Адрес доставки' : 'Delivery address'}
            </p>
            <div>
              <Label className="text-xs text-muted-foreground">{t('city', lang)} *</Label>
              <Input
                required
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                className="mt-1 bg-transparent border-border/30"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                {lang === 'ru' ? 'Улица (можно позже в профиле)' : 'Street (optional — add in profile)'}
              </Label>
              <Input
                value={form.address_street}
                onChange={(e) => update('address_street', e.target.value)}
                className="mt-1 bg-transparent border-border/30"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">
                  {lang === 'ru' ? 'Дом' : 'Building'}
                </Label>
                <Input
                  value={form.address_house}
                  onChange={(e) => update('address_house', e.target.value)}
                  className="mt-1 bg-transparent border-border/30"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{lang === 'ru' ? 'Кв.' : 'Apt.'}</Label>
                <Input
                  value={form.address_apartment}
                  onChange={(e) => update('address_apartment', e.target.value)}
                  className="mt-1 bg-transparent border-border/30"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">{lang === 'ru' ? 'Этаж' : 'Floor'}</Label>
                <Input
                  value={form.address_floor}
                  onChange={(e) => update('address_floor', e.target.value)}
                  className="mt-1 bg-transparent border-border/30"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{lang === 'ru' ? 'Подъезд' : 'Entrance'}</Label>
                <Input
                  value={form.address_entrance}
                  onChange={(e) => update('address_entrance', e.target.value)}
                  className="mt-1 bg-transparent border-border/30"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{lang === 'ru' ? 'Домофон' : 'Intercom'}</Label>
              <Input
                value={form.intercom}
                onChange={(e) => update('intercom', e.target.value)}
                className="mt-1 bg-transparent border-border/30"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                {lang === 'ru' ? 'Комментарий курьеру' : 'Courier note'}
              </Label>
              <Textarea
                value={form.courier_comment}
                onChange={(e) => update('courier_comment', e.target.value)}
                className="mt-1 min-h-[80px] bg-transparent border-border/30 resize-none"
                placeholder={lang === 'ru' ? 'Ориентир для курьера…' : 'Landmarks for courier…'}
              />
            </div>
          </GlassCard>

          <GlassCard className="space-y-3">
            <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
              {lang === 'ru' ? 'Реферальный код друга' : "Friend's referral code"}
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {lang === 'ru'
                ? 'Если вас пригласил друг — вставьте его код. Поле можно оставить пустым.'
                : "If a friend invited you, paste their code. You can leave this empty."}
            </p>
            <Input
              value={form.referral_code}
              onChange={(e) => update('referral_code', e.target.value)}
              className="bg-transparent border-border/30 font-mono tracking-wider"
              placeholder="REF-XXXXXXXX"
            />
          </GlassCard>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-foreground text-background hover:bg-foreground/90 py-6 text-sm tracking-wide"
          >
            {loading ? '…' : lang === 'ru' ? 'Продолжить' : 'Continue'}
          </Button>
        </form>
      </div>
    </div>
  );
}
