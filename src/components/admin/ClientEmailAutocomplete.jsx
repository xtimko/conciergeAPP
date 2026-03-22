import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { filterClientsForOrderAutocomplete } from '@/lib/clientSearch';

export default function ClientEmailAutocomplete({
  value,
  onChange,
  onClientSelect,
  clients,
  label = 'Клиент *',
  placeholder = 'Телефон, имя, фамилия, @telegram, номер CLI…',
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  /** Пустой запрос — показываем всех (с разумным потолком для DOM); с вводом — только совпадения */
  const filtered = useMemo(() => {
    const list = filterClientsForOrderAutocomplete(clients || [], value);
    const max = String(value || '').trim() ? 80 : 400;
    return list.slice(0, max);
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
        <div className="absolute z-[10060] left-0 right-0 mt-1 glass rounded-xl border border-border/30 overflow-hidden max-h-[min(50vh,20rem)] overflow-y-auto shadow-lg">
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
