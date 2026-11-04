import clienteApi from '@/services/clienteApi';


const extraer = (respuesta) => respuesta.data?.data ?? respuesta.data;

const lista = (respuesta) => {
  const datos = extraer(respuesta);
  return Array.isArray(datos) ? datos : (datos?.data ?? []);
};
 
function crearCrud(ruta) {
  return {
    listar: async (params = {}) => lista(await clienteApi.get(ruta, { params })),
    crear: async (payload) => extraer(await clienteApi.post(ruta, payload)),
    actualizar: async (id, payload) => extraer(await clienteApi.put(`${ruta}/${id}`, payload)),
    eliminar: async (id) => extraer(await clienteApi.delete(`${ruta}/${id}`)),
  };
}
 
export const materiasPrimasApi = crearCrud('/materias-primas');
export const unidadesMedidaApi = crearCrud('/unidades-medida');
export const proveedoresApi = crearCrud('/proveedores');
export const formulasProduccionApi = crearCrud('/formulas-produccion');
 
export const ordenesProduccionApi = {
  listar: async (params = {}) => lista(await clienteApi.get('/ordenes-produccion', { params })),
  crear: async (payload) => extraer(await clienteApi.post('/ordenes-produccion', payload)),
  actualizar: async (id, payload) => extraer(await clienteApi.put(`/ordenes-produccion/${id}`, payload)),
  completar: async (id, payload = {}) =>
    extraer(await clienteApi.post(`/ordenes-produccion/${id}/completar`, payload)),
};
 

export const listarProductos = async () => lista(await clienteApi.get('/productos', { params: { all: true } }));
 

export function unidadDe(materia, unidades = []) {
  if (!materia) return '';
  const relacion = materia.unidad_medida ?? materia.unidad;
  if (relacion?.nombre) return relacion.nombre;
  const id = materia.unidad_medida_id;
  return unidades.find((u) => String(u.id) === String(id))?.nombre ?? '';
}
 

export function mensajeError(error, defecto = 'Ocurrió un error inesperado.') {
  const data = error?.response?.data;
  const detalles = data?.errors ? Object.values(data.errors).flat().join(' ') : '';
  return detalles || data?.message || defecto;
}
 