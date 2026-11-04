import clienteApi from '@/services/clienteApi';

const RUTA = '/favoritos';

const leerIds = (respuesta) => (respuesta?.data?.data?.ids ?? []).map(Number);

export async function listarFavoritosApi() {
  return leerIds(await clienteApi.get(RUTA));
}

export async function agregarFavoritoApi(productoId) {
  return leerIds(await clienteApi.post(RUTA, { producto_id: productoId }));
}

export async function quitarFavoritoApi(productoId) {
  return leerIds(await clienteApi.delete(`${RUTA}/${productoId}`));
}

export async function sincronizarFavoritosApi(ids) {
  return leerIds(await clienteApi.post(`${RUTA}/sincronizar`, { ids }));
}