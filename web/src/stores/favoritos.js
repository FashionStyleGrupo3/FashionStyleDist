import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useAutenticacionStore } from '@/stores/autenticacion';
import {
  agregarFavoritoApi,
  quitarFavoritoApi,
  sincronizarFavoritosApi
} from '@/services/favoritosServicio';

export const useFavoritosStore = defineStore('favoritos', () => {
  const ids = ref([]);
  const soloFavoritos = ref(false);

  const total = computed(() => ids.value.length);

  function esFavorito(id) {
    return ids.value.includes(Number(id));
  }

  async function alternar(id) {
    const num = Number(id);
    const eraFavorito = esFavorito(num);
    const anteriores = [...ids.value];

    // La interfaz responde al instante
    ids.value = eraFavorito ? ids.value.filter((x) => x !== num) : [...ids.value, num];

    const auth = useAutenticacionStore();
    if (!auth.estaAutenticado) return;

    try {
      if (eraFavorito) await quitarFavoritoApi(num);
      else await agregarFavoritoApi(num);
    } catch (error) {
      ids.value = anteriores; // si el servidor falla, se revierte
      console.warn('No se pudo actualizar el favorito:', error);
    }
  }

  // Une los favoritos de este navegador con los de la cuenta
  async function cargarDesdeServidor() {
    const auth = useAutenticacionStore();
    if (!auth.estaAutenticado) return;
    try {
      ids.value = await sincronizarFavoritosApi(ids.value);
    } catch (error) {
      console.warn('No se pudieron cargar los favoritos:', error);
    }
  }

  function limpiar() {
    ids.value = [];
    soloFavoritos.value = false;
  }

  return { ids, soloFavoritos, total, esFavorito, alternar, cargarDesdeServidor, limpiar };
}, {
  persist: { paths: ['ids'] }
});