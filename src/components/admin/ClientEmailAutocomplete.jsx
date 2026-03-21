import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function normalizePhoneDigits(s) {
  return String(s || '').replace(/\D/g, '');
}

function matchesQuery(client, qRaw) {
  const q = qRaw.trim().toLowerCase();
  if (!q) return false;
  const name = `${client.first_name || ''} ${client.last_name || ''}`.trim().toLowerCase();
  const full = (client.full_name || '').toLowerCase();
  const tg = (client.telegram_username || '').toLowerCase().replace(/^@/, '');
  const tgId = String(client.telegram_id || '');
  const phoneDigits = normalizePhoneDigits(client.phone);
  const qDigits = normalizePhoneDigits(q);
  return (
    name.includes(q) ||
    full.includes(q) ||
    tg.includes(q.replace(/^@/, '')) ||
    (qDigits.length >= 3 && phoneDigits.includes(qDigits)) ||
    (tgId && tgId.includes(q.replace(/\D/g, '')))
  );
}

export default function ClientEmailAutocomplete({
  value,
  onChange,
  onClientSelect,
  clients,
  label = 'Клиент *',
  placeholder = 'Телефон, имя, фамилия, ник в Telegram…',
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const filtered = useMemo(() => {
    if (!value || value.trim().length === 0) return [];
    return clients.filter((c) => matchesQuery(c, value)).slice(0, 12);
  }, [clients, value]);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const formatLine = (c) => {
    const name = c.first_name
      ? `${c.first_name} ${c.last_name || ''}`.trim()
      : c.full_name || 'Без имени';
    const phone = c.phone || '';
    const tg = c.telegram_username ? `@${c.telegram_username.replace(/^@/, '')}` : '';
    const parts = [name, phone, tg].filter(Boolean);
    return parts.join(' · ');
  };

  return (
    <div className="col-span-2 relative" ref={ref}>
      <Label className="text-xs">{label}</Label>
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="mt-1 bg-transparent border-border/30"
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 glass rounded-xl border border-border/30 overflow-hidden max-h-64 overflow-y-auto">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              className="w-full flex flex-col items-start px-3 py-2 hover:bg-white/10 transition-colors text-left"
              onMouseDown={(e) => {
                e.preventDefault();
                onClientSelect(c);
                setOpen(false);
              }}
            >
              <span className="text-sm font-light">{formatLine(c)}</span>
              {c.telegram_id && (
                <span className="text-[10px] text-muted-foreground">TG id: {c.telegram_id}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
