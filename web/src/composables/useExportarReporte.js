// Exportación de reportes a Excel (.xlsx) y PDF para el panel administrativo.
// Las librerías se cargan bajo demanda para no engordar el paquete inicial.
//
// columnas: [{ titulo: 'Fecha', clave: 'fecha', ancho: 14, formato: 'moneda' | 'numero' | 'texto' }]
// filas:    [{ fecha: '2026-11-03', ... }]

const COLOR_ENCABEZADO = '56657A'; // pizarra de la tienda
const COLOR_ACENTO = 'F3EEE6'; // arena suave

function nombreArchivo(base, extension) {
  const fecha = new Date().toISOString().slice(0, 10);
  const limpio = String(base || 'reporte')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .toLowerCase();
  return `${limpio}_${fecha}.${extension}`;
}

function valorCelda(fila, columna) {
  const valor = typeof columna.valor === 'function' ? columna.valor(fila) : fila[columna.clave];
  return valor ?? '';
}

function formatearTexto(valor, formato) {
  if (formato === 'moneda') {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
      .format(Number(valor) || 0);
  }
  if (formato === 'numero') {
    return new Intl.NumberFormat('es-CO').format(Number(valor) || 0);
  }
  return String(valor);
}

function descargar(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** hojas: [{ nombre, titulo?, columnas, filas }] */
export async function exportarExcel({ archivo, hojas }) {
  const { default: ExcelJS } = await import('exceljs');
  const libro = new ExcelJS.Workbook();
  libro.creator = 'FashionStyle';
  libro.created = new Date();

  hojas.forEach((hoja) => {
    const ws = libro.addWorksheet(String(hoja.nombre || 'Reporte').slice(0, 31));
    let filaInicio = 1;

    if (hoja.titulo) {
      ws.mergeCells(1, 1, 1, Math.max(1, hoja.columnas.length));
      const celda = ws.getCell(1, 1);
      celda.value = hoja.titulo;
      celda.font = { bold: true, size: 14 };
      ws.getCell(2, 1).value = `Generado el ${new Date().toLocaleString('es-CO')}`;
      ws.getCell(2, 1).font = { italic: true, size: 9, color: { argb: '6F6F6F' } };
      filaInicio = 4;
    }

    const encabezado = ws.getRow(filaInicio);
    hoja.columnas.forEach((col, i) => {
      const celda = encabezado.getCell(i + 1);
      celda.value = col.titulo;
      celda.font = { bold: true, color: { argb: 'FFFFFF' } };
      celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ENCABEZADO } };
      celda.alignment = { vertical: 'middle' };
      ws.getColumn(i + 1).width = col.ancho || Math.max(12, col.titulo.length + 4);
      if (col.formato === 'moneda') ws.getColumn(i + 1).numFmt = '"$"#,##0';
      if (col.formato === 'numero') ws.getColumn(i + 1).numFmt = '#,##0';
    });

    hoja.filas.forEach((fila, indice) => {
      const r = ws.getRow(filaInicio + 1 + indice);
      hoja.columnas.forEach((col, i) => {
        const valor = valorCelda(fila, col);
        r.getCell(i + 1).value = ['moneda', 'numero'].includes(col.formato) ? Number(valor) || 0 : valor;
      });
      if (indice % 2 === 1) {
        r.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ACENTO } }; });
      }
    });

    ws.views = [{ state: 'frozen', ySplit: filaInicio }];
  });

  const buffer = await libro.xlsx.writeBuffer();
  descargar(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    nombreArchivo(archivo, 'xlsx')
  );
}

/** secciones: [{ titulo, columnas, filas }] — varias tablas en un mismo PDF. */
export async function exportarPDF({ archivo, titulo, subtitulo, secciones, horizontal = false }) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ orientation: horizontal ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });
  const ancho = doc.internal.pageSize.getWidth();

  doc.setFillColor(17, 17, 17);
  doc.rect(0, 0, ancho, 56, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('FashionStyle', 32, 34);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(titulo || 'Reporte', ancho - 32, 34, { align: 'right' });

  doc.setTextColor(43, 43, 43);
  doc.setFontSize(9);
  doc.text(subtitulo || `Generado el ${new Date().toLocaleString('es-CO')}`, 32, 76);

  let y = 92;
  secciones.forEach((seccion) => {
    if (seccion.titulo) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(seccion.titulo, 32, y + 8);
      y += 16;
    }
    autoTable(doc, {
      startY: y,
      head: [seccion.columnas.map((c) => c.titulo)],
      body: seccion.filas.map((fila) => seccion.columnas.map((c) => formatearTexto(valorCelda(fila, c), c.formato))),
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 4, textColor: [43, 43, 43] },
      headStyles: { fillColor: [86, 101, 122], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [243, 238, 230] },
      columnStyles: Object.fromEntries(
        seccion.columnas.map((c, i) => [i, ['moneda', 'numero'].includes(c.formato) ? { halign: 'right' } : {}])
      ),
      margin: { left: 32, right: 32 },
    });
    y = doc.lastAutoTable.finalY + 24;
  });

  const paginas = doc.getNumberOfPages();
  for (let i = 1; i <= paginas; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(111, 111, 111);
    doc.text(`Página ${i} de ${paginas}`, ancho - 32, doc.internal.pageSize.getHeight() - 20, { align: 'right' });
  }

  doc.save(nombreArchivo(archivo, 'pdf'));
}

export function useExportarReporte() {
  return { exportarExcel, exportarPDF };
}
