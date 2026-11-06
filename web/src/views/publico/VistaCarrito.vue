<script setup>
import { computed, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowLeft,
  ArrowRight,
  CreditCard,
  MessageCircle,
  CheckCircle2,
  Loader2,
  Lock,
  FileText,
  Mail,
  Download
} from 'lucide-vue-next';
import { useCarritoStore } from '@/stores/carrito';
import { useAutenticacionStore } from '@/stores/autenticacion';
import { useFormatoMoneda } from '@/composables/useFormatoMoneda';
import { useImagenStorage } from '@/composables/useImagenStorage';
import { crearCheckout, iniciarPagoWompi, cargarScriptWompi } from '@/services/wompiServicio';
import { useValidacionCiudad } from '@/composables/useValidacionCiudad';
import VisorFacturaFashion from '@/components/facturas/VisorFacturaFashion.vue';
import clienteApi from '@/services/clienteApi';

const router = useRouter();
const carritoStore = useCarritoStore();
const authStore = useAutenticacionStore();
const { formatearCOP } = useFormatoMoneda();
const { resolverUrlImagen, IMAGEN_RESPALDO } = useImagenStorage();

const items = computed(() => carritoStore.items);
const totalPrendas = computed(() => carritoStore.totalPrendas);
const totalMonto = computed(() => carritoStore.totalMonto);
const totalOriginal = computed(() => carritoStore.totalOriginal);
const totalAhorro = computed(() => carritoStore.totalAhorro);

function tieneDescuento(item) {
  return Number(item.precioOriginal) > Number(item.precio);
}

function porcentajeDescuento(item) {
  return Math.round((1 - Number(item.precio) / Number(item.precioOriginal)) * 100);
}

// ============================================================================
// PAGO CON WOMPI Y DATOS DE ENTREGA
// ============================================================================
const cargandoPago = ref(false);
const errorPago = ref(null);
const mostrarFormularioEnvio = ref(false);
const reciboConfirmado = ref(null);

// Visor y Descarga de Factura
const visorFacturaAbierto = ref(false);
const facturaParaVisor = ref(null);
const pedidoParaVisor = ref(null);

const datosCliente = ref({
  nombre: authStore.usuario?.nombre || '',
  correo: authStore.usuario?.correo || authStore.usuario?.email || '',
  telefono: authStore.usuario?.telefono || '',
  ciudad: authStore.usuario?.ciudad || '',
  departamento: authStore.usuario?.departamento || '',
  direccion: authStore.usuario?.direccion || ''
});

// RF-072: la ciudad de entrega se valida contra el catálogo nacional antes de pagar.
const validacionCiudad = useValidacionCiudad(() => datosCliente.value.ciudad);
const sugerenciasCiudad = validacionCiudad.sugerencias;

function prepararDatosCliente() {
  if (authStore.usuario) {
    datosCliente.value.nombre = datosCliente.value.nombre || authStore.usuario.nombre || '';
    datosCliente.value.correo = datosCliente.value.correo || authStore.usuario.correo || authStore.usuario.email || '';
    datosCliente.value.telefono = datosCliente.value.telefono || authStore.usuario.telefono || '';
    datosCliente.value.ciudad = datosCliente.value.ciudad || authStore.usuario.ciudad || '';
    datosCliente.value.departamento = datosCliente.value.departamento || authStore.usuario.departamento || authStore.usuario.ciudad || '';
    datosCliente.value.direccion = datosCliente.value.direccion || authStore.usuario.direccion || '';
  }
}

function datosEnvioCompletos() {
  const telLimpio = String(datosCliente.value.telefono || '').replace(/\D/g, '');
  return (
    Boolean(String(datosCliente.value.nombre || '').trim()) &&
    telLimpio.length >= 7 &&
    Boolean(String(datosCliente.value.ciudad || '').trim()) &&
    Boolean(String(datosCliente.value.direccion || '').trim())
  );
}

function abrirVisorFactura() {
  if (!reciboConfirmado.value) return;

  const ultimoGuardado = JSON.parse(localStorage.getItem('fs_ultimo_pedido') || '{}');
  const itemsGuardados = ultimoGuardado.items || items.value || [];

  facturaParaVisor.value = reciboConfirmado.value.factura || {
    id: reciboConfirmado.value.facturaId,
    numero: reciboConfirmado.value.numeroFactura || `FAC-${reciboConfirmado.value.facturaId || '0001'}`
  };

  pedidoParaVisor.value = {
    id: reciboConfirmado.value.pedidoId,
    referencia: reciboConfirmado.value.referencia,
    total: reciboConfirmado.value.monto,
    metodoPago: reciboConfirmado.value.metodoPago,
    facturaId: reciboConfirmado.value.facturaId,
    cliente: {
      nombre: datosCliente.value.nombre,
      correo: reciboConfirmado.value.correoEnviadoA || datosCliente.value.correo,
      telefono: datosCliente.value.telefono,
      direccion: datosCliente.value.direccion,
      ciudad: datosCliente.value.ciudad
    },
    detalles: itemsGuardados.map(i => ({
      nombre: i.nombre,
      talla: i.talla,
      cantidad: i.cantidad,
      precio: i.precio,
      subtotal: i.precio * i.cantidad
    }))
  };

  visorFacturaAbierto.value = true;
}

async function pagarConWompi() {
  if (items.value.length === 0) return;
  errorPago.value = null;

  if (!authStore.estaAutenticado || !authStore.usuario) {
    errorPago.value = 'Inicia sesión para finalizar tu compra.';
    return;
  }

  prepararDatosCliente();

  if (!datosEnvioCompletos()) {
    mostrarFormularioEnvio.value = true;
    errorPago.value = 'Completa los datos de entrega (nombre, teléfono, ciudad y dirección) para procesar el pago.';
    return;
  }

  if (!(await validacionCiudad.comprobar())) {
    mostrarFormularioEnvio.value = true;
    errorPago.value = 'No encontramos la ciudad de entrega. Selecciónala de la lista de sugerencias.';
    return;
  }

  cargandoPago.value = true;

  let pedido;
  try {
    pedido = await crearCheckout(items.value, {
      ...datosCliente.value,
      departamento: datosCliente.value.departamento || datosCliente.value.ciudad
    });
  } catch (err) {
    cargandoPago.value = false;
    const cuerpo = err?.response?.data;
    const datosError = cuerpo?.data ?? cuerpo;
    const listaSinStock = datosError?.sin_stock ?? cuerpo?.sin_stock;

    if (Array.isArray(listaSinStock)) {
      listaSinStock.forEach(({ id_variante, disponible }) => {
        if (Number(disponible) > 0) carritoStore.actualizarCantidad(id_variante, Number(disponible));
        else carritoStore.eliminarPrenda(id_variante);
      });
    }
    errorPago.value = cuerpo?.message || datosError?.message || 'No fue posible preparar tu pedido. Intenta de nuevo.';
    return;
  }

  await iniciarPagoWompi({
    pedido,
    cliente: datosCliente.value,
    // Con el widget abierto el botón no debe quedarse en "Procesando pago..."
    onAbierto: () => {
      cargandoPago.value = false;
    },
    onVerificando: () => {
      cargandoPago.value = true;
    },
    onAprobado: (detalles) => {
      reciboConfirmado.value = detalles;
      localStorage.setItem('fs_ultimo_pedido', JSON.stringify({
        referencia: detalles.referencia,
        idTransaccion: detalles.transaccionId,
        total: detalles.monto,
        facturaId: detalles.facturaId,
        numeroFactura: detalles.numeroFactura,
        correoEnviadoA: detalles.correoEnviadoA,
        items: JSON.parse(JSON.stringify(items.value)),
        fecha: new Date().toISOString()
      }));
      carritoStore.limpiarCarrito();
      cargandoPago.value = false;
    },
    onPendiente: () => {
      errorPago.value = `Tu pago está pendiente de confirmación (ref. ${pedido.referencia}). Te avisaremos cuando se apruebe.`;
      cargandoPago.value = false;
    },
    onRevision: () => {
      errorPago.value = `Recibimos tu pago (ref. ${pedido.referencia}), pero una prenda se agotó mientras lo procesábamos. Nuestro equipo te contactará para resolverlo o reembolsarte.`;
      carritoStore.limpiarCarrito();
      cargandoPago.value = false;
    },
    onCancelado: () => {
      cargandoPago.value = false;
    },
    onError: (msg) => {
      errorPago.value = msg;
      cargandoPago.value = false;
    }
  });
  cargandoPago.value = false;
}

// ============================================================================
// PRODUCTOS RELACIONADOS
// ============================================================================
const productosTodos = ref([]);
const cargandoRelacionados = ref(false);

function resolverImagenProducto(p) {
  const imgs = Array.isArray(p?.imagenes) ? [...p.imagenes] : [];
  if (imgs.length) {
    imgs.sort((a, b) => Number(b.es_principal) - Number(a.es_principal) || (a.orden ?? 0) - (b.orden ?? 0));
    const origen = imgs[0]?.url || imgs[0]?.ruta;
    if (origen) return resolverUrlImagen(origen);
  }
  return p?.imagen ? resolverUrlImagen(p.imagen) : IMAGEN_RESPALDO;
}

const relacionados = computed(() => {
  if (!productosTodos.value.length || !items.value.length) return [];

  const categoriasDelCarrito = new Set();
  for (const item of items.value) {
    if (item.categoriaId) categoriasDelCarrito.add(Number(item.categoriaId));
  }

  const idsEnCarrito = new Set(items.value.map(i => Number(i.productoId)));
  let candidatos = productosTodos.value.filter(p => !idsEnCarrito.has(Number(p.id)));

  if (categoriasDelCarrito.size > 0) {
    const deLaCategoria = candidatos.filter(p => categoriasDelCarrito.has(Number(p.categoriaId)));
    if (deLaCategoria.length >= 4) candidatos = deLaCategoria;
  }

  return candidatos.slice(0, 4);
});

async function cargarRelacionados() {
  cargandoRelacionados.value = true;
  try {
    const [res, promos] = await Promise.all([
      clienteApi.get('/productos'),
      obtenerPromocionesVigentes()
    ]);
    const datos = res.data?.data ?? res.data ?? [];
    const lista = Array.isArray(datos) ? datos : datos.data || [];

    productosTodos.value = lista.map(p => {
      const variantes = Array.isArray(p.variantes) ? p.variantes : [];
      const varianteS = variantes.find(v => v.talla === 'S') || variantes[0] || {};
      const precioBase = Number(varianteS.precio_venta ?? p.precio_venta ?? p.precio_base ?? 0);
      const calc = calcularPrecioPromocional(p, precioBase, promos);

      return {
        id: p.id_producto ?? p.id,
        nombre: p.nombre,
        categoriaId: p.categoria_id ?? p.categoria?.id_categoria ?? p.categoria?.id ?? null,
        catalogoId: p.catalogo_id ?? p.catalogo?.id_catalogo ?? p.catalogo?.id ?? null,
        imagen: resolverImagenProducto(p),
        precio: calc.precioFinal,
        precioOriginal: calc.precioOriginal,
        tieneDescuento: calc.ahorro > 0,
        porcentajeDescuento: calc.porcentaje,
        promocion: calc.promocion
      };
    });
  } catch (e) {
    console.warn('No se pudieron cargar los productos relacionados:', e);
  } finally {
    cargandoRelacionados.value = false;
  }
}

// ============================================================================
// ACCIONES DEL CARRITO
// ============================================================================
function incrementar(item) {
  if (!item.stockMaximo || item.cantidad < item.stockMaximo) {
    carritoStore.actualizarCantidad(item.varianteId, item.cantidad + 1);
  }
}

function decrementar(item) {
  if (item.cantidad > 1) {
    carritoStore.actualizarCantidad(item.varianteId, item.cantidad - 1);
  }
}

function cambiarCantidadManual(item, e) {
  const valor = Number(e.target.value) || 1;
  carritoStore.actualizarCantidad(item.varianteId, valor);
}

function eliminar(item) {
  if (confirm(`¿Quitar "${item.nombre}" (Talla ${item.talla}) de tu carrito?`)) {
    carritoStore.eliminarPrenda(item.varianteId);
  }
}

function vaciarCarrito() {
  if (confirm('¿Vaciar todo el carrito?')) {
    carritoStore.limpiarCarrito();
  }
}

function seguirComprando() {
  router.push({ name: 'inicio' });
}

function verProducto(id) {
  router.push({ name: 'detalle-producto', params: { id } });
}

function enviarWhatsApp() {
  if (items.value.length === 0) return;

  const numero = String(import.meta.env.VITE_WHATSAPP_NUMERO || '573001234567').replace(/\D/g, '');

  let texto = 'Hola FashionStyle, deseo consultar y apartar las siguientes prendas:\n\n';
  items.value.forEach((item, index) => {
    texto += `${index + 1}. ${item.nombre} (Talla: ${item.talla}) x${item.cantidad} - ${formatearCOP(item.precio * item.cantidad)}\n`;
  });
  texto += `\nTotal estimado: ${formatearCOP(totalMonto.value)}`;
  texto += '\n\nQuedo atento(a) para coordinar el envío. ¡Gracias!';

  const url = `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

onMounted(() => {
  prepararDatosCliente();
  cargarScriptWompi();
  cargarRelacionados();
});
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

    <!-- Encabezado -->
    <div class="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <button
          type="button"
          class="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-corporativo-rosa transition"
          @click="seguirComprando"
        >
          <ArrowLeft class="h-4 w-4" /> Seguir comprando
        </button>
        <h1 class="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
          Mi carrito
        </h1>
        <p v-if="totalPrendas > 0" class="mt-1 text-sm text-gray-500">
          {{ totalPrendas }} {{ totalPrendas === 1 ? 'prenda' : 'prendas' }} en tu selección
        </p>
      </div>

      <button
        v-if="items.length > 0"
        type="button"
        class="text-sm font-semibold text-red-500 hover:text-red-700 transition"
        @click="vaciarCarrito"
      >
        Vaciar carrito
      </button>
    </div>

    <!-- Confirmación de pago exitoso con Factura y Notificación por Correo -->
    <div v-if="reciboConfirmado" class="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm max-w-xl mx-auto space-y-5">
      <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <CheckCircle2 class="h-10 w-10" />
      </div>
      <div>
        <h2 class="text-2xl font-extrabold text-gray-900">¡Pago Confirmado con Éxito!</h2>
        <p class="mt-1 text-sm text-gray-500">
          Transacción verificada y autorizada por Wompi Bancolombia.
        </p>
      </div>

      <!-- Notificación destacada de envío de factura por correo -->
      <div class="rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-left text-xs text-emerald-900 flex items-start gap-3">
        <Mail class="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <p class="font-bold text-sm text-emerald-950">Factura electrónica emitida</p>
          <p class="mt-0.5 text-emerald-800 leading-relaxed">
            Hemos generado tu factura legal de venta y se ha enviado automáticamente a tu correo:
            <strong class="underline decoration-emerald-400 font-semibold">{{ reciboConfirmado.correoEnviadoA || datosCliente.correo || 'tu correo registrado' }}</strong>.
          </p>
        </div>
      </div>

      <!-- Resumen de transacción -->
      <div class="space-y-2 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-left text-xs">
        <div class="flex justify-between gap-3">
          <span class="text-gray-500">Referencia de Pago:</span>
          <strong class="font-mono text-gray-900">{{ reciboConfirmado.referencia }}</strong>
        </div>
        <div v-if="reciboConfirmado.numeroFactura || reciboConfirmado.facturaId" class="flex justify-between gap-3">
          <span class="text-gray-500">N.º Factura:</span>
          <strong class="font-mono font-bold text-corporativo-rosa">{{ reciboConfirmado.numeroFactura || `FAC-${reciboConfirmado.facturaId}` }}</strong>
        </div>
        <div class="flex justify-between gap-3">
          <span class="text-gray-500">ID Transacción Wompi:</span>
          <span class="font-mono font-semibold text-emerald-700">{{ reciboConfirmado.transaccionId }}</span>
        </div>
        <div class="flex justify-between gap-3">
          <span class="text-gray-500">Medio utilizado:</span>
          <span class="font-medium text-gray-800">{{ reciboConfirmado.metodoPago }}</span>
        </div>
        <div class="border-t border-gray-200 pt-2 flex justify-between gap-3 font-bold text-sm text-gray-900">
          <span>Total pagado:</span>
          <span class="text-corporativo-rosa">{{ formatearCOP(reciboConfirmado.monto || 0) }}</span>
        </div>
      </div>

      <!-- Botones de Acción: Ver/Descargar Factura y Seguir Comprando -->
      <div class="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          type="button"
          class="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 font-bold text-white shadow-sm hover:bg-black transition text-xs sm:text-sm"
          @click="abrirVisorFactura"
        >
          <FileText class="h-4 w-4" /> Ver / Descargar Factura (PDF)
        </button>

        <button
          type="button"
          class="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-corporativo-rosa px-5 py-3 font-bold text-white shadow-sm hover:bg-pink-700 transition text-xs sm:text-sm"
          @click="reciboConfirmado = null; seguirComprando()"
        >
          <ShoppingBag class="h-4 w-4" /> Seguir comprando
        </button>
      </div>
    </div>

    <!-- Carrito vacío -->
    <div v-else-if="items.length === 0" class="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
      <ShoppingBag class="mx-auto h-16 w-16 text-gray-300" :stroke-width="1.2" />
      <p class="mt-4 text-lg font-bold text-gray-700">Tu carrito está vacío</p>
      <p class="mt-1 text-sm text-gray-500">
        Explora nuestra colección y añade tus prendas favoritas.
      </p>
      <button
        type="button"
        class="mt-6 inline-flex items-center gap-2 rounded-xl bg-corporativo-rosa px-6 py-3 font-bold text-white shadow-sm hover:bg-corporativo-rosa-hover transition"
        @click="seguirComprando"
      >
        <ShoppingBag class="h-5 w-5" /> Ver la colección
      </button>
    </div>

    <!-- Carrito con items -->
    <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-3">

      <!-- Lista de items -->
      <div class="lg:col-span-2 space-y-4">
        <article
          v-for="item in items"
          :key="item.varianteId"
          class="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center"
        >
          <!-- Imagen del producto -->
          <div class="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100 mx-auto sm:mx-0">
            <img
              v-if="item.imagen"
              :src="resolverUrlImagen(item.imagen)"
              :alt="item.nombre"
              class="h-full w-full object-cover"
              @error="(e) => { e.target.onerror = null; e.target.src = IMAGEN_RESPALDO; }"
            />
            <ShoppingBag v-else class="h-10 w-10 text-gray-300" />
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0 text-center sm:text-left">
            <h3 class="text-base font-bold text-gray-900 truncate">{{ item.nombre }}</h3>
            <p class="mt-0.5 text-xs text-gray-500">
              Talla: <span class="font-semibold text-gray-700">{{ item.talla }}</span>
            </p>
            <p v-if="item.sku" class="text-xs text-gray-400">SKU: {{ item.sku }}</p>
            <p class="mt-2 text-sm font-bold text-corporativo-rosa">
              {{ formatearCOP(item.precio) }} <span class="text-xs font-normal text-gray-500">/ unidad</span>
              <span v-if="tieneDescuento(item)" class="ml-1 text-xs font-normal text-gray-400 line-through">{{ formatearCOP(item.precioOriginal) }}</span>
              <span v-if="tieneDescuento(item)" class="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">-{{ porcentajeDescuento(item) }}%</span>
            </p>
            <p class="mt-1 text-xs text-gray-400">
              Stock disponible: {{ item.stockMaximo }}
            </p>
          </div>

          <!-- Controles -->
          <div class="flex flex-col items-center gap-3 sm:items-end">
            <div class="flex items-center gap-1 rounded-lg border border-gray-300 bg-white">
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                :disabled="item.cantidad <= 1"
                @click="decrementar(item)"
              >
                <Minus class="h-3.5 w-3.5" />
              </button>
              <input
                :value="item.cantidad"
                @input="(e) => cambiarCantidadManual(item, e)"
                type="number"
                min="1"
                :max="item.stockMaximo"
                class="h-8 w-12 border-0 text-center text-sm font-bold text-gray-900 focus:outline-none"
              />
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                :disabled="item.stockMaximo && item.cantidad >= item.stockMaximo"
                @click="incrementar(item)"
              >
                <Plus class="h-3.5 w-3.5" />
              </button>
            </div>

            <p class="text-base font-extrabold text-gray-900">
              <span v-if="tieneDescuento(item)" class="mr-1 text-xs font-normal text-gray-400 line-through">{{ formatearCOP(item.precioOriginal * item.cantidad) }}</span>
              {{ formatearCOP(item.precio * item.cantidad) }}
            </p>

            <button
              type="button"
              class="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700 transition"
              @click="eliminar(item)"
            >
              <Trash2 class="h-3.5 w-3.5" /> Quitar
            </button>
          </div>
        </article>
      </div>

      <!-- Panel resumen -->
      <aside class="lg:col-span-1">
        <div class="sticky top-8 space-y-4">

          <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 class="text-sm font-bold uppercase tracking-wide text-gray-700 mb-4">
              Resumen del pedido
            </h2>

            <dl class="space-y-3 text-sm">
              <div class="flex justify-between">
                <dt class="text-gray-500">Prendas</dt>
                <dd class="font-semibold text-gray-900">{{ totalPrendas }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500">Subtotal</dt>
                <dd class="font-semibold text-gray-900">{{ formatearCOP(totalOriginal) }}</dd>
              </div>
              <div v-if="totalAhorro > 0" class="flex justify-between">
                <dt class="text-emerald-600">Descuento</dt>
                <dd class="font-semibold text-emerald-600">- {{ formatearCOP(totalAhorro) }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500">Envío</dt>
                <dd class="text-xs font-semibold text-emerald-600">Se coordina tras el pago</dd>
              </div>

              <div class="border-t border-gray-100 pt-3 flex justify-between items-baseline">
                <dt class="font-bold text-gray-700">Total a pagar</dt>
                <dd class="text-xl font-extrabold text-corporativo-rosa">
                  {{ formatearCOP(totalMonto) }}
                </dd>
              </div>
            </dl>

            <!-- Datos de envío para crear el pedido en el backend -->
            <div class="mt-4 space-y-2.5 rounded-xl border border-gray-200 bg-gray-50 p-3.5">
              <div class="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                <Lock class="h-3.5 w-3.5 text-emerald-600" />
                Datos de entrega
              </div>
              <input
                v-model="datosCliente.nombre"
                type="text"
                placeholder="Nombre de quien recibe *"
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs focus:border-corporativo-rosa focus:outline-none"
              />
              <input
                v-model="datosCliente.telefono"
                type="tel"
                placeholder="Celular de contacto *"
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs focus:border-corporativo-rosa focus:outline-none"
              />
              <input
                v-model="datosCliente.ciudad"
                type="text"
                maxlength="100"
                list="checkout-ciudades"
                autocomplete="address-level2"
                placeholder="Ciudad de entrega *"
                class="w-full rounded-lg border bg-white px-3 py-2 text-xs focus:border-corporativo-rosa focus:outline-none"
                :class="validacionCiudad.noEncontrada.value || validacionCiudad.formatoInvalido.value ? 'border-red-400' : 'border-gray-300'"
              />
              <datalist id="checkout-ciudades">
                <option v-for="c in sugerenciasCiudad" :key="c" :value="c" />
              </datalist>
              <p v-if="validacionCiudad.formatoInvalido.value" class="text-[11px] font-medium text-red-600">
                Ingresa un nombre de ciudad válido.
              </p>
              <p v-else-if="validacionCiudad.noEncontrada.value" class="text-[11px] font-medium text-red-600">
                No encontramos esa ciudad. Selecciónala de la lista de sugerencias.
              </p>
              <input
                v-model="datosCliente.departamento"
                type="text"
                placeholder="Departamento"
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs focus:border-corporativo-rosa focus:outline-none"
              />
              <input
                v-model="datosCliente.direccion"
                type="text"
                placeholder="Dirección exacta de entrega *"
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs focus:border-corporativo-rosa focus:outline-none"
              />
            </div>

            <button
              type="button"
              :disabled="items.length === 0 || cargandoPago"
              class="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-corporativo-rosa px-5 py-3.5 font-bold text-white shadow-md transition hover:bg-corporativo-rosa-hover focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
              @click="pagarConWompi"
            >
              <Loader2 v-if="cargandoPago" class="h-5 w-5 animate-spin" />
              <CreditCard v-else class="h-5 w-5" />
              <span v-if="cargandoPago">Procesando pago...</span>
              <span v-else>Pagar con Wompi</span>
            </button>

            <button
              type="button"
              class="mt-2.5 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
              @click="enviarWhatsApp"
            >
              <MessageCircle class="h-4 w-4" />
              Consultar por WhatsApp
            </button>

            <!-- Mensaje de error del pago -->
            <div
              v-if="errorPago"
              class="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
            >
              {{ errorPago }}
            </div>

            <p class="mt-3 text-xs leading-5 text-gray-500 text-center">
              Pago seguro procesado por Wompi. Acepta tarjetas, PSE y Nequi.
            </p>
          </div>

          <button
            type="button"
            class="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
            @click="seguirComprando"
          >
            <ArrowLeft class="h-4 w-4" />
            Seguir comprando
          </button>
        </div>
      </aside>
    </div>

    <!-- Productos relacionados -->
    <section v-if="items.length > 0 && !cargandoRelacionados && relacionados.length > 0" class="mt-16">
      <div class="mb-6">
        <h2 class="text-2xl font-extrabold tracking-tight text-gray-900">
          También te puede interesar
        </h2>
      </div>

      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <article
          v-for="producto in relacionados"
          :key="producto.id"
          class="group cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          @click="verProducto(producto.id)"
        >
          <div class="relative aspect-[4/5] overflow-hidden bg-gray-100">
            <span v-if="producto.tieneDescuento" class="absolute top-2 left-2 z-10 rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
              -{{ producto.porcentajeDescuento }}%
            </span>
            <img
              v-if="producto.imagen"
              :src="producto.imagen"
              :alt="producto.nombre"
              class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              loading="lazy"
              @error="(e) => { e.target.onerror = null; e.target.src = IMAGEN_RESPALDO; }"
            />
            <div v-else class="flex h-full w-full items-center justify-center text-gray-300">
              <ShoppingBag class="h-12 w-12" :stroke-width="1" />
            </div>
          </div>

          <div class="p-3">
            <h3 class="text-sm font-bold text-gray-900 line-clamp-2 min-h-[2.5rem]">
              {{ producto.nombre }}
            </h3>
            <div class="mt-2 flex items-center gap-2">
              <p class="text-base font-extrabold text-corporativo-rosa">
                {{ formatearCOP(producto.precio) }}
              </p>
              <s v-if="producto.tieneDescuento" class="text-xs text-gray-400">
                {{ formatearCOP(producto.precioOriginal) }}
              </s>
            </div>
            <span class="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-gray-400 group-hover:text-corporativo-rosa transition">
              Ver producto <ArrowRight class="h-3 w-3" />
            </span>
          </div>
        </article>
      </div>
    </section>

    <!-- Modal Visor y Descarga de Factura Electrónica -->
    <VisorFacturaFashion
      :abierto="visorFacturaAbierto"
      :factura="facturaParaVisor"
      :pedido="pedidoParaVisor"
      @cerrar="visorFacturaAbierto = false"
    />

  </div>
</template>
