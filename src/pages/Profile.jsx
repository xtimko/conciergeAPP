import React, { useState } from 'react';
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

export default function Profile() {
  const { lang } = useTheme();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const [form, setForm] = useState({});

  React.useEffect(() => {
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
        intercom: user.intercom || '',
        courier_comment: user.courier_comment || '',
        delivery_address: user.delivery_address || '',
      });
    }
  }, [user]);

  const handleSave = async () => {
    await base44.auth.updateMe(form);
    queryClient.invalidateQueries({ queryKey: ['me'] });
    setEditing(false);
    toast.success(lang === 'ru' ? 'Данные сохранены' : 'Data saved');
  };

  if (!user) return null;

  const fields = [
    { key: 'first_name', label: t('firstName', lang), type: 'input' },
    { key: 'last_name', label: t('lastName', lang), type: 'input' },
    { key: 'phone', label: t('phone', lang), type: 'input' },
    { key: 'city', label: t('city', lang), type: 'input' },
    {
      key: 'address_street',
      label: lang === 'ru' ? 'Улица' : 'Street',
      type: 'input',
    },
    {
      key: 'address_house',
      label: lang === 'ru' ? 'Дом' : 'Building',
      type: 'input',
    },
    {
      key: 'address_apartment',
      label: lang === 'ru' ? 'Квартира' : 'Apartment',
      type: 'input',
    },
    {
      key: 'address_floor',
      label: lang === 'ru' ? 'Этаж' : 'Floor',
      type: 'input',
    },
    {
      key: 'intercom',
      label: lang === 'ru' ? 'Домофон' : 'Intercom',
      type: 'input',
    },
    {
      key: 'courier_comment',
      label: lang === 'ru' ? 'Комментарий курьеру' : 'Courier note',
      type: 'textarea',
    },
    {
      key: 'delivery_address',
      label: lang === 'ru' ? 'Адрес одной строкой (дополнительно)' : 'Full address (optional)',
      type: 'textarea',
    },
  ];

  return (
    <div className="px-4 pt-6 space-y-5">
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full glass flex items-center justify-center">
          <User className="w-7 h-7 text-muted-foreground" />
        </div>
      </div>

      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
            {t('bonusBalance', lang)}
          </p>
          <p className="text-2xl font-light">{(user.bonus_balance || 0).toLocaleString('ru-RU')}</p>
        </div>

        <div className="space-y-4">
          {fields.map((field) => (
            <div key={field.key}>
              <Label className="text-xs text-muted-foreground">{field.label}</Label>
              {editing ? (
                field.type === 'textarea' ? (
                  <Textarea
                    value={form[field.key] || ''}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                    className="mt-1 min-h-[72px] bg-transparent border-border/30 resize-none"
                  />
                ) : (
                  <Input
                    value={form[field.key] || ''}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                    className="mt-1 bg-transparent border-border/30"
                  />
                )
              ) : (
                <p className="text-sm font-light mt-1">{user[field.key] || '—'}</p>
              )}
            </div>
          ))}
        </div>
      </GlassCard>

      <div className="text-center">
        {editing ? (
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => setEditing(false)} className="glass border-border/30">
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
