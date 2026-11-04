const patronesCampo = {
  nombre: /[^\p{L}\p{M}\p{N} ]/gu,
  color: /[^\p{L}\p{M} ]/gu,
  descripcion: /[^\p{L}\p{M}\p{N} .,;:!?¡¿¡¿'"’“”()\- \n\r]/gu,
  talla: /[^\p{L}\p{M} ]/gu,
  sku: /[^A-Z0-9_-]/g,
  opcion: /[^\p{L}\p{M}\p{N} ]/gu
};

const limitesCampo = {
  nombre: 60,
  color: 30,
  descripcion: 500,
  talla: 20,
  sku: 24,
  opcion: 40
};

export function filtrarCampoPrenda(campo, valor) {
  const texto = String(valor ?? '');
  if (campo === 'sku') {
    return texto.toUpperCase().replace(patronesCampo.sku, '').slice(0, limitesCampo.sku);
  }

  const patron = patronesCampo[campo];
  const limite = limitesCampo[campo];
  if (!patron || !limite) return texto;
  return texto.replace(patron, '').slice(0, limite);
}

export function validarCampoPrenda(campo, valor) {
  const texto = String(valor ?? '').trim();
  const limite = limitesCampo[campo];
  if (!limite || !texto || texto.length > limite) return false;
  return filtrarCampoPrenda(campo, texto) === texto;
}

export function filtrarPrecio(valor) {
  const texto = String(valor ?? '').replace(/[^\d.]/g, '');
  const punto = texto.indexOf('.');
  if (punto === -1) return texto.slice(0, 9);
  return `${texto.slice(0, punto).slice(0, 9)}.${texto.slice(punto + 1).replace(/\./g, '').slice(0, 2)}`;
}

export function validarPrecio(valor) {
  const texto = String(valor ?? '').trim();
  return /^\d{1,9}(?:\.\d{1,2})?$/.test(texto) && Number.isFinite(Number(texto));
}

export function filtrarStock(valor) {
  return String(valor ?? '').replace(/\D/g, '').slice(0, 9);
}

export function validarStock(valor) {
  const texto = String(valor ?? '').trim();
  return /^\d{1,9}$/.test(texto) && Number.isSafeInteger(Number(texto));
}

export function validarArchivoImagen(archivo) {
  return Boolean(
    archivo
    && ['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)
    && Number.isFinite(archivo.size)
    && archivo.size > 0
    && archivo.size <= 4 * 1024 * 1024
  );
}

export function seleccionarImagenesPrenda(archivos, cantidadExistente = 0, limite = 9) {
  const validas = [];
  let rechazadas = 0;

  for (const archivo of Array.from(archivos || [])) {
    if (!validarArchivoImagen(archivo) || cantidadExistente + validas.length >= limite) {
      rechazadas += 1;
      continue;
    }
    validas.push(archivo);
  }

  return { validas, rechazadas };
}

export function filtrarEntero(valor, maxDigitos = 9) { if (valor === null || valor === undefined || valor === '') return ''; return String(valor).replace(/\D/g, '').slice(0, maxDigitos); }

export function filtrarDecimal(valor, maxEnteros = 9, maxDecimales = 2) { if (valor === null || valor === undefined || valor === '') return ''; let texto = String(valor).replace(/,/g, '.').replace(/[^\d.]/g, ''); const punto = texto.indexOf('.'); if (punto === -1) return texto.slice(0, maxEnteros); const entero = texto.slice(0, punto).slice(0, maxEnteros) || '0'; const decimales = texto.slice(punto + 1).replace(/\./g, '').slice(0, maxDecimales); return decimales.length ? entero + '.' + decimales : entero; }
