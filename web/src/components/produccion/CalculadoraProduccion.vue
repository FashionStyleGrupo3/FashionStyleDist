<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRecargaAutomatica } from '@/composables/useRecargaAutomatica';
import {
  Calculator,
  Plus,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Package,
  TrendingUp,
  Loader2,
  RotateCcw,
  Save,
  Lightbulb,
  Receipt,
  ClipboardCheck,
  X,
  Layers,
  Check
} from 'lucide-vue-next';
import { useFormatoMoneda } from '@/composables/useFormatoMoneda';
import { useNotificacion } from '@/composables/useNotificacion';
import { filtrarNumero } from '@/utils/validacionCampos';
import clienteApi from '@/services/clienteApi';
import { cargarDatosCalculadora } from '@/services/calculadoraApi';
import ModalNuevaFormula from '@/components/produccion/ModalNuevaFormula.vue';

const { formatearCOP } = useFormatoMoneda();
const { confirmarAccion, notificarError, notificarExito } = useNotificacion();

const cargando = ref(false);
const error = ref(null);
const formulasDisponibles = ref([]);
const materiasPrimas = ref([]);
const formulaSeleccionada = ref(null);
const cantidadAProducir = ref(10);
const costoManoObra = ref(35000);
const precioVenta = ref(0);
// Tela total realmente usada en el corte (la digita el usuario). null = sin digitar.
const telaUsadaManual = ref(null);

const margenObjetivo = ref(35);
const aplicarIva = ref(false);
const guardadoExitoso = ref(false);

const modalNuevaFormulaAbierto = ref(false);
const unidades = ref([]);

const modalOrdenAbierto = ref(false);
const ordenGenerada = ref(false);
const numeroOrden = ref('');
const guardandoOrden = ref(false);
const errorOrden = ref('');
const resumenOrden = ref({ nombre: '', cantidad: 0 });

function limitarCantidad(e) {
  const v = Math.min(10000, Math.max(1, Number(filtrarNumero(e.target.value, 5)) || 1));
  cantidadAProducir.value = v;
  e.target.value = v;
}

function limitarManoObra(e) {
  const v = Math.min(5000000, Math.max(0, Number(filtrarNumero(e.target.value, 7)) || 0));
  costoManoObra.value = v;
  e.target.value = v;
}

function limitarPrecioVenta(e) {
  const v = Math.min(100000000, Math.max(0, Number(filtrarNumero(e.target.value, 9)) || 0));
  precioVenta.value = v;
  e.target.value = v;
}

function limitarConsumo(consumo, e) {
  const v = Math.min(1000, Math.max(0, Number(filtrarNumero(e.target.value, 4, 1)) || 0));
  consumo.cantidad = v;
  e.target.value = v;
}

async function cargarUnidades() {
  try {
    const res = await clienteApi.get('/unidades-medida');
    unidades.value = res.data?.data ?? res.data ?? [];
  } catch (e) {
    console.warn('No se pudieron cargar las unidades:', e);
    unidades.value = [];
  }
}

async function cargarDatos() {
  cargando.value = true;
  error.value = null;

  try {
    const { materiasPrimas: materias, formulas } = await cargarDatosCalculadora();

    materiasPrimas.value = materias;
    formulasDisponibles.value = formulas;

    if (!formulasDisponibles.value.length) {
      formulaSeleccionada.value = null;
      error.value = 'El backend no tiene fórmulas de produccion disponibles.';
      return;
    }

    const formulaGuardada = localStorage.getItem('calc_formula_id');
    const formulaInicial = formulas.find(f => String(f.id ?? f.id_formula) === String(formulaGuardada)) || formulas[0];
    if (formulaInicial) {
      seleccionarFormula(formulaInicial);
    }
  } catch (e) {
    console.error('Error al cargar datos:', e);
    error.value = e.response?.data?.message || 'No se pudieron cargar las fórmulas y materias primas del backend.';
  } finally {
    cargando.value = false;
  }
}

function seleccionarFormula(formula, opciones = {}) {
  if (!opciones.restaurar) telaUsadaManual.value = null;
  if (!formula) {
    formulaSeleccionada.value = null;
    cantidadAProducir.value = 0;
    costoManoObra.value = 0;
    precioVenta.value = 0;
    margenObjetivo.value = 0;
    aplicarIva.value = false;
    return;
  }

  formulaSeleccionada.value = JSON.parse(JSON.stringify(formula));

  if (!opciones.restaurar) {
    costoManoObra.value = Math.min(5000000, Math.max(0, Number(formula.mano_obra_sugerida || 35000)));
    if (cantidadAProducir.value < 1) cantidadAProducir.value = 10;
  }
  precioVenta.value = Math.min(100000000, Math.max(0, Number(formula.precio_venta || 0)));

  const consumoRaw = formula.consumos || [];
  formulaSeleccionada.value.consumos = consumoRaw.map(c => {
    const insumo = materiasPrimas.value.find(m => (m.id ?? m.id_material) === c.materia_prima_id);
    const stockVal = insumo
      ? (insumo.stock_actual ?? insumo.stock ?? insumo.Stock ?? 0)
      : (c.insumo_stock ?? 0);
    return {
      materia_prima_id: c.materia_prima_id,
      cantidad: Math.min(1000, Math.max(0, Number(c.cantidad) || 0)),
      insumo_nombre: c.insumo_nombre || insumo?.nombre || 'Desconocido',
      insumo_clasificacion: c.insumo_clasificacion || insumo?.clasificacion || 'Insumo',
      insumo_unidad: c.insumo_unidad || c.unidad || insumo?.unidad || 'un',
      insumo_costo: Number(c.insumo_costo ?? insumo?.costo_unitario) || 0,
      insumo_stock: Number(stockVal),
      desperdicio_porcentaje: Number(c.desperdicio_porcentaje) || 0,
    };
  });

  localStorage.setItem('calc_formula_id', String(formula.id ?? formula.id_formula));
}

function reiniciarValores() {
  if (!formulaSeleccionada.value) return;
  cantidadAProducir.value = 10;
  telaUsadaManual.value = null;
  costoManoObra.value = Math.min(5000000, Math.max(0, Number(formulaSeleccionada.value.mano_obra_sugerida || 35000)));
  precioVenta.value = Math.min(100000000, Math.max(0, Number(formulaSeleccionada.value.precio_venta || 0)));
  margenObjetivo.value = 35;
  aplicarIva.value = false;
}

function cambiarFormula(evento) {
  const id = evento.target.value;
  seleccionarFormula(
    formulasDisponibles.value.find((formula) => String(formula.id ?? formula.id_formula) === id)
  );
}

function alCrearFormula(nuevaFormula) {
  cargarDatos();
  notificarExito('Fórmula creada correctamente.');
}

// ==========================================
// CÁLCULO AUTOMÁTICO DEL DESPERDICIO
// ==========================================
const esTela = (c) => String(c.insumo_clasificacion || '').toLowerCase() === 'textil';

const telaPorPrenda = computed(() =>
  (formulaSeleccionada.value?.consumos || [])
    .filter(esTela)
    .reduce((t, c) => t + (Number(c.cantidad) || 0), 0)
);

const unidadTela = computed(
  () => (formulaSeleccionada.value?.consumos || []).find(esTela)?.insumo_unidad || 'm'
);

const telaNecesaria = computed(() => telaPorPrenda.value * Number(cantidadAProducir.value || 0));

const telaUsadaEstimada = computed(() =>
  (formulaSeleccionada.value?.consumos || [])
    .filter(esTela)
    .reduce(
      (t, c) => t + (Number(c.cantidad) || 0) * Number(cantidadAProducir.value || 0) * (1 + (Number(c.desperdicio_porcentaje) || 0) / 100),
      0
    )
);

const telaUsadaCorte = computed(() =>
  telaUsadaManual.value === null || telaUsadaManual.value === ''
    ? telaUsadaEstimada.value
    : Number(telaUsadaManual.value) || 0
);

const telaDesperdicio = computed(() => Math.max(0, telaUsadaCorte.value - telaNecesaria.value));

const telaInsuficiente = computed(
  () => telaNecesaria.value > 0 && telaUsadaCorte.value > 0 && telaUsadaCorte.value < telaNecesaria.value
);

const margenDesperdicio = computed(() => {
  if (telaNecesaria.value <= 0) return 0;
  const margen = (telaDesperdicio.value / telaNecesaria.value) * 100;
  return Math.min(100, Math.round(margen * 100) / 100);
});

function limitarTelaUsada(e) {
  const crudo = filtrarNumero(e.target.value, 7, 1);
  if (crudo === '') {
    telaUsadaManual.value = null;
    return;
  }
  const v = Math.min(1000000, Math.max(0, Number(crudo) || 0));
  telaUsadaManual.value = v;
  e.target.value = v;
}

const costoMaterialesUnitario = computed(() => {
  if (!formulaSeleccionada.value) return 0;
  return formulaSeleccionada.value.consumos.reduce(
    (total, c) => total + (c.cantidad * c.insumo_costo),
    0
  );
});

const costoMaterialesConDesperdicio = computed(() =>
  costoMaterialesUnitario.value * (1 + margenDesperdicio.value / 100)
);

const costoUnitarioTotal = computed(() =>
  costoMaterialesConDesperdicio.value + Number(costoManoObra.value || 0)
);

const costoTotalLote = computed(() =>
  costoUnitarioTotal.value * Number(cantidadAProducir.value || 0)
);

const ingresoTotal = computed(() =>
  Number(precioVenta.value || 0) * Number(cantidadAProducir.value || 0)
);

const gananciaTotal = computed(() => ingresoTotal.value - costoTotalLote.value);

const margenGanancia = computed(() =>
  ingresoTotal.value === 0 ? 0 : (gananciaTotal.value / ingresoTotal.value) * 100
);

const margenUnitario = computed(() =>
  Number(precioVenta.value || 0) - costoUnitarioTotal.value
);

const precioSugeridoSinIva = computed(() =>
  costoUnitarioTotal.value * (1 + margenObjetivo.value / 100)
);

const ivaCalculado = computed(() =>
  aplicarIva.value ? precioSugeridoSinIva.value * 0.19 : 0
);

const precioSugeridoFinal = computed(() =>
  precioSugeridoSinIva.value + ivaCalculado.value
);

const factibilidad = computed(() => {
  if (!formulaSeleccionada.value?.consumos?.length) {
    return { puedeProducir: 0, limitante: null, todosSuficientes: true, faltante: 0 };
  }

  let minProducible = Infinity;
  let insumoLimitante = null;

  for (const consumo of formulaSeleccionada.value.consumos) {
    const requeridoPorUnidad = consumo.cantidad * (1 + margenDesperdicio.value / 100);
    if (requeridoPorUnidad === 0) continue;
    const unidadesPosibles = Math.floor(consumo.insumo_stock / requeridoPorUnidad);
    if (unidadesPosibles < minProducible) {
      minProducible = unidadesPosibles;
      insumoLimitante = {
        nombre: consumo.insumo_nombre,
        unidad: consumo.insumo_unidad,
        stock: consumo.insumo_stock,
        requerido: requeridoPorUnidad * cantidadAProducir.value,
      };
    }
  }

  if (minProducible === Infinity) minProducible = 0;
  const todosSuficientes = minProducible >= cantidadAProducir.value;
  const faltante = !todosSuficientes && insumoLimitante
    ? insumoLimitante.requerido - insumoLimitante.stock
    : 0;

  return { puedeProducir: minProducible, limitante: insumoLimitante, todosSuficientes, faltante };
});

const historialCalculos = ref([]);
const CLAVE_HISTORIAL = 'calc_historial';

function guardarCalculo() {
  if (!formulaSeleccionada.value || cantidadAProducir.value < 1 || precioVenta.value <= 0) {
    error.value = 'Selecciona una fórmula, una cantidad positiva y un precio de venta válido.';
    return;
  }

  const nuevoCalculo = {
    id: Date.now(),
    fecha: new Date().toLocaleString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }),
    formula_nombre: formulaSeleccionada.value.nombre,
    formula_id: formulaSeleccionada.value.id ?? formulaSeleccionada.value.id_formula,
    cantidad: cantidadAProducir.value,
    manoObra: costoManoObra.value,
    desperdicio: margenDesperdicio.value,
    margenObjetivo: margenObjetivo.value,
    aplicarIva: aplicarIva.value,
    precioVenta: precioVenta.value,
    resumen: {
      costoUnitario: costoUnitarioTotal.value,
      costoTotalLote: costoTotalLote.value,
      gananciaTotal: gananciaTotal.value,
      margenGanancia: margenGanancia.value,
      precioSugerido: precioSugeridoFinal.value
    }
  };

  historialCalculos.value.unshift(nuevoCalculo);
  if (historialCalculos.value.length > 20) {
    historialCalculos.value = historialCalculos.value.slice(0, 20);
  }
  localStorage.setItem(CLAVE_HISTORIAL, JSON.stringify(historialCalculos.value));

  guardadoExitoso.value = true;
  setTimeout(() => { guardadoExitoso.value = false; }, 1500);
}

function cargarHistorialGuardado() {
  try {
    const raw = localStorage.getItem(CLAVE_HISTORIAL);
    historialCalculos.value = raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('No se pudo cargar el historial:', e);
    historialCalculos.value = [];
  }
}

function restaurarCalculo(calculo) {
  const formula = formulasDisponibles.value.find(
    (f) => String(f.id ?? f.id_formula) === String(calculo.formula_id)
  );
  if (formula) {
    seleccionarFormula(formula, { restaurar: true });
  }

  cantidadAProducir.value = Math.min(10000, Math.max(1, Number(calculo.cantidad) || 1));
  costoManoObra.value = Math.min(5000000, Math.max(0, Number(calculo.manoObra) || 0));
  precioVenta.value = Math.min(100000000, Math.max(0, Number(calculo.precioVenta) || 0));
  margenObjetivo.value = Number(calculo.margenObjetivo) || 0;
  aplicarIva.value = calculo.aplicarIva;
}

function eliminarCalculo(id) {
  historialCalculos.value = historialCalculos.value.filter((calculo) => calculo.id !== id);
  localStorage.setItem(CLAVE_HISTORIAL, JSON.stringify(historialCalculos.value));
}

async function limpiarHistorial() {
  const confirmado = await confirmarAccion({
    titulo: 'Vaciar historial',
    texto: '¿Eliminar todo el historial de cálculos guardados?',
    textoBotonConfirmar: 'Sí, vaciar'
  });

  if (!confirmado) return;

  historialCalculos.value = [];
  localStorage.removeItem(CLAVE_HISTORIAL);
  notificarExito('Historial limpiado correctamente.');
}

function abrirModalOrden() {
  if (!formulaSeleccionada.value || cantidadAProducir.value < 1 || !factibilidad.value.todosSuficientes) return;
  errorOrden.value = '';
  numeroOrden.value = '';
  ordenGenerada.value = false;
  modalOrdenAbierto.value = true;
}

function limpiarCalculadoraTrasOrden() {
  localStorage.removeItem('calc_formula_id');
  seleccionarFormula(null);
  guardadoExitoso.value = false;
}

async function confirmarOrdenProduccion() {
  if (!formulaSeleccionada.value || cantidadAProducir.value < 1) return;

  guardandoOrden.value = true;
  errorOrden.value = '';
  try {
    const respuesta = await clienteApi.post('/ordenes-produccion', {
      formula_id: formulaSeleccionada.value.id ?? formulaSeleccionada.value.id_formula,
      cantidad: cantidadAProducir.value,
      costo_mano_obra: costoManoObra.value,
      precio_venta: precioVenta.value,
      desperdicio: margenDesperdicio.value,
      costo_total: costoTotalLote.value,
      estado: 'planificada'
    });
    const orden = respuesta.data?.data ?? respuesta.data;
    numeroOrden.value = orden?.numero ?? orden?.codigo ?? orden?.id ?? '';

    resumenOrden.value = {
      nombre: formulaSeleccionada.value?.nombre ?? '',
      cantidad: cantidadAProducir.value,
    };
    limpiarCalculadoraTrasOrden();
    ordenGenerada.value = true;

    // Avisar a las otras pestañas que el stock cambió
    window.dispatchEvent(new CustomEvent('datos-actualizados'));
  } catch (requestError) {
    console.error('Error al crear la orden de produccion en el backend:', requestError);
    errorOrden.value = requestError.response?.data?.message || 'No se pudo registrar la orden de produccion.';
  } finally {
    guardandoOrden.value = false;
  }
}

// ==========================================
// ESCUCHADOR DE EVENTOS GLOBALES
// ==========================================
const alActualizarDatosGlobales = async () => {
  try {
    const { materiasPrimas: materias, formulas } = await cargarDatosCalculadora();
    materiasPrimas.value = materias;
    formulasDisponibles.value = formulas;
    
    // Si había una fórmula seleccionada, la refrescamos
    if (formulaSeleccionada.value) {
      const idActual = formulaSeleccionada.value.id ?? formulaSeleccionada.value.id_formula;
      const formulaFresca = formulas.find(f => String(f.id ?? f.id_formula) === String(idActual));
      if (formulaFresca) {
        // Guardamos el estado actual de la UI para no perder los inputs del usuario
        const cantActual = cantidadAProducir.value;
        const manoObraActual = costoManoObra.value;
        const precioVentaActual = precioVenta.value;
        const telaUsadaActual = telaUsadaManual.value;
        
        seleccionarFormula(formulaFresca, { restaurar: true });
        
        cantidadAProducir.value = cantActual;
        costoManoObra.value = manoObraActual;
        precioVenta.value = precioVentaActual;
        telaUsadaManual.value = telaUsadaActual;
      }
    }
  } catch (e) {
    console.warn('No se pudo actualizar en segundo plano', e);
  }
};

onMounted(() => {
  cargarHistorialGuardado();
  cargarDatos();
  cargarUnidades();
  
  window.addEventListener('datos-actualizados', alActualizarDatosGlobales);
});

onUnmounted(() => {
  window.removeEventListener('datos-actualizados', alActualizarDatosGlobales);
});

// Recarga silenciosa: trae materias primas, fórmulas y unidades nuevas sin perder
// la fórmula seleccionada ni la cantidad / mano de obra / precio que escribió el usuario.
async function refrescarCalculadora() {
  try {
    const [{ materiasPrimas: materias, formulas }] = await Promise.all([
      cargarDatosCalculadora(),
      cargarUnidades(),
    ]);
    materiasPrimas.value = materias;
    formulasDisponibles.value = formulas;

    if (!formulas.length) {
      formulaSeleccionada.value = null;
      error.value = 'El backend no tiene fórmulas de produccion disponibles.';
      return;
    }
    error.value = null;

    const idActual = formulaSeleccionada.value?.id ?? formulaSeleccionada.value?.id_formula;
    const actualizada = formulas.find((fm) => String(fm.id ?? fm.id_formula) === String(idActual));
    if (actualizada) {
      const precioPrevio = precioVenta.value;
      const telaPrevia = telaUsadaManual.value;
      seleccionarFormula(actualizada, { restaurar: true });
      precioVenta.value = precioPrevio;
      telaUsadaManual.value = telaPrevia;
    } else {
      seleccionarFormula(formulas[0]);
    }
  } catch (e) {
    console.warn('No se pudo refrescar la calculadora:', e);
  }
}

useRecargaAutomatica(refrescarCalculadora, { intervaloSondeo: 0 });
</script>

<template>
  <div class="w-full">
    <!-- Encabezado -->
    <div class="mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
      <div class="flex items-start gap-3">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-corporativo-rosa text-white shadow-sm">
          <Calculator class="h-5 w-5" />
        </div>
        <div class="min-w-0">
          <h1 class="text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl lg:text-3xl font-titulos">
            Calculadora de Producción
          </h1>
          <p class="mt-1 text-xs sm:text-sm text-gray-500">
            Planifica costos, materiales, rentabilidad y factibilidad.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 sm:justify-end">
        <transition name="fade">
          <div
            v-if="guardadoExitoso"
            class="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-semibold text-emerald-700"
          >
            <Save class="h-3.5 w-3.5" /> Guardado
          </div>
        </transition>

        <button
          type="button"
          :disabled="!formulaSeleccionada || cantidadAProducir < 1"
          class="flex items-center justify-center gap-2 rounded-xl bg-corporativo-rosa px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-40 flex-1 sm:flex-initial"
          @click="guardarCalculo"
        >
          <Save class="h-4 w-4" />
          Guardar cálculo
        </button>
      </div>
    </div>

    <!-- Estados -->
    <div v-if="cargando" class="flex flex-col items-center justify-center py-24 text-gray-500">
      <Loader2 class="h-10 w-10 animate-spin text-corporativo-rosa" />
      <p class="mt-4 text-sm font-medium">Cargando datos de produccion...</p>
    </div>

    <div v-else-if="error" class="rounded-xl border border-red-200 bg-red-50 p-4 sm:p-6 text-center">
      <AlertTriangle class="mx-auto h-10 w-10 text-red-500" />
      <p class="mt-3 font-semibold text-sm sm:text-base text-red-700">{{ error }}</p>
      <button
        type="button"
        class="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        @click="cargarDatos"
      >
        Reintentar
      </button>
    </div>

    <div v-else-if="!formulasDisponibles.length" class="rounded-xl border border-gray-200 bg-gray-50 p-6 sm:p-12 text-center">
      <Package class="mx-auto h-12 w-12 text-gray-400" />
      <p class="mt-3 font-semibold text-sm sm:text-base text-gray-700">No hay fórmulas de produccion disponibles.</p>
      <p class="mt-1 text-xs sm:text-sm text-gray-500">Crea una fórmula en el backend para comenzar un cálculo.</p>
    </div>

    <!-- Contenido operativo -->
    <div v-else class="space-y-4 sm:space-y-6">
      <!-- Parámetros del lote -->
      <section class="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:gap-5">
          <!-- seleccion de fórmula -->
          <div class="sm:col-span-2 lg:col-span-2">
            <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
              Fórmula de confección
            </label>
            <div class="flex items-center gap-2">
              <select
                :value="formulaSeleccionada?.id ?? formulaSeleccionada?.id_formula ?? ''"
                @change="cambiarFormula"
                class="flex-1 min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 focus:border-corporativo-rosa focus:outline-none focus:ring-2 focus:ring-pink-100"
              >
                <option value="">Sin fórmula seleccionada</option>
                <option v-for="f in formulasDisponibles" :key="f.id ?? f.id_formula" :value="f.id ?? f.id_formula">
                  {{ f.nombre }} ({{ formatearCOP(f.precio_venta) }})
                </option>
              </select>
              <button
                type="button"
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-corporativo-rosa transition"
                title="Crear nueva fórmula"
                @click="modalNuevaFormulaAbierto = true"
              >
                <Plus class="h-4 w-4" />
              </button>
              <button
                type="button"
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-corporativo-rosa transition"
                title="Reiniciar valores"
                :disabled="!formulaSeleccionada"
                @click="reiniciarValores"
              >
                <RotateCcw class="h-4 w-4" />
              </button>
            </div>
          </div>

          <!-- Unidades -->
          <div class="sm:col-span-1">
            <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
              Unidades
            </label>
            <div class="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                class="flex h-10 w-9 sm:w-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                :disabled="!formulaSeleccionada"
                @click="cantidadAProducir = Math.max(1, cantidadAProducir - 1)"
              >
                <Minus class="h-4 w-4" />
              </button>
              <input
                :value="cantidadAProducir"
                type="number"
                min="1"
                max="10000"
                :disabled="!formulaSeleccionada"
                class="h-10 w-full min-w-0 rounded-lg border border-gray-300 px-2 text-center text-sm font-bold text-gray-900 focus:border-corporativo-rosa focus:outline-none focus:ring-2 focus:ring-pink-100"
                @input="limitarCantidad"
              />
              <button
                type="button"
                class="flex h-10 w-9 sm:w-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                :disabled="!formulaSeleccionada"
                @click="cantidadAProducir = Math.min(10000, cantidadAProducir + 1)"
              >
                <Plus class="h-4 w-4" />
              </button>
            </div>
          </div>

          <!-- Mano de obra -->
          <div class="sm:col-span-1">
            <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
              Mano de obra
            </label>
            <input
              :value="costoManoObra"
              type="number"
              min="0"
              max="5000000"
              :disabled="!formulaSeleccionada"
              step="1000"
              class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-semibold text-gray-900 focus:border-corporativo-rosa focus:outline-none focus:ring-2 focus:ring-pink-100"
              @input="limitarManoObra"
            />
          </div>

          <!-- Precio venta -->
          <div class="sm:col-span-2 lg:col-span-1">
            <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
              Precio venta
            </label>
            <input
              :value="precioVenta"
              type="number"
              min="0"
              max="100000000"
              step="1000"
              :disabled="!formulaSeleccionada"
              placeholder="Ingresa el precio"
              class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-semibold text-gray-900 focus:border-corporativo-rosa focus:outline-none focus:ring-2 focus:ring-pink-100 disabled:bg-gray-100"
              @input="limitarPrecioVenta"
            />
          </div>
        </div>

        <!-- Desperdicio de tela -->
        <div class="mt-4 sm:mt-5 border-t border-gray-100 pt-4 sm:pt-5">
          <label class="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-500">
            <span>Margen de desperdicio</span>
            <span class="text-base font-bold text-corporativo-rosa">{{ margenDesperdicio }}%</span>
          </label>

          <div v-if="telaPorPrenda > 0" class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p class="text-xs text-gray-500 mb-1">Tela por prenda</p>
              <p class="rounded-lg bg-gray-50 px-3 py-2.5 text-sm font-semibold text-gray-900">
                {{ telaPorPrenda.toLocaleString('es-CO', { maximumFractionDigits: 4 }) }} {{ unidadTela }}
              </p>
            </div>
            <div>
              <p class="text-xs text-gray-500 mb-1">Tela necesaria ({{ cantidadAProducir }} prendas)</p>
              <p class="rounded-lg bg-gray-50 px-3 py-2.5 text-sm font-semibold text-gray-900">
                {{ telaNecesaria.toLocaleString('es-CO', { maximumFractionDigits: 4 }) }} {{ unidadTela }}
              </p>
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Tela total usada en el corte ({{ unidadTela }})</label>
              <input
                :value="telaUsadaManual ?? ''"
                type="number"
                min="0"
                max="1000000"
                step="0.1"
                :placeholder="telaUsadaEstimada.toLocaleString('es-CO', { maximumFractionDigits: 2 })"
                class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-semibold text-gray-900 focus:border-corporativo-rosa focus:outline-none focus:ring-2 focus:ring-pink-100"
                @input="limitarTelaUsada"
              />
            </div>
            <div>
              <p class="text-xs text-gray-500 mb-1">Desperdicio (usada − necesaria)</p>
              <p class="rounded-lg bg-pink-50 px-3 py-2.5 text-sm font-bold text-corporativo-rosa">
                {{ telaDesperdicio.toLocaleString('es-CO', { maximumFractionDigits: 4 }) }} {{ unidadTela }}
              </p>
            </div>
          </div>
          <p v-else class="text-xs text-gray-500">
            Esta fórmula no tiene tela (insumo textil); el margen de desperdicio es 0%.
          </p>

          <p v-if="telaInsuficiente" class="mt-2 text-xs font-medium text-amber-600">
            La tela usada en el corte es menor que la necesaria para las prendas; revisa el dato.
          </p>
          <p v-else-if="telaUsadaManual === null && telaPorPrenda > 0" class="mt-2 text-xs text-gray-400">
            Valor estimado con el % de la fórmula. Digita la tela realmente usada en el corte para calcular el desperdicio real.
          </p>

          <div class="mt-3 relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              class="absolute top-0 left-0 h-full bg-corporativo-rosa transition-all duration-500 ease-out"
              :style="{ width: margenDesperdicio + '%' }"
            ></div>
          </div>
          <div class="mt-2 flex justify-between text-xs text-gray-400">
            <span>0%</span><span>50%</span><span>100%</span>
          </div>
        </div>
      </section>

      <!-- Grid principal -->
      <div class="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <div class="lg:col-span-2 space-y-4 sm:space-y-6">
          <!-- Tabla de materiales: en móvil se ven como cards -->
          <section class="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <header class="border-b border-gray-100 bg-gray-50 px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-2">
              <h2 class="text-sm font-bold uppercase tracking-wide text-gray-700 flex items-center gap-2">
                <Layers class="w-4 h-4 text-corporativo-rosa" />
                Materias primas
              </h2>
              <span class="text-xs text-gray-500">
                {{ formulaSeleccionada?.consumos?.length || 0 }} insumos
              </span>
            </header>

            <div v-if="!formulaSeleccionada?.consumos?.length" class="p-8 text-center text-gray-500 text-sm">
              {{ formulaSeleccionada ? 'Esta fórmula no tiene consumos.' : 'Selecciona una fórmula.' }}
            </div>

            <!-- Vista de tabla (tablet/desktop) -->
            <div v-else class="hidden sm:block overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-white">
                  <tr class="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-100">
                    <th class="px-4 lg:px-5 py-3 font-semibold">Insumo</th>
                    <th class="px-4 lg:px-5 py-3 font-semibold text-center">Consumo</th>
                    <th class="px-4 lg:px-5 py-3 font-semibold text-right">Costo unit.</th>
                    <th class="px-4 lg:px-5 py-3 font-semibold text-right">Subtotal</th>
                    <th class="px-4 lg:px-5 py-3 font-semibold text-right">Total lote</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="(consumo, idx) in formulaSeleccionada.consumos" :key="idx" class="hover:bg-gray-50 transition">
                    <td class="px-4 lg:px-5 py-3">
                      <div class="flex flex-wrap items-center gap-2">
                        <p class="font-medium text-gray-900 text-sm">{{ consumo.insumo_nombre }}</p>
                        <span
                          class="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                          :class="consumo.insumo_clasificacion === 'Textil' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200'"
                        >
                          {{ consumo.insumo_clasificacion }}
                        </span>
                      </div>
                      <p class="text-xs text-gray-500 mt-0.5">
                        Stock: <strong class="text-gray-700">{{ consumo.insumo_stock }} {{ consumo.insumo_unidad }}</strong>
                      </p>
                    </td>
                    <td class="px-4 lg:px-5 py-3 text-center">
                      <div class="inline-flex items-center gap-1.5">
                        <input
                          :value="consumo.cantidad"
                          type="number"
                          min="0"
                          max="1000"
                          step="0.1"
                          class="w-20 rounded-md border border-gray-300 px-2 py-1 text-center text-sm font-semibold focus:border-corporativo-rosa focus:outline-none focus:ring-2 focus:ring-pink-100"
                          @input="(e) => limitarConsumo(consumo, e)"
                        />
                        <span class="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {{ consumo.insumo_unidad }}
                        </span>
                      </div>
                    </td>
                    <td class="px-4 lg:px-5 py-3 text-right text-gray-700 text-sm whitespace-nowrap">
                      {{ formatearCOP(consumo.insumo_costo) }}
                    </td>
                    <td class="px-4 lg:px-5 py-3 text-right font-semibold text-gray-900 text-sm whitespace-nowrap">
                      {{ formatearCOP(consumo.cantidad * consumo.insumo_costo) }}
                    </td>
                    <td class="px-4 lg:px-5 py-3 text-right font-bold text-corporativo-rosa text-sm whitespace-nowrap">
                      {{ formatearCOP(consumo.cantidad * consumo.insumo_costo * cantidadAProducir) }}
                    </td>
                  </tr>
                </tbody>
                <tfoot class="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td colspan="3" class="px-4 lg:px-5 py-3 text-right text-sm font-semibold text-gray-600">
                      Costo materiales:
                    </td>
                    <td colspan="2" class="px-4 lg:px-5 py-3 text-right text-base font-extrabold text-gray-900">
                      {{ formatearCOP(costoMaterialesUnitario) }}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- Vista de cards (móvil) -->
            <div v-if="formulaSeleccionada?.consumos?.length" class="sm:hidden divide-y divide-gray-100">
              <div v-for="(consumo, idx) in formulaSeleccionada.consumos" :key="idx" class="p-4">
                <div class="flex flex-wrap items-center gap-2 mb-2">
                  <p class="font-medium text-gray-900 text-sm">{{ consumo.insumo_nombre }}</p>
                  <span
                    class="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                    :class="consumo.insumo_clasificacion === 'Textil' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200'"
                  >
                    {{ consumo.insumo_clasificacion }}
                  </span>
                </div>
                <p class="text-xs text-gray-500 mb-3">
                  Stock: {{ consumo.insumo_stock }} {{ consumo.insumo_unidad }}
                </p>

                <div class="flex items-center gap-2 mb-2">
                  <label class="text-xs text-gray-500 w-20">Consumo:</label>
                  <input
                    :value="consumo.cantidad"
                    type="number"
                    min="0"
                    max="1000"
                    step="0.1"
                    class="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm font-semibold focus:border-corporativo-rosa focus:outline-none"
                    @input="(e) => limitarConsumo(consumo, e)"
                  />
                  <span class="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded">{{ consumo.insumo_unidad }}</span>
                </div>

                <div class="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p class="text-gray-500">Costo unit.</p>
                    <p class="font-semibold text-gray-900">{{ formatearCOP(consumo.insumo_costo) }}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-gray-500">Subtotal</p>
                    <p class="font-semibold text-gray-900">{{ formatearCOP(consumo.cantidad * consumo.insumo_costo) }}</p>
                  </div>
                  <div class="col-span-2 text-right border-t border-gray-100 pt-2 mt-1">
                    <p class="text-gray-500">Total lote ({{ cantidadAProducir }} un.)</p>
                    <p class="font-bold text-corporativo-rosa">{{ formatearCOP(consumo.cantidad * consumo.insumo_costo * cantidadAProducir) }}</p>
                  </div>
                </div>
              </div>

              <div class="p-4 bg-gray-50">
                <div class="flex justify-between text-sm font-semibold text-gray-600">
                  <span>Costo materiales / unidad:</span>
                  <span class="text-base font-extrabold text-gray-900">{{ formatearCOP(costoMaterialesUnitario) }}</span>
                </div>
              </div>
            </div>
          </section>

          <!-- Historial -->
          <section class="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <header class="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-gray-50 px-4 sm:px-5 py-3">
              <div class="flex items-center gap-2">
                <Save class="h-4 w-4 text-gray-500" />
                <h2 class="text-sm font-bold uppercase tracking-wide text-gray-700">
                  Cálculos guardados
                </h2>
                <span
                  v-if="historialCalculos.length"
                  class="rounded-full bg-corporativo-rosa/10 px-2 py-0.5 text-xs font-bold text-corporativo-rosa"
                >
                  {{ historialCalculos.length }}
                </span>
              </div>
              <button
                v-if="historialCalculos.length"
                type="button"
                class="text-xs font-semibold text-red-500 transition hover:text-red-700"
                @click="limpiarHistorial"
              >
                Limpiar todo
              </button>
            </header>

            <div v-if="!historialCalculos.length" class="p-6 sm:p-8 text-center text-sm text-gray-400">
              <Save class="mx-auto mb-2 h-8 w-8 opacity-40" />
              <p>No hay cálculos guardados.</p>
              <p class="mt-1 text-xs">
                Configura el lote y pulsa <strong class="text-corporativo-rosa">"Guardar cálculo"</strong>.
              </p>
            </div>

            <ul v-else class="max-h-96 divide-y divide-gray-100 overflow-y-auto">
              <li v-for="calculo in historialCalculos" :key="calculo.id" class="p-3 sm:p-4 transition hover:bg-gray-50">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <p class="text-sm font-bold text-gray-900 truncate">{{ calculo.formula_nombre }}</p>
                      <span class="rounded-md bg-gray-100 px-1.5 py-0.5 text-xs font-semibold text-gray-600">
                        x{{ calculo.cantidad }}
                      </span>
                    </div>
                    <p class="mt-0.5 text-xs text-gray-400">{{ calculo.fecha }}</p>

                    <div class="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
                      <div class="flex justify-between gap-2">
                        <span class="text-gray-500">Costo unit.:</span>
                        <span class="font-semibold text-gray-700">{{ formatearCOP(calculo.resumen.costoUnitario) }}</span>
                      </div>
                      <div class="flex justify-between gap-2">
                        <span class="text-gray-500">Costo lote:</span>
                        <span class="font-semibold text-gray-700">{{ formatearCOP(calculo.resumen.costoTotalLote) }}</span>
                      </div>
                      <div class="flex justify-between gap-2">
                        <span class="text-gray-500">Ganancia:</span>
                        <span
                          class="font-semibold"
                          :class="calculo.resumen.gananciaTotal >= 0 ? 'text-emerald-600' : 'text-red-600'"
                        >
                          {{ formatearCOP(calculo.resumen.gananciaTotal) }}
                        </span>
                      </div>
                      <div class="flex justify-between gap-2">
                        <span class="text-gray-500">Margen:</span>
                        <span
                          class="font-semibold"
                          :class="calculo.resumen.margenGanancia >= 0 ? 'text-emerald-600' : 'text-red-600'"
                        >
                          {{ Number(calculo.resumen.margenGanancia || 0).toFixed(1) }}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div class="flex shrink-0 flex-col sm:flex-row items-center gap-1">
                    <button
                      type="button"
                      class="rounded-md p-1.5 text-gray-400 transition hover:bg-corporativo-rosa/10 hover:text-corporativo-rosa"
                      title="Cargar"
                      @click="restaurarCalculo(calculo)"
                    >
                      <RotateCcw class="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      class="rounded-md p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                      title="Eliminar"
                      @click="eliminarCalculo(calculo.id)"
                    >
                      <X class="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            </ul>
          </section>
        </div>

        <!-- Columna derecha -->
        <section class="space-y-4">
          <!-- Resumen -->
          <div class="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
            <h3 class="text-sm font-bold uppercase tracking-wide text-gray-700 mb-4">
              Resumen del lote
            </h3>

            <dl class="space-y-3 text-sm">
              <div class="flex justify-between">
                <dt class="text-gray-500">Materiales / unidad</dt>
                <dd class="font-semibold text-gray-900">{{ formatearCOP(costoMaterialesUnitario) }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500">+ Desperdicio ({{ margenDesperdicio }}%)</dt>
                <dd class="font-semibold text-gray-900">{{ formatearCOP(costoMaterialesConDesperdicio - costoMaterialesUnitario) }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500">+ Mano de obra</dt>
                <dd class="font-semibold text-gray-900">{{ formatearCOP(costoManoObra) }}</dd>
              </div>
              <div class="border-t border-gray-100 pt-3 flex justify-between items-baseline">
                <dt class="font-bold text-gray-700">Costo unitario</dt>
                <dd class="text-base sm:text-lg font-extrabold text-gray-900">{{ formatearCOP(costoUnitarioTotal) }}</dd>
              </div>
              <div class="border-t border-gray-100 pt-3 flex justify-between items-baseline">
                <dt class="font-bold text-gray-700">Costo total lote</dt>
                <dd class="text-lg sm:text-xl font-extrabold text-corporativo-rosa">{{ formatearCOP(costoTotalLote) }}</dd>
              </div>
            </dl>

            <button
              type="button"
              :disabled="!formulaSeleccionada || cantidadAProducir < 1 || !factibilidad.todosSuficientes"
              @click="abrirModalOrden"
              :title="!formulaSeleccionada ? 'Selecciona una fórmula de producción' : cantidadAProducir < 1 ? 'Ingresa una cantidad mayor a 0' : !factibilidad.todosSuficientes ? 'Stock de materias primas insuficiente para generar la orden' : 'Generar orden de producción'"
              class="w-full mt-4 sm:mt-5 py-3 px-4 bg-corporativo-rosa hover:bg-pink-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ClipboardCheck class="w-4 h-4" />
              <span class="truncate">Generar Orden</span>
            </button>
            <p v-if="formulaSeleccionada && !factibilidad.todosSuficientes" class="mt-2 text-center text-xs text-red-600 font-medium">
              ⚠️ Insumos insuficientes en bodega para este lote. Revisa la factibilidad abajo.
            </p>
          </div>

          <!-- Rentabilidad -->
          <div class="rounded-2xl border border-gray-200 bg-gradient-to-br from-pink-50 to-rose-50 p-4 sm:p-5 shadow-sm">
            <div class="flex items-center gap-2 mb-3">
              <TrendingUp class="h-4 w-4 text-corporativo-rosa" />
              <h3 class="text-sm font-bold uppercase tracking-wide text-gray-700">
                Rentabilidad
              </h3>
            </div>

            <dl class="space-y-2 text-sm">
              <div class="flex justify-between">
                <dt class="text-gray-600">Precio venta</dt>
                <dd class="font-semibold text-gray-900">{{ formatearCOP(precioVenta) }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-600">Margen / unidad</dt>
                <dd class="font-semibold" :class="margenUnitario >= 0 ? 'text-emerald-600' : 'text-red-600'">
                  {{ formatearCOP(margenUnitario) }}
                </dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-600">Ingreso lote</dt>
                <dd class="font-semibold text-gray-900">{{ formatearCOP(ingresoTotal) }}</dd>
              </div>
              <div class="border-t border-pink-100 pt-2 flex justify-between items-baseline">
                <dt class="font-bold text-gray-700">Ganancia neta</dt>
                <dd class="text-base sm:text-lg font-extrabold" :class="gananciaTotal >= 0 ? 'text-emerald-600' : 'text-red-600'">
                  {{ formatearCOP(gananciaTotal) }}
                </dd>
              </div>
              <div class="flex justify-between items-center pt-1">
                <dt class="text-xs text-gray-500">Margen %</dt>
                <dd class="text-sm sm:text-base font-bold" :class="margenGanancia >= 0 ? 'text-emerald-600' : 'text-red-600'">
                  {{ margenGanancia.toFixed(1) }}%
                </dd>
              </div>
            </dl>
          </div>

          <!-- Precio sugerido -->
          <div class="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-4 sm:p-5 shadow-sm">
            <div class="flex items-center gap-2 mb-3">
              <Lightbulb class="h-4 w-4 text-amber-600" />
              <h3 class="text-sm font-bold uppercase tracking-wide text-gray-700">
                Precio sugerido
              </h3>
            </div>

            <div class="mb-3">
              <label class="mb-1 flex items-center justify-between text-xs font-semibold text-gray-600">
                <span>Margen objetivo</span>
                <span class="text-sm font-bold text-amber-700">{{ margenObjetivo }}%</span>
              </label>
              <input
                v-model.number="margenObjetivo"
                type="range"
                min="0"
                max="100"
                step="1"
                class="w-full accent-amber-500"
              />
            </div>

            <dl class="space-y-2 text-sm">
              <div class="flex justify-between">
                <dt class="text-gray-600">Costo base</dt>
                <dd class="font-semibold text-gray-900">{{ formatearCOP(costoUnitarioTotal) }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-600">+ Utilidad ({{ margenObjetivo }}%)</dt>
                <dd class="font-semibold text-gray-900">
                  {{ formatearCOP(precioSugeridoSinIva - costoUnitarioTotal) }}
                </dd>
              </div>

              <div class="flex items-center justify-between border-t border-amber-100 pt-2">
                <dt class="flex items-center gap-1.5 text-xs text-gray-600">
                  <Receipt class="h-3.5 w-3.5" /> IVA (19%)
                </dt>
                <dd>
                  <button
                    type="button"
                    class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
                    :class="aplicarIva ? 'bg-amber-500' : 'bg-gray-300'"
                    @click="aplicarIva = !aplicarIva"
                  >
                    <span
                      class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
                      :class="aplicarIva ? 'translate-x-5' : 'translate-x-1'"
                    ></span>
                  </button>
                </dd>
              </div>

              <div v-if="aplicarIva" class="flex justify-between">
                <dt class="text-gray-600">+ IVA</dt>
                <dd class="font-semibold text-gray-900">{{ formatearCOP(ivaCalculado) }}</dd>
              </div>

              <div class="border-t border-amber-100 pt-2 flex justify-between items-baseline">
                <dt class="font-bold text-gray-700">Precio sugerido</dt>
                <dd class="text-base sm:text-lg font-extrabold text-amber-700">
                  {{ formatearCOP(precioSugeridoFinal) }}
                </dd>
              </div>
            </dl>
          </div>

          <!-- Factibilidad -->
          <div
            class="rounded-2xl border p-4 sm:p-5 shadow-sm"
            :class="factibilidad.todosSuficientes
              ? 'border-emerald-200 bg-emerald-50'
              : 'border-red-200 bg-red-50'"
          >
            <div class="flex items-start gap-3">
              <component
                :is="factibilidad.todosSuficientes ? CheckCircle2 : AlertTriangle"
                class="h-5 w-5 shrink-0 mt-0.5"
                :class="factibilidad.todosSuficientes ? 'text-emerald-600' : 'text-red-600'"
              />
              <div class="flex-1 min-w-0">
                <p
                  class="font-bold text-sm"
                  :class="factibilidad.todosSuficientes ? 'text-emerald-800' : 'text-red-800'"
                >
                  <template v-if="factibilidad.todosSuficientes">
                    Insumos suficientes
                  </template>
                  <template v-else>
                    Stock insuficiente
                  </template>
                </p>
                <p
                  class="mt-1 text-xs"
                  :class="factibilidad.todosSuficientes ? 'text-emerald-700' : 'text-red-700'"
                >
                  <template v-if="factibilidad.todosSuficientes">
                    Puedes confeccionar hasta <strong>{{ factibilidad.puedeProducir }} unidades</strong>.
                  </template>
                  <template v-else>
                    Con el stock actual puedes producir <strong>{{ factibilidad.puedeProducir }} unidades</strong>.
                    <template v-if="factibilidad.limitante">
                      Faltan <strong>{{ factibilidad.faltante.toFixed(2) }} {{ factibilidad.limitante.unidad }}</strong> de
                      <strong>{{ factibilidad.limitante.nombre }}</strong>.
                    </template>
                  </template>
                </p>

                <button
                  v-if="!factibilidad.todosSuficientes && factibilidad.puedeProducir > 0"
                  type="button"
                  class="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition"
                  @click="cantidadAProducir = Math.min(10000, Math.max(1, factibilidad.puedeProducir))"
                >
                  Ajustar a {{ factibilidad.puedeProducir }} unidades
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- Modal Orden de Producción -->
    <div
      v-if="modalOrdenAbierto"
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4"
      @click.self="modalOrdenAbierto = false"
    >
      <div class="relative w-full h-full sm:h-auto sm:max-w-lg bg-white sm:rounded-3xl shadow-2xl p-5 sm:p-8 border border-gray-100 overflow-y-auto">
        <button
          type="button"
          @click="modalOrdenAbierto = false"
          class="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100"
        >
          <X class="w-5 h-5" />
        </button>

        <div v-if="!ordenGenerada" class="pt-6 sm:pt-0">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 shrink-0 rounded-xl bg-pink-100 text-corporativo-rosa flex items-center justify-center">
              <ClipboardCheck class="w-5 h-5" />
            </div>
            <div class="min-w-0">
              <h3 class="text-lg font-bold text-gray-900">Generar Orden</h3>
              <p class="text-xs text-gray-500">La referencia la asigna el backend al registrar.</p>
            </div>
          </div>

          <div class="bg-gray-50 rounded-2xl p-4 space-y-2 text-sm border border-gray-200 mb-5">
            <div class="flex justify-between gap-3">
              <span class="text-gray-500">Prenda:</span>
              <strong class="text-gray-900 text-right truncate">{{ formulaSeleccionada?.nombre }}</strong>
            </div>
            <div class="flex justify-between gap-3">
              <span class="text-gray-500">Lote:</span>
              <strong class="text-gray-900">{{ cantidadAProducir }} u.</strong>
            </div>
            <div class="flex justify-between gap-3">
              <span class="text-gray-500">Costo total:</span>
              <strong class="text-corporativo-rosa font-bold">{{ formatearCOP(costoTotalLote) }}</strong>
            </div>
            <div class="flex justify-between gap-3">
              <span class="text-gray-500">Mano de obra:</span>
              <span class="text-gray-800 font-semibold">{{ formatearCOP(costoManoObra * cantidadAProducir) }}</span>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
            <button
              type="button"
              @click="modalOrdenAbierto = false"
              class="px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition order-2 sm:order-1"
            >
              Cancelar
            </button>
            <button
              type="button"
              :disabled="guardandoOrden"
              @click="confirmarOrdenProduccion"
              class="px-5 py-2.5 text-sm font-bold text-white bg-corporativo-rosa hover:bg-pink-700 rounded-xl shadow transition disabled:cursor-not-allowed disabled:opacity-50 order-1 sm:order-2"
            >
              {{ guardandoOrden ? 'Registrando...' : 'Confirmar' }}
            </button>
          </div>
          <p v-if="errorOrden" class="mt-3 text-right text-sm font-medium text-red-600">{{ errorOrden }}</p>
        </div>

        <div v-else class="text-center py-4 space-y-4">
          <div class="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <Check class="w-8 h-8" />
          </div>
          <h3 class="text-xl font-bold text-gray-900">¡Orden programada!</h3>
          <p class="text-sm text-gray-600 max-w-sm mx-auto">
            La orden <strong>{{ numeroOrden || 'registrada' }}</strong> para <strong>{{ resumenOrden.cantidad }} unidades</strong> de {{ resumenOrden.nombre }} ha sido registrada.
            Los insumos requeridos han sido reservados y descontados de materias primas.
          </p>
          <div class="pt-2">
            <button
              type="button"
              @click="modalOrdenAbierto = false"
              class="px-6 py-2.5 bg-gray-900 hover:bg-black text-white text-sm font-bold rounded-xl shadow transition"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>

    <ModalNuevaFormula
      :abierto="modalNuevaFormulaAbierto"
      :productos="formulasDisponibles"
      :materias-primas="materiasPrimas"
      :unidades="unidades"
      @cerrar="modalNuevaFormulaAbierto = false"
      @creada="alCrearFormula"
    />
  </div>
</template>
