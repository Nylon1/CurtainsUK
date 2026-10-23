const maximumAnalysisBytes = 1_800_000;

/** Keep the original phone photograph on the device; send only a small colour reference. */
export async function prepareFiPhonePhoto(file: Blob): Promise<Blob> {
  const bitmap = typeof createImageBitmap === 'function' ? await createImageBitmap(file) : await (async () => {
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      return image;
    } finally {
      URL.revokeObjectURL(url);
    }
  })();
  try {
    for (const longestSide of [1600, 1280, 1024, 800]) {
      const width = 'naturalWidth' in bitmap ? bitmap.naturalWidth : bitmap.width;
      const height = 'naturalHeight' in bitmap ? bitmap.naturalHeight : bitmap.height;
      const scale = Math.min(1, longestSide / Math.max(width, height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw Error('PHOTO_PREPARATION_FAILED');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.84, 0.72, 0.6]) {
        const output = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
        if (output?.type === 'image/jpeg' && output.size <= maximumAnalysisBytes) return output;
      }
    }
    throw Error('PHOTO_PREPARATION_FAILED');
  } finally {
    if ('close' in bitmap) bitmap.close();
  }
}
