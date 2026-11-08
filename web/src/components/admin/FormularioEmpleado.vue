<script setup>
import { reactive, ref } from 'vue';
import {
  X,
  UserPlus,
  Eye,
  EyeOff,
  User,
  Mail,
  Phone,
  Lock,
  BadgeCheck,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-vue-next';
import { filtrarCampo } from '@/utils/validacionCampos';
import RequisitosPassword from '@/components/autenticacion/RequisitosPassword.vue';
import { passwordEsSegura } from '@/utils/validarPassword';

defineProps({
  guardando: { type: Boolean, default: false },
  errorServidor: { type: String, default: '' }
});

const emit = defineEmits(['cerrar', 'crear']);

const formulario = reactive({
  nombre: '',
  correo: '',
  telefono: '',
  password: '',
  password_confirmation: '',
  activo: true,
  rol: 'empleado' // 'empleado' | 'admin'
});

const errores = reactive({});
const verPassword = ref(false);

function filtrarFormulario(campo, tipo, limite, evento) {
  const valor = filtrarCampo(evento.target.value, tipo, limite);
  formulario[campo] = valor;
  evento.target.value = valor;
}

function validar() {
  Object.keys(errores).forEach((k) => delete errores[k]);

  if (!formulario.nombre.trim()) {
    errores.nombre = 'El nombre completo es obligatorio.';
  }
  if (!/^\S+@\S+\.\S+$/.test(formulario.correo)) {
    errores.correo = 'Ingresa un correo electrónico corporativo o personal válido.';
  }
  if (formulario.telefono && formulario.telefono.length > 20) {
    errores.telefono = 'El teléfono no puede superar 20 dígitos.';
  }
  if (!passwordEsSegura(formulario.password)) {
    errores.password = 'La contraseña debe cumplir con los requisitos mínimos de seguridad.';
  }
  if (formulario.password !== formulario.password_confirmation) {
    errores.password_confirmation = 'Las contraseñas ingresadas no coinciden.';
  }

  return Object.keys(errores).length === 0;
}

function enviar() {
  if (!validar()) return;
  emit('crear', {
    nombre: formulario.nombre.trim(),
    correo: formulario.correo.trim(),
    telefono: formulario.telefono.trim() || null,
    password: formulario.password,
    password_confirmation: formulario.password_confirmation,
    activo: formulario.activo,
    rol: formulario.rol === 'admin' ? 'admin' : 'empleado'
  });
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
    @click.self="emit('cerrar')"
  >
    <div class="relative w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-gray-100 overflow-hidden my-6 transition-all">
      <!-- Encabezado con Icono y Botón Cerrar -->
      <div class="flex items-start justify-between border-b border-gray-100 p-6 bg-gradient-to-r from-pink-50/40 via-white to-gray-50/40">
        <div class="flex items-center gap-3.5">
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-100 text-corporativo-rosa shadow-sm ring-1 ring-pink-500/20">
            <UserPlus class="h-6 w-6" />
          </div>
          <div>
            <p class="text-[11px] font-black uppercase tracking-[0.2em] text-corporativo-rosa">
              Gestión de Equipo
            </p>
            <h2 class="text-xl font-black text-gray-900 font-titulos">
              Nuevo Miembro del Equipo
            </h2>
            <p class="text-xs text-gray-500">
              Registra credenciales y define el nivel de acceso en la plataforma.
            </p>
          </div>
        </div>

        <button
          type="button"
          class="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
          @click="emit('cerrar')"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Alerta de Error de Servidor -->
      <div v-if="errorServidor" class="mx-6 mt-4 flex items-center gap-2.5 rounded-2xl bg-red-50 p-3.5 text-xs font-semibold text-red-700 border border-red-100">
        <AlertCircle class="h-5 w-5 shrink-0 text-red-600" />
        <span>{{ errorServidor }}</span>
      </div>

      <!-- Formulario -->
      <form class="p-6 space-y-5" @submit.prevent="enviar">
        <!-- Selector Visual de Rol -->
        <div>
          <label class="mb-2 block text-xs font-black uppercase tracking-wider text-gray-700">
            Selecciona el Rol de Acceso
          </label>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <!-- Tarjeta Empleado -->
            <button
              type="button"
              class="relative flex flex-col items-start p-3.5 rounded-2xl border text-left transition cursor-pointer"
              :class="formulario.rol === 'empleado'
                ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                : 'border-gray-200 hover:border-gray-300 bg-white'"
              @click="formulario.rol = 'empleado'"
            >
              <div class="flex items-center justify-between w-full">
                <div class="flex items-center gap-2">
                  <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                    <BadgeCheck class="h-4 w-4" />
                  </div>
                  <span class="text-sm font-bold text-gray-900">Empleado</span>
                </div>
                <CheckCircle2
                  v-if="formulario.rol === 'empleado'"
                  class="h-4 w-4 text-indigo-600"
                />
              </div>
              <p class="mt-2 text-xs text-gray-500 leading-relaxed">
                Acceso a ventas POS, catálogo de prendas, existencias y pedidos.
              </p>
            </button>

            <!-- Tarjeta Administrador -->
            <button
              type="button"
              class="relative flex flex-col items-start p-3.5 rounded-2xl border text-left transition cursor-pointer"
              :class="formulario.rol === 'admin'
                ? 'border-corporativo-rosa bg-pink-50/50 ring-2 ring-corporativo-rosa/20'
                : 'border-gray-200 hover:border-gray-300 bg-white'"
              @click="formulario.rol = 'admin'"
            >
              <div class="flex items-center justify-between w-full">
                <div class="flex items-center gap-2">
                  <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-100 text-corporativo-rosa">
                    <ShieldCheck class="h-4 w-4" />
                  </div>
                  <span class="text-sm font-bold text-gray-900">Administrador</span>
                </div>
                <CheckCircle2
                  v-if="formulario.rol === 'admin'"
                  class="h-4 w-4 text-corporativo-rosa"
                />
              </div>
              <p class="mt-2 text-xs text-gray-500 leading-relaxed">
                Control absoluto sobre usuarios, finanzas, métricas y parámetros.
              </p>
            </button>
          </div>
        </div>

        <!-- Nombre Completo -->
        <div>
          <label class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">
            Nombre Completo
          </label>
          <div class="relative">
            <User class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              v-model="formulario.nombre"
              type="text"
              maxlength="100"
              class="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-corporativo-rosa focus:ring-2 focus:ring-corporativo-rosa/20 focus:outline-none transition"
              placeholder="Ej: Laura Sofía Ramírez"
              @input="filtrarFormulario('nombre', 'persona', 100, $event)"
            />
          </div>
          <p v-if="errores.nombre" class="mt-1 text-xs text-red-600 font-medium">{{ errores.nombre }}</p>
        </div>

        <!-- Correo y Teléfono -->
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">
              Correo Electrónico
            </label>
            <div class="relative">
              <Mail class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                v-model="formulario.correo"
                type="email"
                maxlength="254"
                class="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-corporativo-rosa focus:ring-2 focus:ring-corporativo-rosa/20 focus:outline-none transition"
                placeholder="usuario@fashionstyle.com"
                @input="(e) => { formulario.correo = String(e.target.value).replace(/\s+/g, '').slice(0, 254); e.target.value = formulario.correo; }"
              />
            </div>
            <p v-if="errores.correo" class="mt-1 text-xs text-red-600 font-medium">{{ errores.correo }}</p>
          </div>

          <div>
            <label class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">
              Teléfono Móvil <span class="font-normal text-gray-400">(opcional)</span>
            </label>
            <div class="relative">
              <Phone class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                v-model="formulario.telefono"
                type="tel"
                inputmode="tel"
                maxlength="20"
                class="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-corporativo-rosa focus:ring-2 focus:ring-corporativo-rosa/20 focus:outline-none transition"
                placeholder="3001234567"
                @input="filtrarFormulario('telefono', 'telefono', 20, $event)"
              />
            </div>
            <p v-if="errores.telefono" class="mt-1 text-xs text-red-600 font-medium">{{ errores.telefono }}</p>
          </div>
        </div>

        <!-- Contraseña y Confirmación -->
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">
              Contraseña
            </label>
            <div class="relative">
              <Lock class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                v-model="formulario.password"
                :type="verPassword ? 'text' : 'password'"
                maxlength="128"
                minlength="8"
                class="w-full rounded-xl border border-gray-200 pl-10 pr-10 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-corporativo-rosa focus:ring-2 focus:ring-corporativo-rosa/20 focus:outline-none transition"
                placeholder="Mínimo 8 caracteres"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                @click="verPassword = !verPassword"
              >
                <EyeOff v-if="verPassword" class="h-4 w-4" />
                <Eye v-else class="h-4 w-4" />
              </button>
            </div>
            <p v-if="errores.password" class="mt-1 text-xs text-red-600 font-medium">{{ errores.password }}</p>
          </div>

          <div>
            <label class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">
              Confirmar Contraseña
            </label>
            <div class="relative">
              <Lock class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                v-model="formulario.password_confirmation"
                :type="verPassword ? 'text' : 'password'"
                maxlength="128"
                minlength="8"
                class="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-corporativo-rosa focus:ring-2 focus:ring-corporativo-rosa/20 focus:outline-none transition"
                placeholder="Repite la contraseña"
              />
            </div>
            <p v-if="errores.password_confirmation" class="mt-1 text-xs text-red-600 font-medium">{{ errores.password_confirmation }}</p>
          </div>
        </div>

        <!-- Indicador de Requisitos de Contraseña -->
        <div class="rounded-2xl border border-gray-100 bg-gray-50/70 p-3">
          <p class="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Requisitos de Seguridad</p>
          <RequisitosPassword :password="formulario.password" />
        </div>

        <!-- Switch de Estado Activo -->
        <label class="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 bg-gray-50/50 cursor-pointer hover:bg-gray-50 transition">
          <input
            v-model="formulario.activo"
            type="checkbox"
            class="h-4 w-4 rounded border-gray-300 text-corporativo-rosa focus:ring-corporativo-rosa"
          />
          <div>
            <p class="text-xs font-bold text-gray-900">Habilitar cuenta inmediatamente</p>
            <p class="text-[11px] text-gray-500">El usuario podrá iniciar sesión con sus credenciales desde el primer momento.</p>
          </div>
        </label>

        <!-- Botones de Acción -->
        <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            class="rounded-xl border border-gray-200 px-5 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
            @click="emit('cerrar')"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="guardando"
            class="inline-flex items-center justify-center gap-2 rounded-xl bg-corporativo-rosa px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:opacity-95 disabled:opacity-50 transition"
          >
            <Loader2 v-if="guardando" class="h-4 w-4 animate-spin" />
            <UserPlus v-else class="h-4 w-4" />
            <span>
              {{ guardando ? 'Creando cuenta...' : (formulario.rol === 'admin' ? 'Crear Administrador' : 'Crear Empleado') }}
            </span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
