import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { recibirCambioRemoto } from '@/utils/busCambios';

let echo = null;

export function iniciarTiempoReal() {
  const key = import.meta.env.VITE_REVERB_APP_KEY;
  if (!key) {
    console.info('[tiempoReal] Sin VITE_REVERB_APP_KEY: se usa solo la recarga al volver a la pestaña.');
    return;
  }
  if (echo) return;

  window.Pusher = Pusher;

  const esquema = import.meta.env.VITE_REVERB_SCHEME ?? 'http';
  const puerto = Number(import.meta.env.VITE_REVERB_PORT ?? (esquema === 'https' ? 443 : 8080));

  try {
    echo = new Echo({
      broadcaster: 'reverb',
      key,
      wsHost: import.meta.env.VITE_REVERB_HOST ?? window.location.hostname,
      wsPort: puerto,
      wssPort: puerto,
      forceTLS: esquema === 'https',
      enabledTransports: ['ws', 'wss'],
    });

    echo.channel('cambios').listen('.datos.actualizados', (evento) => {
      recibirCambioRemoto({
        recurso: evento?.recurso,
        ruta: evento?.ruta ?? evento?.recurso,
        fecha: Date.now(),
      });
    });
  } catch (error) {
    console.warn('[tiempoReal] No se pudo conectar a Reverb:', error);
    echo = null;
  }
}

export function idSocket() {
  try {
    return echo?.socketId() ?? null;
  } catch {
    return null;
  }
}