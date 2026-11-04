import clienteApi from '@/services/clienteApi';

function extraerData(respuesta) {
  const contenido = respuesta?.data?.data ?? respuesta?.data ?? [];
  return Array.isArray(contenido) ? contenido : contenido.data || [];
}

function aNumero(valor) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

function indexarUnidades(unidades) {
  const mapa = {};
  for (const u of unidades) {
    mapa[u.id ?? u.id_unidad] = {
      nombre: u.nombre,
      abreviatura: u.abreviatura || u.nombre,
    };
  }
  return mapa;
}

function indexarProductos(productos) {
  const mapa = {};
  for (const p of productos) {
    const variantes = Array.isArray(p.variantes) ? p.variantes : [];
    const varianteS = variantes.find(v => v.talla === 'S') || variantes[0];
    mapa[p.id_producto ?? p.id] = {
      nombre: p.nombre,
      precio_venta: aNumero(varianteS?.precio_venta ?? p.precio_venta ?? p.precio_base),
      variantes: variantes.map(v => ({
        id: v.id_variante ?? v.id,
        talla: v.talla,
        precio_venta: aNumero(v.precio_venta),
        sku: v.sku,
      })),
    };
  }
  return mapa;
}

function normalizarMaterias(materias, unidadesPorId) {
  return materias.map(m => {
    const idMaterial = m.id_material ?? m.id;
    const unidadAbrev = m.unidad
      || m.unidad_medida?.abreviatura
      || unidadesPorId[m.unidad_medida_id]?.abreviatura
      || unidadesPorId[m.unidad_medida_id]?.nombre
      || 'un';

    return {
      id: idMaterial,
      id_material: idMaterial,
      codigo: m.codigo,
      nombre: m.nombre,
      clasificacion: m.clasificacion || 'Insumo',
      unidad: unidadAbrev,
      costo_unitario: aNumero(m.costo_unitario),
      stock_actual: aNumero(m.stock_actual ?? m.stock ?? m.Stock),
      stock: aNumero(m.stock ?? m.stock_actual ?? m.Stock),
    };
  });
}

function agruparFormulas(formulasRaw, materiasPorId, productosPorId) {
  const yaAgrupadas = formulasRaw.some(f => Array.isArray(f?.consumos));
  
  if (yaAgrupadas) {
    return formulasRaw.map(f => {
      const productoId = f.producto_id ?? f.id ?? f.id_formula;
      const producto = productosPorId[productoId];
      const consumos = (Array.isArray(f.consumos) ? f.consumos : []).map(c => {
        const materia = materiasPorId[c.materia_prima_id];
        return {
          materia_prima_id: c.materia_prima_id,
          cantidad: aNumero(c.cantidad),
          insumo_nombre: materia?.nombre || c.insumo_nombre || 'Insumo',
          insumo_clasificacion: materia?.clasificacion || c.insumo_clasificacion || 'Insumo',
          insumo_unidad: c.unidad || materia?.unidad || 'un',
          insumo_costo: aNumero(materia?.costo_unitario ?? c.costo_unitario_estimado),
          insumo_stock: aNumero(materia?.stock_actual),
          desperdicio_porcentaje: aNumero(c.desperdicio_porcentaje),
        };
      });

      return {
        id: productoId,
        id_formula: f.id_formula ?? productoId,
        producto_id: productoId,
        nombre: f.nombre || producto?.nombre || `Producto #${productoId}`,
        precio_venta: aNumero(f.precio_venta || producto?.precio_venta),
        mano_obra_sugerida: aNumero(f.mano_obra_sugerida) || 35000,
        desperdicio_sugerido: aNumero(f.desperdicio_sugerido) || 0,
        consumos,
      };
    });
  }

  const mapa = new Map();

  for (const fila of formulasRaw) {
    const productoId = fila.producto_id;
    if (!productoId) continue;

    const producto = productosPorId[productoId];
    const materia = materiasPorId[fila.materia_prima_id];
    if (!materia) continue;

    if (!mapa.has(productoId)) {
      mapa.set(productoId, {
        id: productoId,
        id_formula: fila.id_formula ?? productoId,
        producto_id: productoId,
        nombre: producto?.nombre || `Producto #${productoId}`,
        precio_venta: producto?.precio_venta || 0,
        mano_obra_sugerida: 35000,
        desperdicio_sugerido: 0,
        consumos: [],
      });
    }

    mapa.get(productoId).consumos.push({
      materia_prima_id: materia.id,
      cantidad: aNumero(fila.cantidad),
      insumo_nombre: materia.nombre,
      insumo_clasificacion: materia.clasificacion || 'Insumo',
      insumo_unidad: materia.unidad,
      insumo_costo: materia.costo_unitario,
      insumo_stock: materia.stock_actual,
      desperdicio_porcentaje: aNumero(fila.desperdicio_porcentaje),
    });
  }

  return Array.from(mapa.values());
}

export async function cargarDatosCalculadora() {
  const [resMaterias, resFormulas, resProductos, resUnidades] = await Promise.all([
    clienteApi.get('/materias-primas'),
    clienteApi.get('/formulas-produccion'),
    clienteApi.get('/productos'),
    clienteApi.get('/unidades-medida').catch(() => ({ data: [] })),
  ]);

  const materiasRaw = extraerData(resMaterias);
  const formulasRaw = extraerData(resFormulas);
  const productosRaw = extraerData(resProductos);
  const unidadesRaw = extraerData(resUnidades);

  const unidadesPorId = indexarUnidades(unidadesRaw);
  const productosPorId = indexarProductos(productosRaw);
  const materiasNormalizadas = normalizarMaterias(materiasRaw, unidadesPorId);

  const materiasPorId = {};
  for (const m of materiasNormalizadas) {
    materiasPorId[m.id] = m;
  }

  const formulasAgrupadas = agruparFormulas(formulasRaw, materiasPorId, productosPorId);

  return {
    materiasPrimas: materiasNormalizadas,
    formulas: formulasAgrupadas,
  };
}

export default {
  cargarDatosCalculadora,
};
