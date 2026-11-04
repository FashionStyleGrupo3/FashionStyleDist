// -> Bus global de cambios de datos
// Cada vez que la app guarda, edita o elimina algo en la API (POST/PUT/PATCH/DELETE),
// clienteApi llama a emitirCambio(). Ese aviso llega:
//   1) a los componentes de ESTA pestaña (ej. crear materia prima -> se actualiza Fórmulas)
//   2) a las OTRAS pestañas abiertas del navegador (ej. panel admin -> tienda del cliente)
// Los componentes se suscriben con el composable useRecargaAutomatica.

const NOMBRE_CANAL = 'fashionstyle-cambios';
const CLAVE_STORAGE = 'fs_ultimo_cambio';

const RUTAS_IGNORADAS = [
  'login',
  'logout',
  'register',
  'auth',
  'forgot-password',
  'reset-password',
  'verify-email',
  'resend-verification',
];

const suscriptores = new Set();
let canal = null;

try {
  if (typeof BroadcastChannel !== 'undefined') {
    canal = new BroadcastChannel(NOMBRE_CANAL);
    canal.onmessage = (evento) => notificarLocal(evento.data);
  }
} catch {
  canal = null;
}

// Respaldo para navegadores sin BroadcastChannel
if (!canal && typeof window !== 'undefined') {
  window.addEventListener('storage', (evento) => {
    if (evento.key !== CLAVE_STORAGE || !evento.newValue) return;
    try {
      notificarLocal(JSON.parse(evento.newValue));
    } catch {
      /* valor corrupto: se ignora */
    }
  });
}

function notificarLocal(cambio) {
  suscriptores.forEach((fn) => {
    try {
      fn(cambio);
    } catch (error) {
      console.error('[busCambios] Error en un suscriptor:', error);
    }
  });
}


export function normalizarRuta(url = '', baseURL = '') {
  let ruta = String(url);
  if (baseURL && ruta.startsWith(baseURL)) ruta = ruta.slice(baseURL.length);
  ruta = ruta.replace(/^https?:\/\/[^/]+/i, '');
  ruta = ruta.split('?')[0].split('#')[0];
  ruta = ruta.replace(/^\/?api\//, '/');
  return ruta.replace(/^\/+|\/+$/g, '');
}

export function emitirCambio(ruta) {
  const limpia = normalizarRuta(ruta);
  if (!limpia) return;
  const recurso = limpia.split('/')[0];
  if (RUTAS_IGNORADAS.includes(recurso)) return;

  const cambio = { recurso, ruta: limpia, fecha: Date.now() };

  notificarLocal(cambio);

  if (canal) {
    try {
      canal.postMessage(cambio);
    } catch {
      
    }
  } else {
    try {
      localStorage.setItem(CLAVE_STORAGE, JSON.stringify(cambio));
    } catch {
    
    }
  }
}


export function recibirCambioRemoto(cambio) {
  if (!cambio?.recurso || RUTAS_IGNORADAS.includes(cambio.recurso)) return;
  notificarLocal(cambio);
}

export function suscribirCambios(fn) {
  suscriptores.add(fn);
  return () => suscriptores.delete(fn);
}