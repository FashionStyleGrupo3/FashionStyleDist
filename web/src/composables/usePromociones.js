import { computed, ref, unref } from 'vue';
import {
  obtenerPromocionesVigentes,
  calcularPrecioPromocional,
  alInvalidarPromociones
} from '@/services/promocionServicio';

const promocionesVigentes = ref([]);
let cargado = false;

export async function recargarPromociones() {
  cargado = false;
  return cargarPromociones(true);
}

// Suscribirse a las invalidaciones generadas por crear/editar/eliminar en admin
alInvalidarPromociones(() => {
  recargarPromociones();
});

export async function cargarPromociones(forzar = false) {
  if (cargado && !forzar) return;
  try {
    promocionesVigentes.value = await obtenerPromocionesVigentes({ forzar });
    cargado = true;
  } catch (e) {
    // Si falla, la tienda sigue funcionando sin descuentos
    console.warn('No se pudieron cargar las promociones:', e);
    promocionesVigentes.value = [];
  }
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

export function usePromociones(producto, precioBase) {
  cargarPromociones();

  const infoPrecio = computed(() => {
    const p = unref(producto);
    const base = Number(unref(precioBase)) || 0;

    // Si el backend ya envía el precio con descuento, se respeta (fuente de verdad)
    const precioBack = p?.precio_final ?? p?.precio_con_descuento;
    if (precioBack != null && Number(precioBack) < base) {
      const final = Number(precioBack);
      return {
        precioOriginal: base,
        precioFinal: final,
        ahorro: base - final,
        porcentaje: base > 0 ? Math.round(((base - final) / base) * 100) : 0,
        promocion: p?.promocion ?? { nombre: 'Promocion' }
      };
    }

    return calcularPrecioPromocional(p, base, promocionesVigentes.value);
  });

  const tieneDescuento = computed(() => infoPrecio.value.ahorro > 0);

  return {
    infoPrecio,
    tieneDescuento,
    promocionesVigentes,
    recargarPromociones
  };
}

export function useSincronizarPreciosCarrito(carritoStore) {
  cargarPromociones();
  alInvalidarPromociones(() => {
    recargarPromociones();
  });
}
