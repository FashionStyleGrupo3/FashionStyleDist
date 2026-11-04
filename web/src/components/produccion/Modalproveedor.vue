<script setup>
import { ref, computed, watch } from 'vue';
import { X, Loader2 } from 'lucide-vue-next';
import { proveedoresApi, mensajeError } from '@/services/Produccionservicio';
import { useNotificacion } from '@/composables/useNotificacion';
import { filtrarCampo } from '@/utils/validacionCampos';

const props = defineProps({
  proveedor: { type: Object, default: null }, // null = crear
});
const emit = defineEmits(['cerrar', 'guardado']);

const { notificarExito, notificarError } = useNotificacion();

const vacio = () => ({ nombre: '', nit: '', contacto: '', telefono: '', email: '', direccion: '' });

const form = ref(vacio());
const guardando = ref(false);
const esEdicion = computed(() => !!props.proveedor);

function filtrarFormulario(campo, tipo, limite, evento) {
  const valor = filtrarCampo(evento.target.value, tipo, limite);
  form.value[campo] = valor;
  evento.target.value = valor;
}

watch(
  () => props.proveedor,
  (p) => {
    form.value = p
      ? {
          nombre: p.nombre ?? '',
          nit: p.nit ?? '',
          contacto: p.contacto ?? '',
          telefono: p.telefono ?? '',
          email: p.email ?? '',
          direccion: p.direccion ?? '',
        }
      : vacio();
  },
  { immediate: true },
);

async function guardar() {
  if (!form.value.nombre.trim()) {
    notificarError('El nombre del proveedor es obligatorio.');
    return;
  }

  // Los campos vacós se enván como null para no chocar con validaciones "nullable"
  const payload = Object.fromEntries(
    Object.entries(form.value).map(([k, v]) => [k, String(v).trim() === '' ? null : String(v).trim()]),
  );

  guardando.value = true;
  try {
    if (esEdicion.value) {
      await proveedoresApi.actualizar(props.proveedor.id, payload);
      notificarExito('Proveedor actualizado correctamente.');
    } else {
      await proveedoresApi.crear(payload);
      notificarExito('Proveedor creado correctamente.');
    }
    emit('guardado');
  } catch (error) {
    notificarError(mensajeError(error, 'No se pudo guardar el proveedor.'));
  } finally {
    guardando.value = false;
  }
}

const claseInput =
  'w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-corporativo-rosa/40 focus:border-corporativo-rosa';
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="emit('cerrar')">
      <form
        class="w-full max-w-lg rounded-2xl bg-white border border-gray-200 shadow-xl p-6 space-y-4"
        @submit.prevent="guardar"
      >
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ esEdicion ? 'Editar proveedor' : 'Nuevo proveedor' }}
          </h3>
          <button type="button" class="p-1 text-gray-400 hover:text-gray-600" @click="emit('cerrar')">
            <X class="h-5 w-5" />
          </button>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nombre / Razon social</label>
          <input v-model="form.nombre" type="text" maxlength="150" :class="claseInput" @input="filtrarFormulario('nombre', 'comercial', 150, $event)" />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">NIT</label>
            <input v-model="form.nit" type="text" maxlength="20" :class="claseInput" @input="(e)=>{ form.nit = String(e.target.value).replace(/[^A-Za-z0-9.-]/g,'').slice(0,20); e.target.value = form.nit; }" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Persona de contacto</label>
            <input v-model="form.contacto" type="text" maxlength="100" :class="claseInput" @input="filtrarFormulario('contacto', 'persona', 100, $event)" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">teléfono</label>
            <input v-model="form.telefono" type="tel" inputmode="tel" maxlength="20" :class="claseInput" @input="filtrarFormulario('telefono', 'telefono', 20, $event)" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Correo</label>
            <input v-model="form.email" type="email" maxlength="254" :class="claseInput" @input="(e)=>{ form.email = String(e.target.value).replace(/\s+/g,'').slice(0,254); e.target.value = form.email; }" />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Direccion</label>
          <input v-model="form.direccion" type="text" maxlength="180" :class="claseInput" @input="filtrarFormulario('direccion', 'direccion', 180, $event)" />
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            class="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            @click="emit('cerrar')"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="guardando"
            class="inline-flex items-center gap-2 rounded-xl bg-corporativo-rosa px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            <Loader2 v-if="guardando" class="h-4 w-4 animate-spin" />
            {{ esEdicion ? 'Guardar cambios' : 'Crear' }}
          </button>
        </div>
      </form>
    </div>
  </Teleport>
</template>