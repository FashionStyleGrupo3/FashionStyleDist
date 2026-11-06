import { computed, ref, unref } from 'vue';
import { obtenerPromocionesVigentes, calcularPrecioPromocional } from '@/services/promocionServicio';
import { suscribirCambios } from '@/utils/busCambios';

const promocionesVigentes = ref([]);
let cargado = false;

async function cargarPromociones(forzar = false) {
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

let temporizadorPromos = null;
suscribirCambios((cambio) => {
  if (cambio?.recurso !== 'promociones') return;
  clearTimeout(temporizadorPromos);
  temporizadorPromos = setTimeout(() => {
    invalidarCachePromociones();
    cargarPromociones(true);
  }, 300);
});

/*Esto fue un dolor de huevos XD */
 
/**
 * @param producto   
 * @param precioBase 
 */



export function usePromociones(producto, precioBase) {
  cargarPromociones();

  const infoPrecio = computed(() => {
    const p = unref(producto);
    const base = Number(unref(precioBase)) || 0;

    // Si el backend ya envá el precio con descuento, se respeta (fuente de verdad)
    const precioBack = p?.precio_final ?? p?.precio_con_descuento;
    if (precioBack != null && Number(precioBack) < base) {
      const final = Number(precioBack);
      return {
        precioOriginal: base,
        precioFinal: final,
        ahorro: base - final,
        porcentaje: base > 0 ? Math.round(((base - final) / base) * 100) : 0,
        promocion: p?.promocion ?? { nombre: 'Promoción' }
      };
    }

    return calcularPrecioPromocional(p, base, promocionesVigentes.value);
  });

  const tieneDescuento = computed(() => infoPrecio.value.ahorro > 0);

  return { infoPrecio, tieneDescuento, recargarPromociones: () => cargarPromociones(true) };
}