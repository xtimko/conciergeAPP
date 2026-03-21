import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ClientEmailAutocomplete({ value, onChange, onClientSelect, clients }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const filtered = value.length > 0
    ? clients.filter(c => {
        const q = value.toLowerCase();
        return (
          c.email?.toLowerCase().includes(q) ||
          c.first_name?.toLowerCase().includes(q) ||
          c.last_name?.toLowerCase().includes(q) ||
          c.full_name?.toLowerCase().includes(q)
        );
      }).slice(0, 8)
    : [];

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="col-span-2 relative" ref={ref}>
      <Label className="text-xs">Client Email *</Label>
      <Input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search by email or name..."
        className="mt-1 bg-transparent border-border/30"
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 glass rounded-xl border border-border/30 overflow-hidden">
          {filtered.map(c => (
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
              <span className="text-sm font-light">{c.email}</span>
              {(c.first_name || c.full_name) && (
                <span className="text-xs text-muted-foreground">
                  {c.first_name ? `${c.first_name} ${c.last_name || ''}`.trim() : c.full_name}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}