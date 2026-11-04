<script setup>
import { computed } from 'vue';
import { Check, Circle } from 'lucide-vue-next';
import { REQUISITOS_PASSWORD } from '@/utils/validarPassword';

const props = defineProps({
  password: { type: String, default: '' }
});

const items = computed(() =>
  REQUISITOS_PASSWORD.map((r) => ({ ...r, ok: r.cumple(props.password || '') }))
);
</script>

<template>
  <ul class="mt-2 grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
    <li
      v-for="r in items"
      :key="r.id"
      class="flex items-center gap-1.5"
      :class="r.ok ? 'text-emerald-600' : 'text-gray-400'"
    >
      <Check v-if="r.ok" class="h-3.5 w-3.5" />
      <Circle v-else class="h-3.5 w-3.5" />
      {{ r.texto }}
    </li>
  </ul>
</template>