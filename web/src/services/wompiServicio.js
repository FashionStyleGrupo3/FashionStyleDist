import clienteApi from '@/services/clienteApi';
import { extraerDatos } from '@/utils/respuestaApi';

const SCRIPT_URL = 'https://checkout.wompi.co/widget.js';

export function obtenerConfiguracionWompi() {
  return {
    publicKey: import.meta.env.VITE_WOMPI_PUBLIC_KEY || '',
    moneda: 'COP',
    scriptUrl: SCRIPT_URL
  };
}

export function cargarScriptWompi() {
  return new Promise((resolve) => {
    if (window.WidgetCheckout) return resolve(true);

    const existente = document.getElementById('wompi-widget-script');
    if (existente) {
      existente.addEventListener('load', () => resolve(true));
      existente.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.id = 'wompi-widget-script';
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

function normalizarDatosPago(d = {}) {
  return {
    referencia: d.referencia,
    monto_total: Number(d.monto_total) || 0,
    monto_centavos: Number(d.monto_centavos) || 0,
    moneda: d.moneda || 'COP',
    firma_integridad: d.firma_integridad,
    public_key: d.public_key || obtenerConfiguracionWompi().publicKey,
    expira_en: d.expira_en || null,
    simulado: Boolean(d.simulado)
  };
}

/**
 * Inicia el checkout: POST /api/checkout
 *
 * El front solo envía variante + cantidad y los datos de entrega. El backend calcula
 * precio, promociones y stock, reserva las unidades (20 min) y devuelve la referencia
 * y la firma de integridad. Si algo falla se lanza el error: nunca se aprueba ni se
 * simula un pago desde el front.
 */
export async function crearCheckout(items, cliente) {
  const lineas = items.map((item) => {
    const idVariante = Number(item.varianteId ?? item.producto_variante_id ?? item.id_variante);
    if (!Number.isInteger(idVariante) || idVariante <= 0) {
      console.error('Ítem sin variante válida:', item);
      throw new Error('Un producto de la bolsa no tiene una variante válida.');
    }
    return {
      id_variante: idVariante,
      cantidad: Math.max(1, Math.floor(Number(item.cantidad) || 1))
    };
  });

  const respuesta = await clienteApi.post('/checkout', {
    items: lineas,
    cliente: {
      nombre: String(cliente.nombre || '').trim(),
      correo: String(cliente.correo || '').trim(),
      telefono: String(cliente.telefono || '').trim(),
      ciudad: String(cliente.ciudad || '').trim(),
      departamento: String(cliente.departamento || cliente.ciudad || '').trim(),
      direccion: String(cliente.direccion || '').trim()
    }
  });

  return normalizarDatosPago(extraerDatos(respuesta));
}

/** Retoma el pago de un pedido pendiente: POST /api/checkout/{referencia}/reanudar */
export async function reanudarCheckout(referencia) {
  const respuesta = await clienteApi.post(`/checkout/${encodeURIComponent(referencia)}/reanudar`);
  return normalizarDatosPago(extraerDatos(respuesta));
}

/** Anula el pedido pendiente y libera el stock: POST /api/checkout/{referencia}/cancelar */
export async function cancelarCheckout(referencia) {
  const respuesta = await clienteApi.post(`/checkout/${encodeURIComponent(referencia)}/cancelar`);
  return extraerDatos(respuesta);
}

/**
 * Verifica el pago: POST /api/checkout/{referencia}/confirmar
 * El backend consulta la transacción directamente en Wompi; el front no decide el resultado.
 */
export async function confirmarCheckout(referencia, transaccionId) {
  const respuesta = await clienteApi.post(`/checkout/${encodeURIComponent(referencia)}/confirmar`, {
    transaccion_id: transaccionId
  });
  return extraerDatos(respuesta);
}

/**
 * El widget de Wompi no siempre ejecuta el callback cuando el cliente lo cierra con la "X"
 * (sobre todo si todavía no intentó pagar). Sin este aviso la promesa de iniciarPagoWompi
 * nunca terminaba y el botón de pago se quedaba cargando para siempre.
 *
 * Vigila el iframe que inyecta el widget: cuando desaparece (o se oculta) llama a `alCerrar`.
 * Devuelve una función para dejar de vigilar.
 */
function vigilarCierreWidget(alCerrar) {
  const previos = new Set(document.querySelectorAll('iframe'));
  const esDeWompi = (f) =>
    /wompi/i.test(f.getAttribute('src') || f.src || '') ||
    Boolean(f.closest('[id*="wompi" i], [class*="wompi" i]'));

  let widget = null;
  let cerradoSeguidos = 0;

  const intervalo = setInterval(() => {
    if (!widget) {
      widget = [...document.querySelectorAll('iframe')].find((f) => !previos.has(f) && esDeWompi(f)) || null;
      return;
    }
    const visible = widget.isConnected && widget.getClientRects().length > 0;
    cerradoSeguidos = visible ? 0 : cerradoSeguidos + 1;
    // Dos revisiones seguidas (~1 s) para no confundir una transición con un cierre
    if (cerradoSeguidos >= 2) {
      clearInterval(intervalo);
      alCerrar();
    }
  }, 500);

  return () => clearInterval(intervalo);
}

/**
 * Abre el widget de Wompi para un pedido ya creado en el backend.
 *
 * @param {boolean} cancelarAlCerrar  Si el cliente cierra el widget sin intentar pagar, se anula
 *   el pedido y se libera el stock al instante (carrito). En "Mis pedidos" se deja en false para
 *   que pueda reintentar mientras dure la reserva.
 */
export async function iniciarPagoWompi({
  pedido,
  cliente,
  cancelarAlCerrar = true,
  onAprobado,
  onPendiente,
  onRevision,
  onCancelado,
  onError,
  onVerificando,
  onAbierto
}) {
  const referencia = pedido?.referencia;
  const montoCentavos = Number(pedido?.monto_centavos ?? 0);
  const firmaIntegridad = pedido?.firma_integridad;
  const publicKey = pedido?.public_key || obtenerConfiguracionWompi().publicKey;

  // Sin referencia, firma o llave no se puede cobrar: se informa el error,
  // nunca se aprueba un pago que no pasó por Wompi.
  if (!referencia || !firmaIntegridad || !publicKey) {
    onError?.('No se pudo preparar el pago con Wompi. No se realizó ningún cobro.');
    return;
  }

  const finalizar = async (transaccionId, metodo) => {
    onVerificando?.();
    try {
      const resultado = await confirmarCheckout(referencia, transaccionId);
      const estadoPedido = resultado?.estado;

      if (estadoPedido === 'Pagado') {
        onAprobado?.({
          transaccionId,
          referencia: resultado?.referencia || referencia,
          metodoPago: resultado?.metodo_pago || metodo || 'Wompi',
          monto: Number(resultado?.monto_total ?? pedido?.monto_total ?? Math.round(montoCentavos / 100)),
          facturaId: resultado?.factura_id || resultado?.factura?.id || null,
          numeroFactura: resultado?.numero_factura || resultado?.factura?.numero_factura || null,
          factura: resultado?.factura || null,
          pedidoId: resultado?.pedido_id || null,
          correoEnviadoA: resultado?.correo_enviado_a || cliente?.correo || null,
          cliente
        });
      } else if (estadoPedido === 'Revision_Pago') {
        (onRevision ?? onPendiente)?.(resultado);
      } else if (estadoPedido === 'Pendiente_Pago') {
        onPendiente?.(resultado);
      } else {
        onError?.('El pago no fue aprobado. No se realizó ningún cobro.');
      }
    } catch (e) {
      onError?.(e?.response?.data?.message || 'No se pudo verificar el pago. Si se te cobró, contáctanos con tu referencia.');
    }
  };

  const abandonar = async () => {
    if (cancelarAlCerrar) {
      try {
        await cancelarCheckout(referencia);
      } catch {
        // Si falla, el scheduler expira la reserva a los 20 minutos.
      }
    }
    onCancelado?.();
  };

  // Solo con WOMPI_SIMULAR=true en entorno local: el backend acepta transacciones "SIM-".
  if (pedido.simulado) {
    await finalizar(`SIM-${Date.now()}`, 'SIMULADO (local)');
    return;
  }

  const scriptCargado = await cargarScriptWompi();
  if (!scriptCargado || !window.WidgetCheckout) {
    await abandonar();
    onError?.('No se pudo cargar la pasarela de pagos. Revisa tu conexión e inténtalo de nuevo.');
    return;
  }

  const telefono = String(cliente.telefono || '').replace(/\D/g, '');

  await new Promise((resolve) => {
    let terminado = false;
    let detenerVigilancia = () => {};

    // Garantiza que la promesa se resuelve una sola vez, pase lo que pase con el widget.
    const cerrarFlujo = () => {
      terminado = true;
      detenerVigilancia();
      resolve();
    };

    try {
      const checkout = new window.WidgetCheckout({
        currency: pedido.moneda || 'COP',
        amountInCents: montoCentavos,
        reference: referencia,
        publicKey,
        signature: { integrity: firmaIntegridad },
        customerData: {
          email: cliente.correo || undefined,
          fullName: cliente.nombre,
          phoneNumber: telefono,
          phoneNumberPrefix: '+57'
        },
        shippingAddress: {
          addressLine1: cliente.direccion,
          city: cliente.ciudad,
          region: cliente.departamento || cliente.ciudad,
          country: 'CO',
          phoneNumber: telefono
        }
      });

      // Camino 2: el cliente cerró con la "X" y Wompi no avisó. Se espera un momento por si el
      // callback llega tarde y, si no llega, se trata como un pago abandonado.
      // Debe empezar ANTES de open(): así distingue el iframe nuevo del widget de los previos.
      detenerVigilancia = vigilarCierreWidget(() => {
        setTimeout(async () => {
          if (terminado) return;
          terminado = true;
          try {
            await abandonar();
          } finally {
            resolve();
          }
        }, 1500);
      });

      // Camino 1: Wompi avisa por el callback (pago terminado o cierre con aviso).
      checkout.open(async (resultado) => {
        if (terminado) return;
        terminado = true;
        detenerVigilancia();
        try {
          const transaccion = resultado?.transaction;
          if (!transaccion?.id) {
            await abandonar();
          } else {
            await finalizar(transaccion.id, transaccion.payment_method_type);
          }
        } finally {
          resolve();
        }
      });

      // El widget ya está en pantalla: la interfaz puede dejar de mostrar "Procesando...".
      onAbierto?.();
    } catch (e) {
      console.error('No se pudo abrir el widget de Wompi:', e);
      cerrarFlujo();
      onError?.('No se pudo abrir la pasarela de pagos. Inténtalo de nuevo.');
    }
  });
}

/**
 * Consulta los datos en tiempo real de una transacción en Wompi (v1/transactions/:id)
 */
export async function consultarTransaccionWompi(transaccionId) {
  if (!transaccionId) return null;
  const config = obtenerConfiguracionWompi();
  const esSandbox = !config.publicKey || config.publicKey.startsWith('pub_test_');
  const host = esSandbox ? 'https://sandbox.wompi.co' : 'https://production.wompi.co';

  try {
    const url = host + '/v1/transactions/' + transaccionId;
    const headers = config.publicKey ? { Authorization: 'Bearer ' + config.publicKey } : {};
    const respuesta = await fetch(url, { headers });
    if (!respuesta.ok) return null;
    const json = await respuesta.json();
    return json?.data ?? null;
  } catch (error) {
    console.warn('No se pudo consultar la transacción en Wompi:', error);
    return null;
  }
}

export default {
  obtenerConfiguracionWompi,
  cargarScriptWompi,
  crearCheckout,
  reanudarCheckout,
  cancelarCheckout,
  confirmarCheckout,
  iniciarPagoWompi,
  consultarTransaccionWompi
};
