<script setup>
import {
  Users,
  BadgeCheck,
  ShieldCheck,
  UserCheck,
  UserX
} from 'lucide-vue-next';

const props = defineProps({
  totalClientes: { type: Number, default: 0 },
  totalEmpleados: { type: Number, default: 0 },
  totalAdmins: { type: Number, default: 0 },
  totalActivos: { type: Number, default: 0 },
  totalInactivos: { type: Number, default: 0 },
  pestanaActiva: { type: String, default: 'clientes' },
  filtroRol: { type: String, default: '' },
  filtroEstado: { type: String, default: '' }
});

const emit = defineEmits(['filtrar']);
</script>

<template>
  <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
    <!-- Total Clientes -->
    <button
      type="button"
      class="group relative text-left overflow-hidden rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
      :class="pestanaActiva === 'clientes' ? 'border-emerald-500 ring-1 ring-emerald-500/30' : 'border-gray-200/80 hover:border-emerald-300'"
      @click="emit('filtrar', { pestana: 'clientes', rol: '', estado: '' })"
    >
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider group-hover:text-emerald-700 transition">Clientes</span>
        <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition">
          <Users class="h-4 w-4" />
        </div>
      </div>
      <p class="mt-2 text-2xl font-black text-gray-900 tracking-tight">{{ totalClientes }}</p>
      <p class="mt-0.5 text-xs text-gray-400 group-hover:text-emerald-600 transition">Directorio registrado</p>
    </button>

    <!-- Total Empleados -->
    <button
      type="button"
      class="group relative text-left overflow-hidden rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      :class="pestanaActiva === 'empleados' ? 'border-indigo-500 ring-1 ring-indigo-500/30' : 'border-gray-200/80 hover:border-indigo-300'"
      @click="emit('filtrar', { pestana: 'empleados', rol: '', estado: '' })"
    >
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Empleados</span>
        <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition">
          <BadgeCheck class="h-4 w-4" />
        </div>
      </div>
      <p class="mt-2 text-2xl font-black text-indigo-700 tracking-tight">{{ totalEmpleados }}</p>
      <p class="mt-0.5 text-xs text-indigo-600/70">Equipo comercial</p>
    </button>

    <!-- Administradores -->
    <button
      type="button"
      class="group relative text-left overflow-hidden rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-corporativo-rosa/20"
      :class="pestanaActiva === 'usuarios' && filtroRol === 'admin' ? 'border-corporativo-rosa ring-1 ring-corporativo-rosa/30' : 'border-pink-100 bg-white hover:border-pink-300'"
      @click="emit('filtrar', { pestana: 'usuarios', rol: 'admin', estado: '' })"
    >
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-corporativo-rosa uppercase tracking-wider">Admins</span>
        <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-pink-50 text-corporativo-rosa group-hover:bg-pink-100 transition">
          <ShieldCheck class="h-4 w-4" />
        </div>
      </div>
      <p class="mt-2 text-2xl font-black text-corporativo-rosa tracking-tight">{{ totalAdmins }}</p>
      <p class="mt-0.5 text-xs text-pink-600/70">Control total</p>
    </button>

    <!-- Usuarios Activos -->
    <button
      type="button"
      class="group relative text-left overflow-hidden rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500/20"
      :class="pestanaActiva === 'usuarios' && filtroEstado === 'activos' ? 'border-teal-500 ring-1 ring-teal-500/30' : 'border-teal-100 hover:border-teal-300'"
      @click="emit('filtrar', { pestana: 'usuarios', rol: '', estado: 'activos' })"
    >
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-teal-700 uppercase tracking-wider">Activos</span>
        <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-600 group-hover:bg-teal-100 transition">
          <UserCheck class="h-4 w-4" />
        </div>
      </div>
      <p class="mt-2 text-2xl font-black text-teal-600 tracking-tight">{{ totalActivos }}</p>
      <p class="mt-0.5 text-xs text-teal-600/70">Con acceso</p>
    </button>

    <!-- Cuentas Inactivas -->
    <button
      type="button"
      class="group relative text-left overflow-hidden rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500/20"
      :class="pestanaActiva === 'usuarios' && filtroEstado === 'inactivos' ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-rose-100 hover:border-rose-300'"
      @click="emit('filtrar', { pestana: 'usuarios', rol: '', estado: 'inactivos' })"
    >
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-rose-700 uppercase tracking-wider">Inactivos</span>
        <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 group-hover:bg-rose-100 transition">
          <UserX class="h-4 w-4" />
        </div>
      </div>
      <p class="mt-2 text-2xl font-black text-rose-600 tracking-tight">{{ totalInactivos }}</p>
      <p class="mt-0.5 text-xs text-rose-600/70">Deshabilitados</p>
    </button>
  </div>
</template>
