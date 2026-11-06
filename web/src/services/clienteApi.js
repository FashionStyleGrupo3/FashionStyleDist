import axios from 'axios';
import { emitirCambio, normalizarRuta } from '@/utils/busCambios';
import { idSocket } from '@/services/tiempoReal';

const clienteApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  },
  timeout: 15000
});

const PATRON_DATOS_SENSIBLES =
  /(sqlstate|sql|database|query|exception|pdo|mysql|postgres|sqlite|connection:|host:|port:|trace|stack|constraint|foreign key|duplicate key|table|where|127\.0\.0\.1|localhost|3306|password_hash|secret|api_key|access_token|bearer|\b(SELECT|INSERT|UPDATE|DELETE|ALTER|DROP|FROM|LIMIT)\b)/i;

const MENSAJE_SERVICIO_NO_DISPONIBLE =
  'El servicio no está disponible temporalmente. Por favor, intenta de nuevo en unos momentos.';

export function sanitizarTextoError(texto, fallback = MENSAJE_SERVICIO_NO_DISPONIBLE) {
  if (!texto || typeof texto !== 'string') {
    return fallback;
  }

  const limpio = texto.trim();

  if (!limpio || PATRON_DATOS_SENSIBLES.test(limpio) || limpio.length > 180) {
    return fallback;
  }

  return limpio;
}

export function obtenerMensajeError(
  error,
  fallback = 'No se pudo completar la operación. Verifica los datos e intenta nuevamente.'
) {
  if (!error?.response) {
    return 'No se pudo conectar con el servidor. Verifica tu conexión e intenta nuevamente.';
  }

  const status = error.response.status;
  const raw = error.response.data;

  const validacion = raw?.errors;
  if (validacion && typeof validacion === 'object' && Object.keys(validacion).length > 0) {
    const textoValidacion = Object.values(validacion).flat().join(' ').trim();
    if (textoValidacion && !PATRON_DATOS_SENSIBLES.test(textoValidacion)) {
      return textoValidacion;
    }
  }

  if (status >= 500) {
    return MENSAJE_SERVICIO_NO_DISPONIBLE;
  }

  const mensajeOriginal =
    typeof raw === 'string'
      ? raw
      : raw?.message || raw?.mensaje || raw?.error || '';

  return sanitizarTextoError(mensajeOriginal, fallback);
}

clienteApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('fs_token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = 'Bearer ' + token;
    }

    const socketId = idSocket();
    if (socketId) {
      config.headers = config.headers || {};
      config.headers['X-Socket-ID'] = socketId;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const METODOS_QUE_MODIFICAN = ['post', 'put', 'patch', 'delete'];

clienteApi.interceptors.response.use(
  (response) => {

    const metodo = String(response.config?.method || '').toLowerCase();
    if (METODOS_QUE_MODIFICAN.includes(metodo)) {
      emitirCambio(normalizarRuta(response.config?.url, response.config?.baseURL));
    }
    return response;
  },
  (error) => {
    if (error.response?.data && typeof error.response.data === 'object') {
      const msg = error.response.data.message || error.response.data.mensaje;
      if (
        (typeof msg === 'string' && PATRON_DATOS_SENSIBLES.test(msg)) ||
        error.response.status >= 500
      ) {
        error.response.data.message = MENSAJE_SERVICIO_NO_DISPONIBLE;
        delete error.response.data.exception;
        delete error.response.data.file;
        delete error.response.data.line;
        delete error.response.data.trace;
      }
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('fs_token');
      localStorage.removeItem('fs_user');
      localStorage.removeItem('fs_roles');

      const ruta = window.location.hash.replace(/^#/, '') || '/';
      const esProtegida = ruta.startsWith('/admin') || ruta.startsWith('/perfil');

      if (esProtegida && !ruta.startsWith('/login')) {
        window.location.hash = `#/login?redir=${encodeURIComponent(ruta)}`;
      }
    }
    return Promise.reject(error);
  }
);

export default clienteApi;