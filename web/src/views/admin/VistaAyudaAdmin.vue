<script setup>
// RNF02: zona de ayuda para que el personal nuevo aprenda a usar el panel.
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import {
  BellRing,
  Boxes,
  ChevronDown,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  Receipt,
  Scissors,
  Search,
  Shirt,
  Truck,
  UsersRound,
} from 'lucide-vue-next';
import { useAutenticacionStore } from '@/stores/autenticacion';

const authStore = useAutenticacionStore();
const busqueda = ref('');
const abierta = ref('primeros-pasos');

const GUIAS = [
  {
    id: 'primeros-pasos',
    titulo: 'Primeros pasos',
    icono: LifeBuoy,
    ruta: '/admin',
    resumen: 'Cómo está organizado el panel y qué puede hacer cada rol.',
    pasos: [
      'El menú lateral agrupa los módulos. En celular se abre con el botón de tres líneas.',
      'El Panel de control muestra ventas, producción e inventario del periodo elegido; puedes descargarlo en Excel o PDF.',
      'Empleado: opera ventas, pedidos, inventario y producción. Administrador: además gestiona usuarios, umbrales de alertas y la bitácora.',
      'Siempre debe existir al menos un administrador en el sistema.',
      'Los cambios que hace otra persona aparecen solos en tu pantalla (sincronización en tiempo real).',
    ],
  },
  {
    id: 'panel',
    titulo: 'Panel de control y reportes',
    icono: LayoutDashboard,
    ruta: '/admin',
    resumen: 'Indicadores, gráficas y exportación de reportes.',
    pasos: [
      'Elige el periodo (3, 6 o 12 meses) en la parte superior.',
      'Las ventas se separan en tienda física (POS) y tienda en línea.',
      'La gráfica de producción compara unidades planificadas con unidades terminadas.',
      'Usa los botones Excel o PDF para descargar el reporte con los mismos datos que ves.',
    ],
  },
  {
    id: 'inventario',
    titulo: 'Inventario y kárdex',
    icono: Boxes,
    ruta: '/admin/inventario',
    resumen: 'Existencias por talla, movimientos y anulaciones.',
    pasos: [
      'Existencias en vivo: stock actual de cada talla con acciones rápidas de entrada, salida o ajuste.',
      'Kárdex: historial de movimientos. Filtra por producto, material, usuario, tipo, estado y rango de fechas.',
      'Los movimientos no se borran: si hubo un error se anulan y el saldo se recalcula.',
      'Los movimientos generados por una orden de producción no se anulan a mano: se revierten cancelando la orden.',
      'Descarga existencias o el kárdex filtrado en Excel o PDF.',
    ],
  },
  {
    id: 'alertas',
    titulo: 'Alertas automáticas de stock',
    icono: BellRing,
    ruta: '/admin/inventario',
    resumen: 'Niveles BAJO, CRÍTICO y AGOTADO con aviso por correo.',
    pasos: [
      'Cada venta, pedido, confección o ajuste revisa el stock y crea o actualiza la alerta correspondiente.',
      'BAJO: el stock llegó al mínimo. CRÍTICO: llegó al umbral crítico. AGOTADO: no quedan unidades.',
      'Cuando repones por encima del mínimo, la alerta se resuelve sola. También puedes marcarla como gestionada.',
      'En "Umbrales" (pestaña Alertas del inventario) administración define mínimos, críticos, correo del responsable y si el aviso es inmediato o un resumen diario.',
    ],
  },
  {
    id: 'produccion',
    titulo: 'Producción y costos',
    icono: Scissors,
    ruta: '/admin/produccion',
    resumen: 'Fórmulas, calculadora de costos y órdenes de producción.',
    pasos: [
      'Registra materias primas y proveedores; luego arma la fórmula (insumos por prenda) de cada producto.',
      'La calculadora estima costo por lote, desperdicio, margen y precio sugerido con o sin IVA.',
      'Generar una orden solo la planifica: los insumos todavía no se descuentan.',
      'Al completar la orden reparte el lote por talla. En ese momento se descuentan los insumos y las prendas entran al kárdex.',
      'Una orden completada queda bloqueada. Solo se eliminan órdenes canceladas.',
    ],
  },
  {
    id: 'ventas',
    titulo: 'Punto de venta (POS)',
    icono: Receipt,
    ruta: '/admin/ventas',
    resumen: 'Ventas de mostrador, cambio y comprobantes.',
    pasos: [
      'Agrega prendas por talla, elige el medio de pago y registra la venta: el stock se descuenta al instante.',
      'Los precios incluyen IVA del 19 %; la factura muestra la base gravable y el impuesto por separado.',
      'Una venta no se edita: si hubo un error, cancélala y el stock vuelve a bodega.',
    ],
  },
  {
    id: 'pedidos',
    titulo: 'Pedidos en línea y facturación',
    icono: Truck,
    ruta: '/admin/pedidos',
    resumen: 'Despachos, guías y facturas electrónicas.',
    pasos: [
      'Los pedidos pagados con Wompi llegan como "Pagado". Cámbialos a preparación, enviado o entregado.',
      'Registra la transportadora y el número de guía al despachar.',
      'Cada pedido y cada venta POS genera su factura con consecutivo único; puedes verla e imprimirla o descargarla en PDF.',
      'La carga masiva de facturas acepta archivos .xlsx o .csv.',
    ],
  },
  {
    id: 'prendas',
    titulo: 'Gestión de prendas',
    icono: Shirt,
    ruta: '/admin/prendas',
    resumen: 'Catálogo, tallas, fotos y promociones.',
    pasos: [
      'Crea la prenda, sus tallas (variantes) y sube las fotografías.',
      'Una prenda con movimientos de inventario o ventas no se puede eliminar: desactívala para ocultarla de la tienda.',
      'Las promociones vigentes se aplican solas en la tienda y en el checkout.',
    ],
  },
  {
    id: 'pagos',
    titulo: 'Pagos y dispersión',
    icono: CreditCard,
    ruta: '/admin/pagos',
    resumen: 'Conciliación de Wompi, efectivo y transferencias.',
    pasos: [
      'Revisa en paralelo los ingresos por cada canal de pago.',
      'Si un pago no se confirmó, el stock reservado se libera automáticamente a los 15 minutos.',
    ],
  },
  {
    id: 'usuarios',
    titulo: 'Clientes, usuarios y roles',
    icono: UsersRound,
    ruta: '/admin/seguridad',
    resumen: 'Directorio de clientes, empleados y último acceso.',
    pasos: [
      'Toda cuenta nueva nace como cliente.',
      'El administrador asigna los roles cliente, empleado y administrador.',
      'La columna "Último acceso" muestra cuándo ingresó cada persona por última vez.',
      'Desactivar una cuenta cierra sus sesiones abiertas.',
    ],
  },
  {
    id: 'bitacora',
    titulo: 'Bitácora de auditoría',
    icono: ClipboardList,
    ruta: '/admin/seguridad/auditoria',
    soloAdmin: true,
    resumen: 'Quién cambió qué y cuándo.',
    pasos: [
      'Registra creaciones, cambios, anulaciones e inicios de sesión con fecha, hora, usuario e IP.',
      'Filtra por módulo o por usuario para rastrear una operación.',
    ],
  },
  {
    id: 'mensajes',
    titulo: 'Mensajes de contacto',
    icono: Mail,
    ruta: '/admin/mensajes',
    resumen: 'Bandeja del formulario de contacto de la tienda.',
    pasos: [
      'Los clientes escriben desde la página Contacto de la tienda; el mensaje llega aquí y al correo de la tienda.',
      'Marca cada mensaje como leído o respondido para que el equipo sepa cuáles siguen pendientes.',
    ],
  },
];

const guiasVisibles = computed(() => {
  const termino = busqueda.value.trim().toLowerCase();
  return GUIAS
    .filter((g) => !g.soloAdmin || authStore.esAdmin)
    .filter((g) => !termino || [g.titulo, g.resumen, ...g.pasos].some((t) => t.toLowerCase().includes(termino)));
});

function alternar(id) {
  abierta.value = abierta.value === id ? '' : id;
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6">
    <header class="rounded-3xl border border-tienda-borde bg-white p-6 sm:p-8">
      <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-tienda-gris">Centro de ayuda</p>
      <h1 class="mt-2 text-2xl font-semibold sm:text-3xl">¿Cómo usar el panel de FashionStyle?</h1>
      <p class="mt-2 max-w-2xl text-sm text-tienda-gris">
        Guías cortas de cada módulo para el personal nuevo. Busca una tarea o abre la sección que necesites.
      </p>
      <div class="relative mt-5 max-w-md">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tienda-gris" />
        <input
          v-model="busqueda"
          type="search"
          maxlength="80"
          placeholder="Ej. anular movimiento, completar orden, rol..."
          class="w-full rounded-xl border border-tienda-borde bg-tienda-crema py-2.5 pl-9 pr-3 text-sm focus:border-tienda-negro focus:bg-white focus:outline-none"
        />
      </div>
    </header>

    <p v-if="!guiasVisibles.length" class="rounded-2xl border border-tienda-borde bg-white p-6 text-center text-sm text-tienda-gris">
      No encontramos guías para "{{ busqueda }}".
    </p>

    <section class="space-y-3">
      <article
        v-for="guia in guiasVisibles"
        :key="guia.id"
        class="overflow-hidden rounded-2xl border border-tienda-borde bg-white"
      >
        <button
          type="button"
          class="flex w-full items-center gap-3 px-5 py-4 text-left"
          :aria-expanded="abierta === guia.id || Boolean(busqueda)"
          @click="alternar(guia.id)"
        >
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-tienda-arena-suave text-tienda-pizarra">
            <component :is="guia.icono" class="h-5 w-5" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-semibold text-tienda-negro">{{ guia.titulo }}</span>
            <span class="block truncate text-xs text-tienda-gris">{{ guia.resumen }}</span>
          </span>
          <ChevronDown class="h-4 w-4 shrink-0 text-tienda-gris transition" :class="{ 'rotate-180': abierta === guia.id || busqueda }" />
        </button>
        <div v-if="abierta === guia.id || busqueda" class="border-t border-tienda-borde px-5 py-4">
          <ol class="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-tienda-texto">
            <li v-for="paso in guia.pasos" :key="paso">{{ paso }}</li>
          </ol>
          <RouterLink :to="guia.ruta" class="mt-4 inline-flex text-xs font-semibold text-tienda-pizarra hover:underline">
            Ir a {{ guia.titulo.toLowerCase() }} →
          </RouterLink>
        </div>
      </article>
    </section>
  </div>
</template>
