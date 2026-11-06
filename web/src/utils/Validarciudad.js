import clienteApi from '@/services/clienteApi';

// Formato mínimo (filtro rápido, sin red).
export function ciudadTieneFormatoValido(ciudad) {
  const valor = String(ciudad || '').trim();
  return valor.length >= 3 && valor.length <= 100 && /^[\p{L}][\p{L}\s.'-]*$/u.test(valor);
}

// Sugerencias para el autocompletado (consulta al backend, que usa API Colombia).
export async function buscarCiudades(texto) {
  try {
    const { data } = await clienteApi.get('/ciudades/buscar', { params: { q: texto } });
    return data?.data ?? [];
  } catch {
    return [];
  }
}


export async function ciudadExiste(ciudad) {
  if (!ciudadTieneFormatoValido(ciudad)) return false;
  try {
    const { data } = await clienteApi.get('/ciudades/existe', { params: { nombre: ciudad.trim() } });
    return data?.existe ?? null;
  } catch {
    return null;
  }
}