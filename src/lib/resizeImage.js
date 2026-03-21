/**
 * Сжимает изображение до data URL (JPEG), чтобы большие фото с телефона не ломали JSON-запрос.
 * @param {File} file
 * @param {number} maxEdge макс. сторона в px
 * @param {number} quality 0..1
 * @returns {Promise<string>} data URL
 */
export async function fileToCompressedDataUrl(file, maxEdge = 1920, quality = 0.82) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    URL.revokeObjectURL(url);

    let { naturalWidth: w, naturalHeight: h } = img;
    if (!w || !h) throw new Error('Invalid image');

    const scale = Math.min(1, maxEdge / Math.max(w, h));
    const tw = Math.max(1, Math.round(w * scale));
    const th = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement('canvas');
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No canvas');
    ctx.drawImage(img, 0, 0, tw, th);

    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (!dataUrl || dataUrl.length < 32) throw new Error('Encode failed');
    return dataUrl;
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Load failed'));
    img.src = src;
  });
}

/** Для UploadFile: маленький File из data URL после сжатия. */
export function dataUrlToFile(dataUrl, baseName = 'photo') {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  const u8 = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
  const name = baseName.toLowerCase().endsWith('.jpg') || baseName.toLowerCase().endsWith('.jpeg')
    ? baseName
    : `${baseName}.jpg`;
  return new File([u8], name, { type: mime });
}
