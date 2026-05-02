import React from 'react';
import { X } from 'lucide-react';

export default function ImageUploadField({ value, onChange }) {
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
