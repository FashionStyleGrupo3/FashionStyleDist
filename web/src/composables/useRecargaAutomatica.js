import { onMounted, onBeforeUnmount, onActivated, onDeactivated, getCurrentInstance } from 'vue';
import { suscribirCambios } from '@/utils/busCambios';

export function useRecargaAutomatica(cargar, opciones = {}) {
  const {
    recursos = [],
    alVolverPestana = true,
    intervaloMinimoVisibilidad = 5000,
    retardo = 300,
  } = opciones;

  let activo = true;
  let pendiente = false;
  let primeraActivacion = true;
  let temporizador = null;
  let ultimaRecarga = Date.now();
  let desuscribir = null;

  const leInteresa = (cambio) => {
    if (!recursos.length) return true;
    return recursos.some((r) => cambio?.recurso === r || cambio?.ruta?.startsWith(`${r}/`));
  };

  const ejecutar = async () => {
    temporizador = null;
    pendiente = false;
    ultimaRecarga = Date.now();
    try {
      await cargar();
    } catch (error) {
      console.warn('[useRecargaAutomatica] No se pudo recargar:', error);
    }
  };

  const programar = () => {
    if (!activo || document.visibilityState === 'hidden') {
      pendiente = true;
      return;
    }
    clearTimeout(temporizador);
    temporizador = setTimeout(ejecutar, retardo);
  };

  const alCambio = (cambio) => {
    if (leInteresa(cambio)) programar();
  };

  const alVisibilidad = () => {
    if (document.visibilityState !== 'visible' || !activo) return;
    if (pendiente || (alVolverPestana && Date.now() - ultimaRecarga > intervaloMinimoVisibilidad)) {
      programar();
    }
  };

  if (getCurrentInstance()) {
    onMounted(() => {
      desuscribir = suscribirCambios(alCambio);
      document.addEventListener('visibilitychange', alVisibilidad);
      window.addEventListener('focus', alVisibilidad);
    });

    onBeforeUnmount(() => {
      desuscribir?.();
      clearTimeout(temporizador);
      document.removeEventListener('visibilitychange', alVisibilidad);
      window.removeEventListener('focus', alVisibilidad);
    });

    onActivated(() => {
      activo = true;
      if (primeraActivacion) {
        primeraActivacion = false;
        return;
      }
      programar();
    });

    onDeactivated(() => {
      activo = false;
    });
  }

  return { recargarAhora: ejecutar };
}