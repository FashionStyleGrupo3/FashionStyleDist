<script setup>
// Envoltorio de Chart.js con la paleta y tipografía de la tienda.
import { computed } from 'vue';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'vue-chartjs';

ChartJS.register(ArcElement, BarElement, CategoryScale, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip);
ChartJS.defaults.font.family = "'Inter', 'Montserrat', sans-serif";
ChartJS.defaults.color = '#6f6f6f';

const props = defineProps({
  tipo: { type: String, default: 'bar' }, // bar | line | doughnut
  etiquetas: { type: Array, default: () => [] },
  series: { type: Array, default: () => [] }, // [{ nombre, datos, color }]
  moneda: { type: Boolean, default: false },
  apilado: { type: Boolean, default: false },
  alto: { type: Number, default: 260 },
});

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const formatoNumero = new Intl.NumberFormat('es-CO');
const formatear = (v) => (props.moneda ? formatoCOP.format(v) : formatoNumero.format(v));

const componente = computed(() => ({ bar: Bar, line: Line, doughnut: Doughnut }[props.tipo] ?? Bar));

const datos = computed(() => {
  if (props.tipo === 'doughnut') {
    const serie = props.series[0] ?? { datos: [], color: [] };
    return {
      labels: props.etiquetas,
      datasets: [{ data: serie.datos, backgroundColor: serie.color, borderColor: '#ffffff', borderWidth: 2 }],
    };
  }
  return {
    labels: props.etiquetas,
    datasets: props.series.map((s) => ({
      label: s.nombre,
      data: s.datos,
      backgroundColor: props.tipo === 'line' ? `${s.color}22` : s.color,
      borderColor: s.color,
      borderWidth: props.tipo === 'line' ? 2 : 0,
      borderRadius: props.tipo === 'bar' ? 6 : 0,
      fill: props.tipo === 'line',
      tension: 0.35,
      pointRadius: 3,
    })),
  };
});

const opciones = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true } },
    tooltip: {
      callbacks: {
        label: (ctx) => `${ctx.dataset.label ?? ctx.label}: ${formatear(ctx.parsed?.y ?? ctx.parsed ?? 0)}`,
      },
    },
  },
  ...(props.tipo === 'doughnut'
    ? { cutout: '62%' }
    : {
        scales: {
          x: { stacked: props.apilado, grid: { display: false } },
          y: {
            stacked: props.apilado,
            beginAtZero: true,
            grid: { color: '#ece5da' },
            ticks: { callback: (v) => (props.moneda ? `$${formatoNumero.format(v / 1000)}k` : formatoNumero.format(v)) },
          },
        },
      }),
}));
</script>

<template>
  <div class="relative w-full min-w-0" :style="{ height: `${alto}px` }">
    <component :is="componente" :data="datos" :options="opciones" />
  </div>
</template>
