// -> Servicio de clasificacion de categorias y catalogos
import clienteApi from '@/services/clienteApi';

export async function obtenerCategorias() {
  try {
    const respuesta = await clienteApi.get('/categorias');
    return respuesta.data?.data ?? respuesta.data ?? [];
  } catch (error) {
    console.warn('Error al obtener categorías:', error);
    return [];
  }
}

export async function obtenerCatalogos() {
  try {
    const respuesta = await clienteApi.get('/catalogos');
    return respuesta.data?.data ?? respuesta.data ?? [];
  } catch (error) {
    console.warn('Error al obtener catálogos:', error);
    return [];
  }
}

export default {
  obtenerCategorias,
  obtenerCatalogos
};
