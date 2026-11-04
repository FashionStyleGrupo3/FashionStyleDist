// Composable para resolver rutas de almacenamiento e imágenes
const IMAGEN_RESPALDO = '/img/prenda-respaldo.svg';

export function resolverUrlAlmacenamiento(valor, { development = false, baseUrl = '/storage' } = {}) {
  const ruta = typeof valor === 'object' && valor !== null
    ? (valor.url || valor.ruta || valor.imagen)
    : valor;

  if (typeof ruta !== 'string' || !ruta.trim()) return IMAGEN_RESPALDO;

  const limpia = ruta.trim();

  if (/^(data:|blob:)/i.test(limpia)) {
    return limpia;
  }

  if (/^https?:\/\//i.test(limpia)) {
    try {
      const url = new URL(limpia);
      const esServidorLocal = ['localhost', '127.0.0.1'].includes(url.hostname);
      if (development && esServidorLocal && url.pathname.startsWith('/storage/')) {
        return `${url.pathname}${url.search}${url.hash}`;
      }
      return limpia;
    } catch {
      return limpia;
    }
  }

  const rutaStorage = limpia.replace(/^\/?storage\//, '').replace(/^\/+/, '');
  const base = String(baseUrl || '/storage').replace(/\/+$/, '');
  return `${base}/${rutaStorage}`;
}

export function useImagenStorage() {
  const resolverUrlImagen = (ruta) => {
    const baseUrl = import.meta.env.DEV
      ? '/storage'
      : (import.meta.env.VITE_STORAGE_BASE_URL || 'https://fashionstyle.api.adsocidm.com/storage');
    return resolverUrlAlmacenamiento(ruta, {
      development: import.meta.env.DEV,
      baseUrl
    });
  };

  return { resolverUrlImagen, IMAGEN_RESPALDO };
}
