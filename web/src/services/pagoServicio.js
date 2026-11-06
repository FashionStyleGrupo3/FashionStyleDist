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
      concepto: 'Reposición de Telas y Fornituras',
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

// ---------- Reparto (dispersión) por pago ----------
// Por ahora el registro de cada reparto vive en este navegador (localStorage).
// Cuando exista el endpoint en el backend, solo hay que cambiar estas funciones.
const CLAVE_STORAGE_DISPERSIONES = 'fs_dispersiones_pagos';

export function obtenerDispersiones() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_STORAGE_DISPERSIONES) || '{}');
    return guardado && typeof guardado === 'object' ? guardado : {};
  } catch {
    return {};
  }
}

/** Devuelve la lista de cosas que impiden repartir con estas cuentas (vacía = listo). */
export function validarCuentasParaReparto(cuentas) {
  const activas = (cuentas || []).filter((c) => c.activa);
  const problemas = [];
  if (!activas.length) {
    problemas.push('No hay cuentas activas para recibir el dinero.');
    return problemas;
  }
  const total = Math.round(activas.reduce((a, c) => a + (Number(c.porcentaje) || 0), 0) * 100) / 100;
  if (total !== 100) problemas.push(`Los porcentajes suman ${total}% y deben sumar 100%.`);
  const incompleta = activas.some(
    (c) =>
      !c.banco ||
      String(c.numero_cuenta || '').replace(/-/g, '').length < 6 ||
      !String(c.titular || '').trim()
  );
  if (incompleta) problemas.push('Hay cuentas sin banco, número o titular.');
  return problemas;
}

/** Calcula cuánto recibe cada cuenta. La última se lleva el resto para que la suma sea exacta. */
export function calcularReparto(monto, cuentas) {
  const activas = (cuentas || []).filter((c) => c.activa);
  const total = Math.round(Number(monto) || 0);
  let acumulado = 0;
  return activas.map((c, i) => {
    const esUltima = i === activas.length - 1;
    const valor = esUltima ? total - acumulado : Math.round((total * (Number(c.porcentaje) || 0)) / 100);
    acumulado += valor;
    return {
      id: c.id,
      concepto: c.concepto || `Cuenta ${i + 1}`,
      banco: c.banco,
      tipo_cuenta: c.tipo_cuenta,
      numero_cuenta: c.numero_cuenta,
      titular: c.titular,
      porcentaje: Number(c.porcentaje) || 0,
      monto_asignado: valor
    };
  });
}

/** Guarda el reparto de un pago con una "foto" de las cuentas de ese momento y le da un número de comprobante. */
export function registrarDispersion(tx, cuentas) {
  const problemas = validarCuentasParaReparto(cuentas);
  if (problemas.length) throw new Error(problemas[0]);

  const todas = obtenerDispersiones();
  const clave = String(tx.id);
  if (todas[clave]) return todas[clave];

  const consecutivo = Object.keys(todas).length + 1;
  const registro = {
    comprobante: `REP-${String(consecutivo).padStart(6, '0')}`,
    pago_id: tx.id,
    fecha_reparto: new Date().toISOString(),
    monto: Math.round(Number(tx.monto) || 0),
    cuentas: calcularReparto(tx.monto, cuentas)
  };
  todas[clave] = registro;
  localStorage.setItem(CLAVE_STORAGE_DISPERSIONES, JSON.stringify(todas));
  return registro;
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
  obtenerControlParaleloPagos,
  obtenerDispersiones,
  validarCuentasParaReparto,
  calcularReparto,
  registrarDispersion
};