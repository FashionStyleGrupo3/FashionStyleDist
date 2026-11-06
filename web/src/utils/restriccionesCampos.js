// Filtros de escritura para los campos de PQRS, alertas y producción: cada campo
// solo acepta los caracteres que le corresponden. Las mismas reglas se validan en el backend.

export const FORMATO_DOCUMENTO = {
  CC: { patron: /^\d{6,10}$/, max: 10, tipo: 'numerico', ayuda: '6 a 10 dígitos' },
  TI: { patron: /^\d{10,11}$/, max: 11, tipo: 'numerico', ayuda: '10 u 11 dígitos' },
  CE: { patron: /^[A-Z0-9]{6,12}$/, max: 12, tipo: 'alfanumerico', ayuda: '6 a 12 letras o números' },
  NIT: { patron: /^\d{9,10}(-\d)?$/, max: 12, tipo: 'nit', ayuda: '9 o 10 dígitos y dígito de verificación (ej. 900123456-7)' },
  PP: { patron: /^[A-Z0-9]{6,12}$/, max: 12, tipo: 'alfanumerico', ayuda: '6 a 12 letras o números' },
};

export const FORMATO_RADICADO = /^PQRS-\d{4}-\d{6}$/;

export function soloDigitos(valor, max = 15) {
  return String(valor ?? '').replace(/\D/g, '').slice(0, max);
}

export function soloLetras(valor, max = 120) {
  return String(valor ?? '')
    .replace(/[^\p{L}\s.'-]/gu, '')
    .replace(/^[\s.'-]+/, '')
    .replace(/\s{2,}/g, ' ')
    .slice(0, max);
}

export function documento(valor, tipo) {
  const regla = FORMATO_DOCUMENTO[tipo];
  const texto = String(valor ?? '').toUpperCase();
  if (!regla) return texto.replace(/[^0-9A-Z]/g, '').slice(0, 12);
  if (regla.tipo === 'numerico') return texto.replace(/\D/g, '').slice(0, regla.max);
  if (regla.tipo === 'nit') {
    const [cuerpo = '', verificacion] = texto.replace(/[^\d-]/g, '').split('-');
    return verificacion !== undefined ? `${cuerpo.slice(0, 10)}-${verificacion.slice(0, 1)}` : cuerpo.slice(0, 10);
  }
  return texto.replace(/[^0-9A-Z]/g, '').slice(0, regla.max);
}

export function documentoValido(valor, tipo) {
  return Boolean(FORMATO_DOCUMENTO[tipo]?.patron.test(String(valor ?? '')));
}

export function radicado(valor) {
  return String(valor ?? '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 16);
}

export function sinEspacios(valor, max = 255) {
  return String(valor ?? '').replace(/\s+/g, '').slice(0, max);
}

export function entero(valor, minimo = 0, maximo = 100000) {
  const n = Math.floor(Number(String(valor ?? '').replace(/\D/g, '')) || 0);
  return Math.min(maximo, Math.max(minimo, n));
}

/** keydown para inputs numéricos: bloquea e, E, +, -, punto y coma. */
export function bloquearNoEnteros(evento) {
  if (['e', 'E', '+', '-', '.', ','].includes(evento.key)) evento.preventDefault();
}
