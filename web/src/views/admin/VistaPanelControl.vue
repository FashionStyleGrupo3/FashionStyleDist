<script setup>
// -> Componente VistaPanelControl
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import {
  Boxes,
  Scissors,
  Shirt,
  ShoppingBag,
  User,
  ArrowRight,
  CreditCard,
  Truck,
  Receipt,
  UsersRound,
  CalendarDays
} from 'lucide-vue-next';
import { useAutenticacionStore } from '@/stores/autenticacion';

const authStore = useAutenticacionStore();

const saludo = computed(() => {
  const hora = new Date().getHours();
  if (hora < 12) return 'Buenos dás';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
});

const primerNombre = computed(() => {
  const nombre = String(authStore.usuario?.nombre || '').trim();
  return nombre ? nombre.split(' ')[0] : 'Administrador';
});

const rolActual = computed(() => (authStore.esAdmin ? 'Administrador' : 'Equipo FashionStyle'));

const fechaHoy = computed(() => {
  const texto = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
});

const modulos = [
  {
    nombre: 'Inventario / Kárdex',
    descripcion: 'Control de entradas, salidas, alertas de bajo stock y existencias físicas en bodega.',
    estado: 'Auditorá en tiempo real',
    ruta: '/admin/inventario',
    icono: Boxes,
    color: 'bg-blue-50 text-blue-600 border-blue-100',
    etiqueta: 'Existencias'
  },
  {
    nombre: 'Punto de Venta (POS)',
    descripcion: 'Caja de mostrador rpida, cobro multimedio, comprobantes PDF e historial de ventas.',
    estado: 'Caja activa',
    ruta: '/admin/ventas',
    icono: Receipt,
    color: 'bg-rose-50 text-corporativo-rosa border-rose-100',
    etiqueta: 'Ventas POS'
  },
  {
    nombre: 'Pedidos y Facturación',
    descripcion: 'Despacho de pedidos online, asignacion de guás, emision de facturas y carga masiva Excel.',
    estado: 'Logística y DIAN',
    ruta: '/admin/pedidos',
    icono: Truck,
    color: 'bg-teal-50 text-teal-600 border-teal-100',
    etiqueta: 'Pedidos y Facturas'
  },
  {
    nombre: 'Gestión de Prendas',
    descripcion: 'Catálogo de prendas, variantes, promociones, precios de venta y fotografás.',
    estado: 'Catálogo activo',
    ruta: { name: 'gestion-prendas' },
    icono: Shirt,
    color: 'bg-pink-50 text-corporativo-rosa border-pink-100',
    etiqueta: 'Prendas'
  },
  {
    nombre: 'Producción / Costos',
    descripcion: 'Clculo de consumo de materia prima, mano de obra y mrgenes.',
    estado: 'Simulador dinmico',
    ruta: '/admin/produccion',
    icono: Scissors,
    color: 'bg-amber-50 text-amber-600 border-amber-100',
    etiqueta: 'Costos'
  },
  {
    nombre: 'Escaparate Público',
    descripcion: 'Visualizacion de la tienda en Linea y compras de clientes.',
    estado: 'Tienda en Linea',
    ruta: '/',
    icono: ShoppingBag,
    color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    etiqueta: 'Tienda'
  },
  {
    nombre: 'Plataforma de Pagos & Bancos',
    descripcion: 'Pasarela de recaudo en Linea y dispersion automática multi-cuenta.',
    estado: 'Split Payments activo',
    ruta: '/admin/pagos',
    icono: CreditCard,
    color: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    etiqueta: 'Pasarela'
  },
  {
    nombre: 'Clientes, Usuarios y Auditorá',
    descripcion: 'Directorio de clientes, gestion de roles y trazabilidad de cambios administrativos.',
    estado: 'Seguridad',
    ruta: '/admin/seguridad',
    icono: UsersRound,
    color: 'bg-rose-50 text-rose-600 border-rose-100',
    etiqueta: 'Seguridad'
  },
  {
    nombre: 'Configuracion de Cuenta',
    descripcion: 'Administraccion de perfil, datos de contacto y credenciales de acceso.',
    estado: 'Seguridad activa',
    ruta: '/admin/cuenta',
    icono: User,
    color: 'bg-purple-50 text-purple-600 border-purple-100',
    etiqueta: 'Perfil'
  }
];
</script>

<template>
  <div class="space-y-8">
    <!-- Encabezado de bienvenida -->
    <header class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-slate-700 px-6 py-8 text-white shadow-lg sm:px-10 sm:py-10">
      <div class="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/5"></div>
      <div class="pointer-events-none absolute -bottom-24 right-24 h-56 w-56 rounded-full bg-white/5"></div>

      <div class="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div class="max-w-2xl">
          <div class="mb-4 flex flex-wrap items-center gap-2">
            <span class="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-gray-200 ring-1 ring-white/15">
              <CalendarDays class="h-3.5 w-3.5" />
              {{ fechaHoy }}
            </span>
            <span class="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-gray-900">
              {{ rolActual }}
            </span>
          </div>

          <h1 class="text-3xl font-extrabold font-titulos leading-tight sm:text-4xl">
            {{ saludo }}, {{ primerNombre }}
          </h1>
          <p class="mt-2 text-sm leading-relaxed text-gray-300">
            Supervisa inventarios, costos de confección, pasarelas de pago y pedidos desde un solo lugar.
          </p>
        </div>

        <p class="text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-400">
          Panel de administraccion
        </p>
      </div>
    </header>

    <!-- Modulos principales en cuadricula limpia e interactiva -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <RouterLink
        v-for="mod in modulos"
        :key="mod.nombre"
        :to="mod.ruta"
        class="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-corporativo-rosa transition-all group flex flex-col justify-between relative overflow-hidden"
      >
        <div>
          <div class="flex items-center justify-between mb-4">
            <div :class="['w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 border', mod.color]">
              <component :is="mod.icono" class="w-6 h-6" />
            </div>
            <span class="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
              {{ mod.estado }}
            </span>
          </div>

          <h3 class="text-base font-bold text-gray-900 group-hover:text-corporativo-rosa transition-colors">
            {{ mod.nombre }}
          </h3>
          <p class="text-xs text-gray-500 mt-1.5 leading-relaxed">
            {{ mod.descripcion }}
          </p>
        </div>

        <div class="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-corporativo-rosa">
          <span>Ingresar a {{ mod.etiqueta }}</span>
          <ArrowRight class="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
        </div>
      </RouterLink>
    </div>
  </div>
</template>