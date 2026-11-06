// Composable para resolver rutas de almacenamiento e imágenes
const IMAGEN_RESPALDO = '/img/prenda-respaldo.svg';

export function normalizarDominioAdsocidm(urlStr) {
  if (typeof urlStr !== 'string') return urlStr;
  // En Adsocidm LiteSpeed, /storage sin /public/ devuelve 404
  if (urlStr.includes('fashionstyle.api.adsocidm.com/storage') && !urlStr.includes('fashionstyle.api.adsocidm.com/public/storage')) {
    return urlStr.replace('fashionstyle.api.adsocidm.com/storage', 'fashionstyle.api.adsocidm.com/public/storage');
  }
  return urlStr;
}

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
      return normalizarDominioAdsocidm(limpia);
    } catch {
      return normalizarDominioAdsocidm(limpia);
    }
  }

  const rutaStorage = limpia.replace(/^\/?(public\/)?storage\//, '').replace(/^\/+/, '');
  const baseRaw = String(baseUrl || '/storage').replace(/\/+$/, '');
  const base = normalizarDominioAdsocidm(baseRaw);
  return `${base}/${rutaStorage}`;
}

export function useImagenStorage() {
  const resolverUrlImagen = (ruta) => {
    const rawBaseUrl = import.meta.env.DEV
      ? '/storage'
      : (import.meta.env.VITE_STORAGE_BASE_URL || 'https://fashionstyle.api.adsocidm.com/public/storage');
    const baseUrl = normalizarDominioAdsocidm(rawBaseUrl);
    return resolverUrlAlmacenamiento(ruta, {
      development: import.meta.env.DEV,
      baseUrl
    });
  };

  return { resolverUrlImagen, IMAGEN_RESPALDO };
}
