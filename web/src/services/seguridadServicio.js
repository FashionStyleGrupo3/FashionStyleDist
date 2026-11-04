
import clienteApi from '@/services/clienteApi';

function cuerpo(respuesta) {
  return respuesta.data?.data ?? respuesta.data;
}

function lista(respuesta) {
  const datos = cuerpo(respuesta);

  if (Array.isArray(datos)) return datos;
  if (Array.isArray(datos?.data)) return datos.data;

  return [];
}

export async function obtenerClientes() {
  return lista(await clienteApi.get('/clientes'));
}

export async function actualizarCliente(id, datos) {
  const respuesta = await clienteApi.put(`/clientes/${id}`, datos);
  return cuerpo(respuesta);
}

export async function obtenerUsuarios() {
  return lista(await clienteApi.get('/usuarios'));
}

export async function crearUsuario(datos) {
  const respuesta = await clienteApi.post('/usuarios', datos);
  return cuerpo(respuesta);
}

export async function actualizarUsuario(id, datos) {
  const respuesta = await clienteApi.put(`/usuarios/${id}`, datos);
  return cuerpo(respuesta);
}

export async function asignarRolUsuario(id, rol) {
  const respuesta = await clienteApi.post(
    `/usuarios/${id}/asignar-rol`,
    { rol }
  );

  return cuerpo(respuesta);
}

export async function obtenerAuditorias(filtros = {}) {
  const respuesta = await clienteApi.get('/auditorias', {
    params: filtros,
  });

  const datos = cuerpo(respuesta);
  const paginado =
    datos?.data && !Array.isArray(datos.data)
      ? datos.data
      : datos;

  return {
    items: Array.isArray(paginado)
      ? paginado
      : Array.isArray(paginado?.data)
        ? paginado.data
        : [],
    currentPage: paginado?.current_page || 1,
    lastPage: paginado?.last_page || 1,
    total: paginado?.total || 0,
  };
}

export default {
  obtenerClientes,
  actualizarCliente,
  obtenerUsuarios,
  actualizarUsuario,
  asignarRolUsuario,
  obtenerAuditorias,
  crearUsuario,
};
