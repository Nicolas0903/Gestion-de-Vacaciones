import React, { useEffect, useState } from 'react';

/**
 * Componente que carga una imagen PNG y elimina el fondo negro/near-black
 * convirtiéndolo en transparente mediante canvas.
 * Útil cuando el PNG tiene fondo negro incrustado en los píxeles.
 */
const LogoTransparente = ({ src, alt = 'Logo', className, ...props }) => {
  const [dataUrl, setDataUrl] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();

    img.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const threshold = 45; // Umbral: píxeles con R,G,B < threshold se hacen transparentes

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (r < threshold && g < threshold && b < threshold) {
            data[i + 3] = 0;
          }
        }
        ctx.putImageData(imageData, 0, 0);
        setDataUrl(canvas.toDataURL('image/png'));
      } catch (e) {
        setError(true);
      }
    };

    img.onerror = () => setError(true);
    img.src = src;

    return () => { cancelled = true; };
  }, [src]);

  if (error || !dataUrl) {
    return <img src={src} alt={alt} className={className} {...props} />;
  }
  return <img src={dataUrl} alt={alt} className={className} {...props} />;
};

export default LogoTransparente;
