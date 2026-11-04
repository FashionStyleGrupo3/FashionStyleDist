// -> Servicio de control financiero en paralelo (Wompi + Tienda) y reparto entre cuentas bancarias
import clienteApi from '@/services/clienteApi';
import { extraerDatos } from '@/utils/respuestaApi';

const CLAVE_STORAGE_CONFIG = 'fs_config_pasarela_pagos';

const configuracionPredeterminada = {
  moneda: 'COP',
  cuentas_bancarias: [
    {
      id: 1,
      banco: 'Bancolombia',
      tipo_cuenta: 'Ahorros',
      numero_cuenta: '245-891024-11',
      titular: 'Taller de confección & Operarios',
      concepto: 'Mano de Obra y confección Textil',
      porcentaje: 60,
      activa: true
    },
    {
      id: 2,
      banco: 'Bancolombia',
      tipo_cuenta: 'Corriente',
      numero_cuenta: '031-458920-55',
      titular: 'FashionStyle S.A.S.',
      concepto: 'Comercializacion y Operacion',
      porcentaje: 25,
      activa: true
    },
    {
      id: 3,
      banco: 'Davivienda',
      tipo_cuenta: 'Ahorros',
      numero_cuenta: '008-921478-03',
      titular: 'Fondo de Materia Prima e Insumos',
      concepto: 'reposicion de Telas y Fornituras',
      porcentaje: 15,
      activa: true
    }
  ]
};

export function obtenerConfiguracionPasarela() {
  const guardado = localStorage.getItem(CLAVE_STORAGE_CONFIG);
  if (!guardado) return JSON.parse(JSON.stringify(configuracionPredeterminada));
  try {
    const parsed = JSON.parse(guardado);
    return {
      moneda: parsed.moneda || 'COP',
      cuentas_bancarias: Array.isArray(parsed.cuentas_bancarias)
        ? parsed.cuentas_bancarias
        : JSON.parse(JSON.stringify(configuracionPredeterminada.cuentas_bancarias))
    };
  } catch {
    return JSON.parse(JSON.stringify(configuracionPredeterminada));
  }
}

export function guardarConfiguracionPasarela(nuevaConfig) {
  const limpia = {
    moneda: nuevaConfig.moneda || 'COP',
    cuentas_bancarias: nuevaConfig.cuentas_bancarias || []
  };
  localStorage.setItem(CLAVE_STORAGE_CONFIG, JSON.stringify(limpia));
  return limpia;
}

export function calcularDispersionFondos(montoTotal, cuentas) {
  const cuentasActivas = (cuentas || []).filter((c) => c.activa);
  return cuentasActivas.map((c) => {
    const valorAsignado = Math.round((Number(montoTotal || 0) * Number(c.porcentaje || 0)) / 100);
    return {
      ...c,
      monto_asignado: valorAsignado
    };
  });
}

/**
 * Consulta en el backend el recaudo real en paralelo (Pedidos Online Wompi + Ventas POS)
 * y asegura que todas las operaciones confirmadas tengan su factura emitida automáticamente.
 */
export async function obtenerControlParaleloPagos() {
  const respuesta = await clienteApi.get('/pagos/control-paralelo');
  const datos = extraerDatos(respuesta) ?? {};
  return {
    recaudoWompiOnline: Number(datos.recaudo_wompi_online ?? 0) || 0,
    cantidadPedidosPagados: Number(datos.cantidad_pedidos_pagados ?? 0) || 0,
    recaudoPosMostrador: Number(datos.recaudo_pos_mostrador ?? 0) || 0,
    cantidadVentasPos: Number(datos.cantidad_ventas_pos ?? 0) || 0,
    recaudoTotalConsolidado: Number(datos.recaudo_total_consolidado ?? 0) || 0,
    facturasEmitidas: Number(datos.facturas_emitidas ?? 0) || 0,
    transacciones: Array.isArray(datos.transacciones) ? datos.transacciones : []
  };
}

export default {
  obtenerConfiguracionPasarela,
  guardarConfiguracionPasarela,
  calcularDispersionFondos,
  obtenerControlParaleloPagos
};
