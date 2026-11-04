const patronesCampo = {
  persona: /[^\p{L}\p{M} .'-]/gu,
  comercial: /[^\p{L}\p{M}\p{N} %&.,'’/()-]/gu,
  identificacion: /[^\p{L}\p{M}\p{N}.-]/gu,
  cuenta: /[^A-Z0-9-]/gi,
  codigo: /[^A-Z0-9_-]/gi,
    abreviatura: /[^\p{L}\p{M}\p{N}%./-]/gu,
    direccion: /[^\p{L}\p{M}\p{N} #.,/-]/gu,
    numerico: /\D/g,
    texto: /[^\p{L}\p{M}\p{N} .,;:!?¡¿'"’“”()/#-]/gu
  };

export function filtrarCampo(valor, tipo, limite) {
  if (tipo === 'codigo') {
    return String(valor ?? '').toUpperCase().replace(patronesCampo.codigo, '').slice(0, limite);
  }
  if (tipo === 'telefono') {
    const texto = String(valor ?? '').trimStart();
    const prefijo = texto.startsWith('+') ? '+' : '';
    return `${prefijo}${texto.replace(/\D/g, '').slice(0, 15)}`.slice(0, limite);
  }

  const patron = patronesCampo[tipo];
  if (!patron) return String(valor ?? '').slice(0, limite);
  return String(valor ?? '').replace(patron, '').slice(0, limite);
}

export function validarCorreo(valor) {
  const correo = String(valor ?? '').trim();
  return correo.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}

export function filtrarNumero(valor, maxEnteros = 9, maxDecimales = 0) {
  const texto = String(valor ?? '').replace(/,/g, '.').replace(/[^\d.]/g, '');
  const punto = texto.indexOf('.');
  const entero = (punto < 0 ? texto : texto.slice(0, punto)).slice(0, maxEnteros);
  if (punto < 0 || maxDecimales === 0) return entero;
  const decimales = texto.slice(punto + 1).replace(/\./g, '').slice(0, maxDecimales);
  return `${entero}.${decimales}`;
}

export function normalizarDatosEntrega(datos = {}) {
  return {
    ...datos,
    nombre: filtrarCampo(datos.nombre, 'persona', 100).trim(),
    telefono: filtrarCampo(datos.telefono, 'telefono', 20).trim(),
    ciudad: filtrarCampo(datos.ciudad, 'persona', 80).trim(),
    departamento: filtrarCampo(datos.departamento, 'persona', 80).trim(),
    direccion: filtrarCampo(datos.direccion, 'direccion', 180).trim()
  };
}

export function validarDatosEntrega(datos = {}) {
  const normalizados = normalizarDatosEntrega(datos);
  if (!/[\p{L}\p{M}]/u.test(normalizados.nombre)) {
    return 'Escribe el nombre de quien recibe el pedido.';
  }
  if (!/^\+?\d{7,15}$/.test(normalizados.telefono)) {
    return 'El teléfono debe tener entre 7 y 15 dígitos.';
  }
  if (!/[\p{L}\p{M}]/u.test(normalizados.ciudad)) return 'Escribe una ciudad válida.';
  if (!/[\p{L}\p{N}]/u.test(normalizados.direccion)) return 'Escribe una dirección válida.';
  return '';
}
export function filtrarNumerico(valor, maxEnteros = 10, maxDecimales = 0, permitirNegativo = false) { if (valor === null || valor === undefined || valor === '') return ''; let texto = String(valor).replace(/,/g, '.'); if (permitirNegativo && texto.trim().startsWith('-')) { texto = '-' + texto.replace(/-/g, '').replace(/[^\d.]/g, ''); } else { texto = texto.replace(/[^\d.]/g, ''); } const esNegativo = texto.startsWith('-'); const sinSigno = esNegativo ? texto.slice(1) : texto; const punto = sinSigno.indexOf('.'); let entero = (punto < 0 ? sinSigno : sinSigno.slice(0, punto)); if (entero === '') entero = '0'; entero = entero.slice(0, maxEnteros); if (punto < 0 || maxDecimales === 0) { const resultado = (esNegativo ? '-' : '') + entero; return resultado === '-' ? '' : resultado; } let decimales = sinSigno.slice(punto + 1).replace(/\./g, '').slice(0, maxDecimales); return (esNegativo ? '-' : '') + entero + '.' + decimales; }

export function filtrarAlfanumerico(valor, limite = 50) { if (valor === null || valor === undefined) return ''; return String(valor).replace(/[^A-Za-z0-9]/g, '').slice(0, limite); }

export function filtrarIdentificacion(valor, limite = 20) { if (valor === null || valor === undefined) return ''; return String(valor).replace(/[^A-Za-z0-9.-]/g, '').slice(0, limite); }
