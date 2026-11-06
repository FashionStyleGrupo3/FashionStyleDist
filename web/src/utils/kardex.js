// El kárdex mezcla prendas (variantes) e insumos (materias primas de producción).
export function descripcionItemKardex(movimiento) {
  if (movimiento.materia_prima_id || movimiento.materia_prima) {
    return `Materia prima · ${movimiento.materia_prima?.nombre || `#${movimiento.materia_prima_id}`}`;
  }
  if (!movimiento.variante) return 'Variante no disponible';
  const producto = movimiento.producto?.nombre || movimiento.variante.producto?.nombre || 'Producto';
  return `${producto} · ${movimiento.producto?.color || 'Sin color'} · ${movimiento.variante.talla || 'Sin talla'}`;
}

export function esMovimientoDeProduccion(movimiento) {
  return Boolean(movimiento.materia_prima_id || movimiento.orden_produccion_id);
}

export const COLUMNAS_KARDEX = [
  { titulo: 'Fecha', ancho: 14, valor: (m) => (m.fecha_registro ? new Date(m.fecha_registro).toLocaleString('es-CO') : '') },
  { titulo: 'Prenda / insumo', ancho: 42, valor: descripcionItemKardex },
  { titulo: 'Tipo', clave: 'tipo_movimiento', ancho: 10 },
  { titulo: 'Concepto', clave: 'concepto', ancho: 30 },
  { titulo: 'Cantidad', clave: 'cantidad', formato: 'numero', ancho: 10 },
  { titulo: 'Efecto en stock', clave: 'diferencia', formato: 'numero', ancho: 14 },
  { titulo: 'Estado', clave: 'estado', ancho: 10 },
  { titulo: 'Usuario', ancho: 22, valor: (m) => m.usuario?.nombre || '' },
];
