// -> Servicio de productos y prendas
import clienteApi from './clienteApi';

// Consulta el catálogo de prendas aplicando filtros al endpoint del backend y fallback en cliente
export async function obtenerProductos(filtros = {}) {
  const params = {};
  if (filtros.categoriaId) params.categoria_id = filtros.categoriaId;
  if (filtros.catalogoId) params.catalogo_id = filtros.catalogoId;
  if (filtros.busqueda) params.q = filtros.busqueda;
  if (typeof filtros.activo === 'boolean') params.activo = filtros.activo;

  let lista = [];
  try {
    const respuesta = await clienteApi.get('/productos', { params });
    lista = respuesta.data?.data ?? (Array.isArray(respuesta.data) ? respuesta.data : []);
  } catch (error) {
    console.error('Error al consultar /productos en la API:', error);
    throw error;
  }

  // El estado activo es el Unico criterio de disponibilidad del catálogo.
  lista = lista.filter((p) => {
    const esActivo = p.activo === undefined || Number(p.activo) === 1 || p.activo === true;
    return esActivo;
  });

  // Filtrado de seguridad en cliente para categoría
  if (filtros.categoriaId) {
    const catIdNum = Number(filtros.categoriaId);
    lista = lista.filter((p) => {
      const pCatId = p.id_categoria ?? p.categoria_id ?? p.categoria?.id_categoria ?? p.categoria?.id;
      return Number(pCatId) === catIdNum;
    });
  }

  // Filtrado de seguridad en cliente para colección o catálogo
  if (filtros.catalogoId) {
    const colIdNum = Number(filtros.catalogoId);
    lista = lista.filter((p) => {
      const pColId = p.id_catalogo ?? p.catalogo_id ?? p.catalogo?.id_catalogo ?? p.catalogo?.id;
      return Number(pColId) === colIdNum;
    });
  }

  // Filtrado de seguridad en cliente para búsqueda de texto
  if (filtros.busqueda && String(filtros.busqueda).trim()) {
    const termino = String(filtros.busqueda).trim().toLowerCase();
    lista = lista.filter((p) => {
      const nombre = (p.nombre || '').toLowerCase();
      const descripcion = (p.descripcion || '').toLowerCase();
      const categoria = (p.categoria?.nombre || '').toLowerCase();
      const catalogo = (p.catalogo?.nombre || '').toLowerCase();
      return nombre.includes(termino) || descripcion.includes(termino) || categoria.includes(termino) || catalogo.includes(termino);
    });
  }

  return lista;
}

// Obtiene el detalle completo de una prenda por su identificador
export async function obtenerProducto(id) {
  const respuesta = await clienteApi.get(`/productos/${id}`);
  return respuesta.data?.data ?? respuesta.data ?? null;
}

export default {
  obtenerProductos,
  obtenerProducto
};
