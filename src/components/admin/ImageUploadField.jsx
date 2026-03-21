import React, { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { fileToCompressedDataUrl, dataUrlToFile } from '@/lib/resizeImage';

export default function ImageUploadField({ value, onChange }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      let uploadFile = file;
      if (file.type.startsWith('image/')) {
        try {
          const dataUrl = await fileToCompressedDataUrl(file, 1920, 0.82);
          const base = (file.name || 'photo').replace(/\.[^.]+$/, '') || 'photo';
          uploadFile = dataUrlToFile(dataUrl, base);
        } catch {
          /* тяжёлое/экзотическое — пробуем как есть */
        }
      }
      const { file_url } = await base44.integrations.Core.UploadFile({ file: uploadFile });
      onChange(file_url);
    } catch (err) {
      console.error(err);
      toast.error(
        err?.message?.includes('fetch') || err?.message?.includes('Failed')
          ? 'Не удалось загрузить фото (слишком большой файл?)'
          : 'Ошибка загрузки фото',
      );
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="col-span-2">
      <Label className="text-xs">Product Image</Label>
      <div className="mt-1 flex gap-2 items-start">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste image URL..."
          className="bg-transparent border-border/30 flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="glass border-border/30 shrink-0"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
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