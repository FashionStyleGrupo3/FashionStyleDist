<script setup>
// -> Componente DisenoAdmin
import { ref, computed, watch } from 'vue';
import { RouterView, RouterLink, useRoute, useRouter } from 'vue-router';
import {
  LayoutDashboard,
  Boxes,
  Scissors,
  Shirt,
  ShoppingBag,
  CreditCard,
  Truck,
  Receipt,
  UserRound,
  UsersRound,
  ClipboardList,
  LifeBuoy,
  Mail,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X
} from 'lucide-vue-next';
import AvatarUsuario from '@/components/perfil/AvatarUsuario.vue';
import { useAutenticacionStore } from '@/stores/autenticacion';
import { useRecargaAutomatica } from '@/composables/useRecargaAutomatica';

const route = useRoute();
const router = useRouter();
const authStore = useAutenticacionStore();

// Si un admin cambia el rol de esta persona, se actualiza solo (sin recargar).
useRecargaAutomatica(() => authStore.refrescarSesion(), { recursos: ['usuarios'], intervaloSondeo: 30000 });

// Si pierde el acceso al panel (p. ej. empleado -> cliente), sale del admin.
watch(
  () => authStore.esPersonal,
  (esPersonal) => {
    if (!esPersonal) router.replace('/');
  }
);

// Estado reactivo para minimizar o expandir la barra lateral
const sidebarMinimizada = ref(false);
const sidebarMovilAbierta = ref(false);

function alternarSidebar() {
  sidebarMinimizada.value = !sidebarMinimizada.value;
}

function alternarSidebarMovil() {
  sidebarMovilAbierta.value = !sidebarMovilAbierta.value;
}

watch(() => route.path, () => {
  sidebarMovilAbierta.value = false;
});

// Modulos operativos principales sin redundancia
const enlaces = [
  { nombre: 'Panel Control', ruta: '/admin', icono: LayoutDashboard },
  { nombre: 'Inventario / Kárdex', ruta: '/admin/inventario', icono: Boxes },
  { nombre: 'Pedidos y Facturas', ruta: '/admin/pedidos', icono: Truck },
  { nombre: 'Historial de Ventas', ruta: '/admin/ventas', icono: Receipt },
  { nombre: 'Pagos y Dispersión', ruta: '/admin/pagos', icono: CreditCard },
  { nombre: 'Producción / Costos', ruta: '/admin/produccion', icono: Scissors },
  { nombre: 'Gestión Prendas', ruta: { name: 'gestion-prendas' }, rutaNombre: 'gestion-prendas', icono: Shirt },
  { nombre: 'Clientes y Usuarios', ruta: '/admin/seguridad', icono: UsersRound },
  { nombre: 'Bitácora', ruta: '/admin/seguridad/auditoria', icono: ClipboardList, soloAdmin: true },
  { nombre: 'Mensajes', ruta: '/admin/mensajes', icono: Mail },
  { nombre: 'Centro de ayuda', ruta: '/admin/ayuda', icono: LifeBuoy },
  { nombre: 'Mi Cuenta', ruta: '/admin/cuenta', icono: UserRound },
];

const enlacesVisibles = computed(() => {
  return enlaces.filter(enlace => !enlace.soloAdmin || authStore.esAdmin);
});

const tituloSeccionActual = computed(() => {
  if (route.path === '/admin') return 'Panel de Control';
  if (route.path.includes('/inventario')) return 'Inventario / Kárdex';
  if (route.path.includes('/ventas')) return 'Historial automático de Ventas';
  if (route.path.includes('/pedidos')) return 'Pedidos Online y Facturación automática';
  if (route.path.includes('/produccion')) return 'Producción / Costos';
  if (route.path.includes('/prendas')) return 'Gestión de Prendas';
  if (route.path.includes('/seguridad/auditoria')) return 'Bitácora de auditoría';
  if (route.path.includes('/seguridad')) return 'Clientes y Usuarios';
  if (route.path.includes('/pagos')) return 'Control de Pagos y Dispersión';
  if (route.path.includes('/cuenta')) return 'Configuración de cuenta';
  if (route.path.includes('/ayuda')) return 'Centro de ayuda';
  if (route.path.includes('/mensajes')) return 'Mensajes de contacto';
  return 'Administración';
});
</script>

<template>
  <div class="min-h-screen flex bg-tienda-crema font-tienda text-tienda-texto admin-tienda">
    <button
      v-if="sidebarMovilAbierta"
      type="button"
      class="fixed inset-0 z-40 bg-black/40 md:hidden"
      aria-label="Cerrar menú de administración"
      @click="sidebarMovilAbierta = false"
    />
    <aside
      class="fixed inset-y-0 left-0 z-50 flex w-64 flex-col justify-between bg-[#56657a] shrink-0 transition-transform duration-300 ease-in-out md:relative md:inset-auto md:z-auto md:translate-x-0"
      :class="[sidebarMinimizada ? 'md:w-20' : 'md:w-64', sidebarMovilAbierta ? 'translate-x-0' : '-translate-x-full md:translate-x-0']"
    >
      <div>
        <div class="h-16 flex items-center justify-between px-4">
          <RouterLink to="/admin" class="flex items-center gap-2 overflow-hidden">
            <span v-if="!sidebarMinimizada" class="text-2xl font-semibold tracking-tight text-white truncate">FashionStyle</span>
            <span v-else class="text-lg font-bold text-white mx-auto">FS</span>
          </RouterLink>
          <button type="button" @click="alternarSidebarMovil"
            class="grid h-9 w-9 place-items-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors md:hidden"
            aria-label="Cerrar menú de administración">
            <X class="h-5 w-5" />
          </button>
          <button type="button" @click="alternarSidebar"
            class="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            :class="sidebarMovilAbierta ? 'hidden' : 'hidden md:block'"
            :title="sidebarMinimizada ? 'Expandir barra lateral' : 'Minimizar barra lateral'">
            <ChevronRight v-if="sidebarMinimizada" class="w-5 h-5" />
            <ChevronLeft v-else class="w-5 h-5" />
          </button>
        </div>

        <nav class="p-3 space-y-1">
          <RouterLink
              v-for="enlace in enlacesVisibles"
              :key="enlace.nombre"
              :to="enlace.ruta"
              class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              :class="[
                (enlace.rutaNombre ? route.name === enlace.rutaNombre : route.path === enlace.ruta)
                  ? 'bg-[#414e61] text-white'
                  : 'text-white hover:bg-[#414e61]',
                sidebarMinimizada ? 'justify-center px-0' : ''
              ]"
              :title="enlace.nombre"
            >
            <component :is="enlace.icono" class="w-5 h-5 shrink-0" />
            <span v-if="!sidebarMinimizada" class="truncate">{{ enlace.nombre }}</span>
          </RouterLink>
        </nav>
      </div>

      <div class="p-3">
        <RouterLink to="/"
          class="flex items-center gap-2.5 py-2.5 rounded-full text-xs font-semibold text-tienda-negro bg-tienda-crema border border-tienda-borde hover:bg-tienda-arena-suave transition-colors"
          :class="sidebarMinimizada ? 'justify-center px-0' : 'px-3.5'"
          title="Ir al escaparate de la tienda pública">
          <ShoppingBag class="w-4 h-4 shrink-0" />
          <span v-if="!sidebarMinimizada" class="truncate">Ver Tienda</span>
        </RouterLink>
      </div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0 overflow-y-auto">
      <header class="sticky top-0 z-30 bg-[#56657a] border-b border-tienda-borde">
        <div class="h-16 px-2.5 sm:px-6 lg:px-8 flex items-center justify-between gap-2">
          <div class="flex min-w-0 items-center gap-2">
            <button
              type="button"
              class="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white/90 hover:bg-white/10 md:hidden"
              aria-label="Abrir menú de administración"
              @click="alternarSidebarMovil"
            >
              <Menu class="h-5 w-5" />
            </button>
            <h2 class="admin-header__title min-w-0 truncate text-sm sm:text-base lg:text-lg font-semibold tracking-tight">{{ tituloSeccionActual }}</h2>
          </div>
          <div class="flex shrink-0 items-center gap-1 sm:gap-2">
            <RouterLink to="/"
              class="admin-header__action">
              <ShoppingBag class="w-4 h-4" /><span class="hidden sm:inline">Ir a la Tienda</span>
            </RouterLink>
           <RouterLink to="/admin/cuenta"
              class="admin-header__action">
              <AvatarUsuario
                v-if="authStore.usuario?.foto_perfil"
                :nombre="authStore.usuario?.nombre"
                :foto="authStore.usuario.foto_perfil"
                clases="h-6 w-6 text-xs"
              />
              <div v-else class="admin-header__avatar">
                {{ (authStore.usuario?.nombre || 'A').charAt(0).toUpperCase() }}
              </div>
              <span class="hidden md:inline">Modificar Perfil</span>
            </RouterLink>

            <button type="button" @click="authStore.cerrarSesion()"
              class="admin-header__action">
              <LogOut class="w-4 h-4" /><span class="hidden md:inline">Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>

      <main class="p-6 sm:p-8 flex-1 bg-tienda-crema">
      <RouterView />
    </main>
    </div>
  </div>
</template>

<style>
.admin-tienda h1, .admin-tienda h2, .admin-tienda h3, .admin-tienda h4 {
  font-family: var(--fs-fuente);
  color: var(--fs-negro);
}

.admin-tienda header h2.admin-header__title {
  color: #fff;
}

.admin-header__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  height: 36px;
  padding: 0 10px;
  border: 1px solid rgba(255, 255, 255, 0.36);
  border-radius: 8px;
  background: transparent;
  color: #fff;
  font-family: var(--fs-fuente);
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
  text-decoration: none;
  white-space: nowrap;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

@media (max-width: 639px) {
  .admin-header__action {
    width: 36px;
    padding: 0;
  }
}

.admin-header__action:hover {
  border-color: rgba(255, 255, 255, 0.62);
  background: rgba(255, 255, 255, 0.12);
}

.admin-header__action:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

.admin-header__avatar {
  display: flex;
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}
</style>