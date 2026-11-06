
import {
  computed,
  ref,
  unref,
  watch,
  getCurrentInstance,
  onMounted,
  onBeforeUnmount
} from 'vue';

import {
  obtenerPromocionesVigentes,
  calcularPrecioPromocional,
  invalidarCachePromociones
} from '@/services/promocionServicio';

import { suscribirCambios } from '@/utils/busCambios';

const promocionesVigentes = ref([]);
const promocionesListas = ref(false);

let cargado = false;
let peticionEnCurso = null;

const INTERVALO_REFRESCO_MS = 30_000;

let consumidores = 0;
let intervaloRefresco = null;
let temporizadorPromos = null;

// Carga centralizada de promociones
export async function cargarPromociones(forzar = false) {
  if (peticionEnCurso) {
    if (!forzar) return peticionEnCurso;
    await peticionEnCurso;
  }

  if (cargado && !forzar) return;

  peticionEnCurso = (async () => {
    try {
      const resultado = await obtenerPromocionesVigentes({ forzar });

      promocionesVigentes.value = resultado;
      cargado = true;
      promocionesListas.value = true;

    } catch (e) {
      console.warn('No se pudieron cargar las promociones:', e);

      // No borrar promociones anteriores ante errores de red.
      if (!cargado) {
        promocionesVigentes.value = [];
      }
    } finally {
      peticionEnCurso = null;
    }
  })();

  return peticionEnCurso;
}

export async function recargarPromociones() {
  invalidarCachePromociones();
  return cargarPromociones(true);
}

export function productoTienePromocion(producto) {
  if (!producto) return false;
  const p = unref(producto);
  const variantes = Array.isArray(p.variantes) ? p.variantes : [];
  const precios = variantes
    .map((v) => Number(v.precio_venta))
    .filter((n) => Number.isFinite(n) && n > 0);
  const base = precios.length
    ? Math.min(...precios)
    : Number(p.precio_venta ?? p.precio_base ?? 0);
  if (base <= 0) return false;

  const precioBack = p?.precio_final ?? p?.precio_con_descuento;
  if (precioBack != null && Number(precioBack) < base) return true;

  const calc = calcularPrecioPromocional(p, base, promocionesVigentes.value);
  return calc.ahorro > 0;
}

// Escucha cambios de promociones provenientes del administrador.
suscribirCambios((cambio) => {
  if (cambio?.recurso !== 'promociones') return;

  clearTimeout(temporizadorPromos);

  temporizadorPromos = setTimeout(() => {
    recargarPromociones();
  }, 300);
});

// Refresco automático
function refrescarSiVisible() {
  if (typeof document !== 'undefined' &&
      document.visibilityState === 'visible') {
    cargarPromociones(true);
  }
}

function iniciarRefresco() {
  if (intervaloRefresco || typeof document === 'undefined') return;

  intervaloRefresco = setInterval(
    refrescarSiVisible,
    INTERVALO_REFRESCO_MS
  );

  document.addEventListener('visibilitychange', refrescarSiVisible);
  window.addEventListener('focus', refrescarSiVisible);
}

function detenerRefresco() {
  clearInterval(intervaloRefresco);
  intervaloRefresco = null;

  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', refrescarSiVisible);
    window.removeEventListener('focus', refrescarSiVisible);
  }
}

function registrarConsumidor() {
  if (!getCurrentInstance()) return;

  onMounted(() => {
    consumidores++;
    iniciarRefresco();
  });

  onBeforeUnmount(() => {
    consumidores = Math.max(0, consumidores - 1);

    if (consumidores === 0) {
      detenerRefresco();
    }
  });
}

// Composable para calcular el precio de un producto.
export function usePromociones(producto, precioBase) {
  cargarPromociones();
  registrarConsumidor();

  const infoPrecio = computed(() => {
    const p = unref(producto);
    const base = Number(unref(precioBase)) || 0;

    // Respetar el precio calculado por el backend.
    const precioBack =
      p?.precio_final ?? p?.precio_con_descuento;

    if (
      precioBack != null &&
      Number.isFinite(Number(precioBack)) &&
      Number(precioBack) < base
    ) {
      const final = Number(precioBack);

      return {
        precioOriginal: base,
        precioFinal: final,
        ahorro: base - final,
        porcentaje: base > 0
          ? Math.round(((base - final) / base) * 100)
          : 0,
        promocion: p?.promocion ?? { nombre: 'Promoción' }
      };
    }

    return calcularPrecioPromocional(
      p,
      base,
      promocionesVigentes.value
    );
  });

  const tieneDescuento = computed(
    () => infoPrecio.value.ahorro > 0
  );

  return {
    infoPrecio,
    tieneDescuento,
    recargarPromociones
  };
}

// Sincronizar automáticamente los precios del carrito.
export function useSincronizarPreciosCarrito(carritoStore) {
  cargarPromociones();
  registrarConsumidor();

  function sincronizar() {
    // Evitar eliminar descuentos si todavía no hubo una carga exitosa.
    if (!promocionesListas.value) return;

    const cambios = [];

    for (const item of carritoStore.items) {
      const base =
        Number(item.precioOriginal) ||
        Number(item.precio) ||
        0;

      if (base <= 0) continue;

      const { precioFinal } = calcularPrecioPromocional(
        { id_producto: item.productoId },
        base,
        promocionesVigentes.value
      );

      cambios.push({
        varianteId: item.varianteId,
        precio: precioFinal,
        precioOriginal: base
      });
    }

    if (cambios.length) {
      carritoStore.actualizarPrecios(cambios);
    }
  }

  watch(
    () => [
      promocionesListas.value,
      promocionesVigentes.value,
      carritoStore.items.map((i) =>
        `${i.varianteId}:${i.productoId}:${i.precioOriginal}:${i.precio}`
      ).join('|')
    ],
    sincronizar,
    { immediate: true }
  );
}
