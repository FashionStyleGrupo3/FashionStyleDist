/**
 * Utilidades para leer respuestas del backend Laravel (middleware NormalizeApiResponse).
 * Soporta tanto listas planas como respuestas paginadas de Laravel
 * ({ data: [...], current_page, last_page, total } o { data: [...], meta: {...} }).
 */

export function extraerDatos(respuesta) {
  return respuesta?.data?.data ?? respuesta?.data;
}

export function extraerPaginado(respuesta) {
  const cuerpo = respuesta?.data ?? {};
  const datos = cuerpo?.data ?? cuerpo;

  let lista = [];
  let meta = {};

  if (Array.isArray(datos)) {
    lista = datos;
    meta = cuerpo.meta ?? cuerpo.pagination ?? cuerpo;
  } else if (Array.isArray(datos?.data)) {
    lista = datos.data;
    meta = datos.meta ?? datos;
  }

  return {
    lista,
    paginaActual: Number(meta.current_page ?? 1) || 1,
    totalPaginas: Number(meta.last_page ?? 1) || 1,
    totalRegistros: Number(meta.total ?? lista.length) || 0
  };
}

