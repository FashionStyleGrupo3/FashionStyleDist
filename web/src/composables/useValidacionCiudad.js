
import { computed, ref, watch } from 'vue';
import { buscarCiudades, ciudadExiste, ciudadTieneFormatoValido } from '@/utils/Validarciudad';

export function useValidacionCiudad(obtenerCiudad, { retardo = 350 } = {}) {
  const sugerencias = ref([]);
  const existe = ref(null); // true | false | null (sin comprobar o API no disponible)
  let temporizador = null;

  const valor = computed(() => String(obtenerCiudad() ?? ''));
  const formatoInvalido = computed(() => valor.value.trim().length > 0 && !ciudadTieneFormatoValido(valor.value));
  const noEncontrada = computed(() => existe.value === false);

  watch(valor, (texto) => {
    clearTimeout(temporizador);
    existe.value = null;

    if (!ciudadTieneFormatoValido(texto)) {
      sugerencias.value = [];
      return;
    }

    temporizador = setTimeout(async () => {
      sugerencias.value = await buscarCiudades(texto.trim());
      existe.value = await ciudadExiste(texto);
    }, retardo);
  });

  async function comprobar() {
    if (!ciudadTieneFormatoValido(valor.value)) return false;
    const resultado = await ciudadExiste(valor.value);
    existe.value = resultado;
    return resultado !== false;
  }

  return { sugerencias, existe, formatoInvalido, noEncontrada, comprobar };
}
