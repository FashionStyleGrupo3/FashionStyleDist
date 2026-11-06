import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { resolverUrlAlmacenamiento } from '@/composables/useImagenStorage';

export const useCarritoStore = defineStore('carrito', () => {
  const items = ref(JSON.parse(localStorage.getItem('fs_carrito') || '[]'));
  const cajonAbierto = ref(false);

  const totalPrendas = computed(() =>
    items.value.reduce((acc, i) => acc + Number(i.cantidad || 0), 0)
  );

  const totalMonto = computed(() =>
    items.value.reduce((acc, i) => acc + (Number(i.precio || 0) * Number(i.cantidad || 0)), 0)
  );

  // Total a precio de lista (sin descuentos) y ahorro por promociones.
  const totalOriginal = computed(() =>
    items.value.reduce((acc, i) => acc + (Number(i.precioOriginal || i.precio || 0) * Number(i.cantidad || 0)), 0)
  );

  const totalAhorro = computed(() => Math.max(0, totalOriginal.value - totalMonto.value));

  // IDs de categorías y catálogos presentes en el carrito (sin duplicados).
  const categoriasEnCarrito = computed(() => {
    const set = new Set();
    for (const item of items.value) {
      if (item.categoriaId) set.add(item.categoriaId);
      if (item.catalogoId) set.add(`cat-${item.catalogoId}`);
    }
    return Array.from(set);
  });

  const idsEnCarrito = computed(() =>
    items.value.map(i => i.productoId).filter(Boolean)
  );

  function sincronizar() {
    localStorage.setItem('fs_carrito', JSON.stringify(items.value));
  }

  function agregarPrenda(producto, variante, cantidad = 1) {
    const vId = variante.id_variante ?? variante.id;
    const pId = producto.id_producto ?? producto.id;
    const precio = Number(variante.precio_venta ?? variante.precio ?? producto.precio_venta ?? producto.precio_base ?? 0);
    const precioOriginal = Number(variante.precio_original ?? precio);
    const stock = Number(variante.stock || 0);

    const primeraImagen = Array.isArray(producto.imagenes) && producto.imagenes.length > 0
      ? (producto.imagenes.find(img => img.es_principal) || producto.imagenes[0])
      : (producto.imagen || null);

    const urlImagen = resolverUrlAlmacenamiento(primeraImagen);

    const idx = items.value.findIndex(i => String(i.varianteId) === String(vId));
    if (idx !== -1) {
      items.value[idx].cantidad = Math.min(items.value[idx].cantidad + cantidad, stock || Infinity);
    } else {
      items.value.push({
        productoId: pId,
        nombre: producto.nombre,
        imagen: urlImagen,
        varianteId: vId,
        talla: variante.talla,
        sku: variante.sku,
        precio,
        precioOriginal,
        stockMaximo: stock,
        cantidad: Math.min(cantidad, stock || 1),
        categoriaId: producto.categoria_id ?? producto.categoria?.id_categoria ?? producto.categoria?.id ?? null,
        catalogoId: producto.catalogo_id ?? producto.catalogo?.id_catalogo ?? producto.catalogo?.id ?? null
      });
    }
    sincronizar();
    cajonAbierto.value = true;
    return true;
  }

  function actualizarCantidad(varianteId, nuevaCantidad) {
    const item = items.value.find(i => String(i.varianteId) === String(varianteId));
    if (item) {
      if (nuevaCantidad <= 0) {
        eliminarPrenda(varianteId);
      } else {
        item.cantidad = item.stockMaximo > 0 ? Math.min(nuevaCantidad, item.stockMaximo) : nuevaCantidad;
        sincronizar();
      }
    }
  }

  function eliminarPrenda(varianteId) {
    items.value = items.value.filter(i => String(i.varianteId) !== String(varianteId));
    sincronizar();
  }

  // Actualiza precio final y precio de lista de los ítems (p. ej. al cambiar las promociones vigentes).
  function actualizarPrecios(cambios = []) {
    let hubo = false;
    for (const c of cambios) {
      const item = items.value.find(i => String(i.varianteId) === String(c.varianteId));
      if (!item) continue;
      if (item.precio !== c.precio || item.precioOriginal !== c.precioOriginal) {
        item.precio = c.precio;
        item.precioOriginal = c.precioOriginal;
        hubo = true;
      }
    }
    if (hubo) sincronizar();
  }

  function vaciarCarrito() {
    items.value = [];
    sincronizar();
  }


  function actualizarStockDisponible(variantes = []) {
    const stockPorVariante = new Map(
      variantes.map((variante) => [
        String(variante.id_variante ?? variante.id),
        Math.max(0, Number(variante.stock) || 0)
      ])
    );

    let cambios = false;

    for (const item of items.value) {
      const id = String(item.varianteId);

      if (!stockPorVariante.has(id)) continue;

      const stockReal = stockPorVariante.get(id);

      if (Number(item.stockMaximo) !== stockReal) {
        item.stockMaximo = stockReal;
        cambios = true;
      }

    }

    if (cambios) sincronizar();
  }


  return {
    items,
    cajonAbierto,
    totalPrendas,
    totalMonto,
    totalOriginal,
    totalAhorro,
    categoriasEnCarrito,
    idsEnCarrito,
    agregarPrenda,
    agregarItem: agregarPrenda,
    actualizarCantidad,
    eliminarPrenda,
    actualizarPrecios,
    vaciarCarrito,
    limpiarCarrito: vaciarCarrito,
    actualizarStockDisponible
  };
});
