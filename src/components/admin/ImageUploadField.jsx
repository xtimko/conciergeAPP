import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import SafeExternalImage from '@/components/SafeExternalImage';

export default function ImageUploadField({ value, onChange }) {
  const [previewBroken, setPreviewBroken] = useState(false);
  useEffect(() => {
    setPreviewBroken(false);
  }, [value]);

  return (
    <div className="col-span-2">
      <label className="text-xs">URL изображения</label>
      <div className="mt-1">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className="flex h-9 w-full rounded-md border border-border/30 bg-transparent px-3 py-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
      {value && (
        <div className="relative mt-2 rounded-xl overflow-hidden w-full h-36 bg-muted/30">
          <SafeExternalImage
            src={value}
            alt="preview"
            className="w-full h-full object-contain"
            onBroken={() => setPreviewBroken(true)}
          />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 glass rounded-full p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          {previewBroken ? (
            <p className="absolute bottom-2 left-2 right-12 text-[10px] text-muted-foreground leading-snug px-1">
              Превью недоступно (хостинг режет встраивание). Для бота и клиента картинка всё равно может
              отображаться — проверьте ссылку или загрузите файл на HTTPS-хостинг без анти-hotlink.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
