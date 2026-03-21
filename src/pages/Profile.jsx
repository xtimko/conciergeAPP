import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/lib/ThemeContext';
import { t } from '@/lib/i18n';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { User } from 'lucide-react';
import { toast } from 'sonner';
import { formatPhoneMaskFromDigits, parseStoredPhone, phoneChangeFromRawInput } from '@/lib/phoneRu';

const fieldSm = 'h-9 text-sm bg-transparent border-border/30';

export default function Profile() {
  const { lang } = useTheme();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const [form, setForm] = useState({});
  const [phoneDisplay, setPhoneDisplay] = useState('+7(');

  const syncPhoneFromUser = useCallback((u) => {
    if (!u?.phone) {
      setPhoneDisplay('+7(');
      return;
    }
    const d = parseStoredPhone(u.phone);
    setPhoneDisplay(d ? formatPhoneMaskFromDigits(d) : '+7(');
  }, []);

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        city: user.city || '',
        address_street: user.address_street || '',
        address_house: user.address_house || '',
        address_apartment: user.address_apartment || '',
        address_floor: user.address_floor || '',
        address_entrance: user.address_entrance || '',
        intercom: user.intercom || '',
        courier_comment: user.courier_comment || '',
      });
      syncPhoneFromUser(user);
    }
  }, [user, syncPhoneFromUser]);

  const handlePhoneChange = (e) => {
    const { formatted, storage } = phoneChangeFromRawInput(e.target.value);
    setPhoneDisplay(formatted === '' ? '+7(' : formatted);
    setForm((f) => ({ ...f, phone: storage }));
  };

  const handleSave = async () => {
    await base44.auth.updateMe(form);
    queryClient.invalidateQueries({ queryKey: ['me'] });
    setEditing(false);
    toast.success(lang === 'ru' ? 'Данные сохранены' : 'Data saved');
  };

  if (!user) return null;

  const phoneReadonly = () => {
    const d = parseStoredPhone(user.phone);
    return d ? formatPhoneMaskFromDigits(d) : '—';
  };

  return (
    <div className="px-4 pt-6 space-y-4">
      <div className="flex justify-center">
        <div className="w-14 h-14 rounded-full glass flex items-center justify-center">
          <User className="w-6 h-6 text-muted-foreground" strokeWidth={1.25} />
        </div>
      </div>

      <GlassCard className="p-4">
        <div className="flex items-center justify-between gap-3 mb-3 pb-3 border-b border-border/30">
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{t('bonusBalance', lang)}</p>
          <p className="text-xl font-light tabular-nums tracking-tight">
            {(user.bonus_balance || 0).toLocaleString('ru-RU')}
          </p>
        </div>

        <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-2.5">{t('personalData', lang)}</p>

        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">{t('firstName', lang)}</Label>
              {editing ? (
                <Input
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  className={`mt-0.5 ${fieldSm}`}
                />
              ) : (
                <p className="text-sm font-light mt-0.5 leading-snug">{user.first_name || '—'}</p>
              )}
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">{t('lastName', lang)}</Label>
              {editing ? (
                <Input
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  className={`mt-0.5 ${fieldSm}`}
                />
              ) : (
                <p className="text-sm font-light mt-0.5 leading-snug">{user.last_name || '—'}</p>
              )}
            </div>
          </div>

          <div>
            <Label className="text-[10px] text-muted-foreground">{t('phone', lang)}</Label>
            {editing ? (
              <Input
                value={phoneDisplay}
                onChange={handlePhoneChange}
                inputMode="tel"
                autoComplete="tel"
                placeholder="+7(999)123-45-67"
                className={`mt-0.5 font-mono text-[13px] ${fieldSm}`}
              />
            ) : (
              <p className="text-sm font-light mt-0.5 font-mono tracking-tight">{phoneReadonly()}</p>
            )}
          </div>

          <div>
            <Label className="text-[10px] text-muted-foreground">{t('city', lang)}</Label>
            {editing ? (
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className={`mt-0.5 ${fieldSm}`}
              />
            ) : (
              <p className="text-sm font-light mt-0.5">{user.city || '—'}</p>
            )}
          </div>

          <div>
            <Label className="text-[10px] text-muted-foreground">{lang === 'ru' ? 'Улица' : 'Street'}</Label>
            {editing ? (
              <Input
                value={form.address_street}
                onChange={(e) => setForm({ ...form, address_street: e.target.value })}
                className={`mt-0.5 ${fieldSm}`}
              />
            ) : (
              <p className="text-sm font-light mt-0.5">{user.address_street || '—'}</p>
            )}
          </div>

            <div className="grid grid-cols-2 gap-x-2 gap-y-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">{t('addressShortHouse', lang)}</Label>
              {editing ? (
                <Input
                  value={form.address_house}
                  onChange={(e) => setForm({ ...form, address_house: e.target.value })}
                  className={`mt-0.5 ${fieldSm}`}
                />
              ) : (
                <p className="text-sm font-light mt-0.5">{user.address_house || '—'}</p>
              )}
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">{t('addressShortApt', lang)}</Label>
              {editing ? (
                <Input
                  value={form.address_apartment}
                  onChange={(e) => setForm({ ...form, address_apartment: e.target.value })}
                  className={`mt-0.5 ${fieldSm}`}
                />
              ) : (
                <p className="text-sm font-light mt-0.5">{user.address_apartment || '—'}</p>
              )}
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">{t('addressShortFloor', lang)}</Label>
              {editing ? (
                <Input
                  value={form.address_floor}
                  onChange={(e) => setForm({ ...form, address_floor: e.target.value })}
                  className={`mt-0.5 ${fieldSm}`}
                />
              ) : (
                <p className="text-sm font-light mt-0.5">{user.address_floor || '—'}</p>
              )}
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">{t('addressShortEntrance', lang)}</Label>
              {editing ? (
                <Input
                  value={form.address_entrance}
                  onChange={(e) => setForm({ ...form, address_entrance: e.target.value })}
                  className={`mt-0.5 ${fieldSm}`}
                />
              ) : (
                <p className="text-sm font-light mt-0.5">{user.address_entrance || '—'}</p>
              )}
            </div>
            <div className="col-span-2">
              <Label className="text-[10px] text-muted-foreground">{t('addressShortIntercom', lang)}</Label>
              {editing ? (
                <Input
                  value={form.intercom}
                  onChange={(e) => setForm({ ...form, intercom: e.target.value })}
                  className={`mt-0.5 ${fieldSm}`}
                />
              ) : (
                <p className="text-sm font-light mt-0.5">{user.intercom || '—'}</p>
              )}
            </div>
          </div>

          <div>
            <Label className="text-[10px] text-muted-foreground">
              {lang === 'ru' ? 'Комментарий курьеру' : 'Courier note'}
            </Label>
            {editing ? (
              <Textarea
                value={form.courier_comment}
                onChange={(e) => setForm({ ...form, courier_comment: e.target.value })}
                className="mt-0.5 min-h-[52px] text-sm bg-transparent border-border/30 resize-none py-2"
              />
            ) : (
              <p className="text-sm font-light mt-0.5 whitespace-pre-wrap">{user.courier_comment || '—'}</p>
            )}
          </div>

          {!editing && user.delivery_address ? (
            <div className="pt-1 border-t border-border/20">
              <Label className="text-[10px] text-muted-foreground">
                {lang === 'ru' ? 'Собранный адрес' : 'Full address'}
              </Label>
              <p className="text-xs font-light mt-0.5 whitespace-pre-wrap text-muted-foreground leading-relaxed">
                {user.delivery_address}
              </p>
            </div>
          ) : null}
        </div>
      </GlassCard>

      <div className="text-center pt-1">
        {editing ? (
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => {
                setEditing(false);
                if (user) {
                  setForm({
                    first_name: user.first_name || '',
                    last_name: user.last_name || '',
                    phone: user.phone || '',
                    city: user.city || '',
                    address_street: user.address_street || '',
                    address_house: user.address_house || '',
                    address_apartment: user.address_apartment || '',
                    address_floor: user.address_floor || '',
                    address_entrance: user.address_entrance || '',
                    intercom: user.intercom || '',
                    courier_comment: user.courier_comment || '',
                  });
                  syncPhoneFromUser(user);
                }
              }}
              className="glass border-border/30"
            >
              {t('cancel', lang)}
            </Button>
            <Button onClick={handleSave} className="bg-foreground text-background hover:bg-foreground/90">
              {t('save', lang)}
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            onClick={() => setEditing(true)}
            className="text-sm font-light underline underline-offset-4 text-muted-foreground hover:text-foreground"
          >
            {t('editData', lang)}
          </Button>
        )}
      </div>
    </div>
  );
}
