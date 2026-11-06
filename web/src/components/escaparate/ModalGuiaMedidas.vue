<script setup>
import { X, Ruler } from 'lucide-vue-next';
import ModalBase from '@/components/comunes/ModalBase.vue';

const props = defineProps({
  abierto: { type: Boolean, default: false }
});

const emit = defineEmits(['cerrar']);

const medidas = [
  { talla: 'XS', busto: '78–82', cintura: '60–64', cadera: '84–88', largo: '54–56' },
  { talla: 'S', busto: '83–87', cintura: '65–69', cadera: '89–93', largo: '56–58' },
  { talla: 'M', busto: '88–92', cintura: '70–74', cadera: '94–98', largo: '58–60' },
  { talla: 'L', busto: '93–99', cintura: '75–81', cadera: '99–105', largo: '60–62' },
  { talla: 'XL', busto: '100–106', cintura: '82–88', cadera: '106–112', largo: '62–64' }
];
</script>

<template>
  <ModalBase :abierto="props.abierto" titulo="Guá de medidas corporales" @cerrar="emit('cerrar')">
    <header class="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-100 bg-white p-5 sm:p-6">
      <div>
        <div class="flex items-center gap-2 text-corporativo-rosa">
          <Ruler class="h-5 w-5" />
          <p class="text-xs font-bold uppercase tracking-widest">Guá de tallas</p>
        </div>
        <h2 class="mt-2 text-xl font-bold text-gray-900 sm:text-2xl">Guá de medidas corporales</h2>
        <p class="mt-1 text-sm text-gray-500">Medidas de referencia en centmetros (cm).</p>
      </div>
      <button
        type="button"
        class="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        aria-label="Cerrar guá de medidas"
        @click="emit('cerrar')"
      >
        <X class="h-5 w-5" />
      </button>
    </header>

    <div class="space-y-6 p-5 sm:p-6">
      <div class="overflow-x-auto rounded-xl border border-gray-200">
        <table class="w-full min-w-[620px] border-collapse text-left text-sm">
          <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
            <tr>
              <th class="px-4 py-3 font-bold">Talla</th>
              <th class="px-4 py-3 font-bold">Busto (cm)</th>
              <th class="px-4 py-3 font-bold">Cintura (cm)</th>
              <th class="px-4 py-3 font-bold">Cadera (cm)</th>
              <th class="px-4 py-3 font-bold">Largo prenda (cm)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 bg-white text-gray-700">
            <tr v-for="fila in medidas" :key="fila.talla">
              <th class="px-4 py-3 font-bold text-gray-900">{{ fila.talla }}</th>
              <td class="px-4 py-3">{{ fila.busto }}</td>
              <td class="px-4 py-3">{{ fila.cintura }}</td>
              <td class="px-4 py-3">{{ fila.cadera }}</td>
              <td class="px-4 py-3">{{ fila.largo }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="grid gap-4 rounded-xl bg-pink-50 p-4 sm:grid-cols-[150px_1fr] sm:items-center">
        <div class="flex justify-center">
          <svg viewBox="0 0 150 190" class="h-40 w-32" role="img" aria-label="Esquema para tomar medidas de busto, cintura y cadera">
            <circle cx="75" cy="20" r="13" fill="#fbcfe8" stroke="#be185d" stroke-width="2" />
            <path d="M58 40 Q75 34 92 40 L104 65 L95 74 L92 104 L104 145 L88 145 L75 111 L62 145 L46 145 L58 104 L55 74 L46 65 Z" fill="#fce7f3" stroke="#be185d" stroke-width="2" />
            <path d="M48 67 Q75 57 102 67" fill="none" stroke="#db2777" stroke-width="3" />
            <path d="M57 91 Q75 97 93 91" fill="none" stroke="#db2777" stroke-width="3" />
            <path d="M53 108 Q75 116 97 108" fill="none" stroke="#db2777" stroke-width="3" />
            <path d="M105 67 H140 M96 92 H140 M100 109 H140" fill="none" stroke="#9d174d" stroke-width="1.5" stroke-dasharray="3 3" />
            <text x="108" y="63" font-size="8" fill="#831843">Busto</text>
            <text x="108" y="88" font-size="8" fill="#831843">Cintura</text>
            <text x="108" y="105" font-size="8" fill="#831843">Cadera</text>
          </svg>
        </div>
        <div>
          <h3 class="font-bold text-gray-900">Cmo tomar tus medidas?</h3>
          <ul class="mt-2 space-y-2 text-sm leading-5 text-gray-700">
            <li><strong>Busto:</strong> rodea la parte más amplia del pecho, manteniendo la cinta horizontal.</li>
            <li><strong>Cintura:</strong> mide alrededor de la parte más estrecha del torso, sin apretar.</li>
            <li><strong>Cadera:</strong> rodea la parte más amplia de la cadera y los glúteos.</li>
            <li><strong>Largo:</strong> compara el largo indicado con una prenda que te quede bien.</li>
          </ul>
        </div>
      </div>

      <p class="text-xs leading-5 text-gray-500">
        Estas medidas son orientativas; pueden variar segun el corte, la tela y el modelo. Si estás entre dos tallas, revisa la descripción de la prenda antes de cotizar.
      </p>
    </div>
  </ModalBase>
</template>
