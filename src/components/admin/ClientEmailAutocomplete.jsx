import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function normalizePhoneDigits(s) {
  return String(s || '').replace(/\D/g, '');
}

function matchesQuery(client, qRaw) {
  const q = qRaw.trim().toLowerCase();
  if (!q) return false;
  const first = (client.first_name || '').trim().toLowerCase();
  const last = (client.last_name || '').trim().toLowerCase();
  const name = `${first} ${last}`.trim();
  const full = (client.full_name || '').trim().toLowerCase();
  const email = (client.email || '').trim().toLowerCase();
  const tg = (client.telegram_username || '').toLowerCase().replace(/^@/, '');
  const tgId = String(client.telegram_id || '');
  const id = String(client.id || '').toLowerCase();
  const publicId = String(client.public_id || '').trim().toLowerCase();
  /** Только цифры из CLI-000123 → «000123», чтобы искать без префикса CLI- */
  const publicDigits = normalizePhoneDigits(client.public_id || '');
  const phoneDigits = normalizePhoneDigits(client.phone);
  const qDigits = normalizePhoneDigits(q);

  const fields = [name, first, last, full, email, tg, tgId, id, publicId, publicDigits, phoneDigits];

  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    return tokens.every((t) => fields.some((f) => String(f).includes(t)));
  }

  const single = tokens[0] || q;
  const tgQuery = single.replace(/^@/, '').toLowerCase();

  /** Номер CLI без слова CLI: ввод «000123», «123» (суффикс), полный «cli-000123» */
  const matchPublicDigits =
    publicDigits &&
    qDigits.length >= 2 &&
    (publicDigits === qDigits || publicDigits.endsWith(qDigits));

  return (
    name.includes(single) ||
    first.includes(single) ||
    last.includes(single) ||
    full.includes(single) ||
    email.includes(single) ||
    tg.includes(tgQuery) ||
    id.includes(single) ||
    (publicId && publicId.includes(single)) ||
    matchPublicDigits ||
    (qDigits.length >= 2 && phoneDigits.includes(qDigits)) ||
    (tgId && tgId.toLowerCase().includes(single.replace(/\D/g, '')))
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
    return clients.filter((c) => matchesQuery(c, value)).slice(0, 24);
  }, [clients, value]);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const showList = open && filtered.length > 0;

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
      {showList && (
        <div className="absolute z-[10060] left-0 right-0 mt-1 glass rounded-xl border border-border/30 overflow-hidden max-h-64 overflow-y-auto shadow-lg">
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
