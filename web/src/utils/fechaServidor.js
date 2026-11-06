/**
 * El backend corre en UTC y algunos campos (p. ej. `fecha_pedido`) llegan sin zona horaria,
 * como "2026-11-05 22:00:00". `new Date()` los lee como hora local y mostraba 5 horas de más
 * (10:20 p. m. cuando en Colombia eran las 5:20 p. m.). Aquí se interpretan como UTC.
 * Las fechas que ya traen zona ("...Z" o "+00:00") y las que solo traen día no se tocan.
 */
export function fechaDelServidor(valor) {
  if (valor instanceof Date) return valor;
  if (!valor) return new Date(NaN);

  const texto = String(valor).trim();
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(texto)) {
    return new Date(`${texto.replace(' ', 'T')}Z`);
  }
  return new Date(texto);
}
