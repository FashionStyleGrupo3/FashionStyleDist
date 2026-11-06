<script setup>
import { ref } from 'vue';
import { Check, Pencil, X } from 'lucide-vue-next';
import { filtrarCampo, validarCorreo } from '@/utils/validacionCampos';

defineProps({ clientes: { type: Array, default: () => [] }, cargando: { type: Boolean, default: false } });
const emit = defineEmits(['guardar']);
const editando = ref(null);
const formulario = ref({});
const errorEdicion = ref('');

function iniciar(cliente) { editando.value = cliente.id; errorEdicion.value = ''; formulario.value = { nombre_completo: cliente.nombre_completo || '', correo: cliente.correo || '', telefono: cliente.telefono || '', ciudad: cliente.ciudad || '', direccion: cliente.direccion || '', tipo_documento: cliente.tipo_documento || '', numero_documento: cliente.numero_documento || '' }; }
function guardar(cliente) { if (!/[\p{L}\p{M}]/u.test(formulario.value.nombre_completo.trim())) { errorEdicion.value = 'Escribe un nombre válido.'; return; } if (formulario.value.correo && !validarCorreo(formulario.value.correo)) { errorEdicion.value = 'Ingresa un correo válido.'; return; } emit('guardar', cliente, { ...formulario.value }); editando.value = null; errorEdicion.value = ''; }
function filtrarEdicion(campo, tipo, limite, evento) { const valor = filtrarCampo(evento.target.value, tipo, limite); formulario.value[campo] = valor; evento.target.value = valor; }
</script>

<template>
  <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
    <div v-if="cargando" class="p-8 text-center text-sm text-gray-500">
      Cargando clientes...
    </div>

    <div v-else-if="!clientes.length" class="p-8 text-center text-sm text-gray-500">
      No hay clientes para mostrar.
    </div>

    <div v-else class="overflow-x-auto">
      <table class="min-w-full text-left text-sm">
        <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th class="px-5 py-3">Cliente</th>
            <th class="px-5 py-3">Contacto</th>
            <th class="px-5 py-3">Ubicación</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-gray-100">
          <tr v-for="cliente in clientes" :key="cliente.id" class="align-top">
            <td class="px-5 py-4"><template v-if="editando === cliente.id"><input v-model="formulario.nombre_completo" maxlength="100" class="mb-2 w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm" placeholder="Nombre" @input="filtrarEdicion('nombre_completo', 'persona', 100, $event)" /><div class="flex gap-2"><input v-model="formulario.tipo_documento" maxlength="4" class="w-20 rounded-lg border border-gray-300 px-2.5 py-2 text-sm" placeholder="CC" @input="filtrarEdicion('tipo_documento', 'identificacion', 4, $event)" /><input v-model="formulario.numero_documento" maxlength="20" inputmode="numeric" class="min-w-0 flex-1 rounded-lg border border-gray-300 px-2.5 py-2 text-sm" placeholder="Documento" @input="filtrarEdicion('numero_documento', 'identificacion', 20, $event)" /></div></template><template v-else><p class="font-semibold text-gray-900">{{ cliente.nombre_completo }}</p><p class="text-xs text-gray-500">{{ cliente.tipo_documento || '' }} {{ cliente.numero_documento || 'Sin documento' }}</p></template></td>
            <td class="px-5 py-4"><template v-if="editando === cliente.id"><input v-model="formulario.correo" type="email" maxlength="254" class="mb-2 w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm" placeholder="Correo" @input="(e)=>{ formulario.correo = String(e.target.value).replace(/\s+/g,'').slice(0,254); e.target.value = formulario.correo; }" /><input v-model="formulario.telefono" type="tel" inputmode="tel" maxlength="20" class="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm" placeholder="teléfono" @input="filtrarEdicion('telefono', 'telefono', 20, $event)" /><p v-if="errorEdicion" class="mt-1 text-xs text-red-600" role="alert">{{ errorEdicion }}</p></template><template v-else><p class="text-gray-700">{{ cliente.correo }}</p><p class="text-xs text-gray-500">{{ cliente.telefono || 'Sin teléfono' }}</p></template></td>
            <td class="px-5 py-4"><template v-if="editando === cliente.id"><input v-model="formulario.ciudad" maxlength="80" class="mb-2 w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm" placeholder="Ciudad" @input="filtrarEdicion('ciudad', 'persona', 80, $event)" /><input v-model="formulario.direccion" maxlength="180" class="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm" placeholder="Dirección" @input="filtrarEdicion('direccion', 'direccion', 180, $event)" /></template><template v-else><p class="text-gray-700">{{ cliente.ciudad || 'Sin ciudad' }}</p><p class="text-xs text-gray-500">{{ cliente.direccion || 'Sin dirección' }}</p></template></td>
            <td class="px-5 py-4 text-right"><div class="flex justify-end gap-2"><button v-if="editando !== cliente.id" class="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50" @click="iniciar(cliente)"><Pencil class="mr-1 inline h-3.5 w-3.5" />Editar</button><template v-else><button class="rounded-lg bg-corporativo-rosa px-3 py-2 text-xs font-bold text-white" @click="guardar(cliente)"><Check class="mr-1 inline h-3.5 w-3.5" />Guardar</button><button class="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600" @click="editando = null"><X class="mr-1 inline h-3.5 w-3.5" />Cancelar</button></template></div></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
