import React, { useState } from 'react';
import { ClipboardPaste, X } from 'lucide-react';
import { toast } from 'sonner';

export default function ImageUploadField({ value, onChange }) {
  const [pasting, setPasting] = useState(false);

  const handlePasteUrl = async () => {
    if (!navigator?.clipboard?.readText) {
      toast.error('Буфер обмена недоступен в этом браузере');
      return;
    }
    setPasting(true);
    try {
      const text = (await navigator.clipboard.readText())?.trim();
      if (!text) {
        toast.error('В буфере пусто');
        return;
      }
      onChange(text);
    } catch (err) {
      toast.error('Не удалось вставить из буфера');
    } finally {
      setPasting(false);
    }
  };

  return (
    <div className="col-span-2">
      <label className="text-xs">URL изображения</label>
      <div className="mt-1 flex gap-2 items-start">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className="flex h-9 w-full rounded-md border border-border/30 bg-transparent px-3 py-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <button
          type="button"
          className="inline-flex h-8 shrink-0 items-center rounded-md border border-border/30 px-3 text-xs glass disabled:pointer-events-none disabled:opacity-50"
          onClick={handlePasteUrl}
          disabled={pasting}
        >
          <ClipboardPaste className="w-4 h-4 mr-1.5" />
          Вставить
        </button>
      </div>
      {value && (
        <div className="relative mt-2 rounded-xl overflow-hidden w-full h-36 bg-muted/30">
          <img src={value} alt="preview" className="w-full h-full object-contain" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 glass rounded-full p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}