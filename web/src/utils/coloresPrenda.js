// Traduce el texto libre del campo "color" de Gestión de Prendas a muestras visuales.
// Acepta nombres en español (con o sin tildes), combinaciones ("Negro / Blanco",
// "Azul y rojo") y códigos hexadecimales (#1f2a44).

const PALETA = {
  negro: '#111111', blanco: '#ffffff', marfil: '#f4efe1', crema: '#f2e8d5', hueso: '#ece3d0',
  beige: '#d9c7a7', arena: '#d4c2a8', camel: '#b8864b', cafe: '#6b4423', marron: '#6b4423',
  chocolate: '#4a2c1a', mostaza: '#c9a227', amarillo: '#f2c94c', naranja: '#e8833a',
  coral: '#ef7c6b', rojo: '#c0392b', vinotinto: '#6d1a2c', vino: '#6d1a2c', burdeos: '#6d1a2c',
  rosado: '#f2b8c6', rosa: '#f2b8c6', fucsia: '#d63384', lila: '#c3a6d8', morado: '#6f42c1',
  violeta: '#7b4fa0', azul: '#2e5aac', celeste: '#8ecae6', turquesa: '#2ab3b1', navy: '#1f2a44',
  marino: '#1f2a44', denim: '#4a6a8a', jean: '#4a6a8a', verde: '#2f7d4f', oliva: '#6b7a3a',
  militar: '#4b5320', menta: '#a8dcc0', gris: '#8a8a8a', plomo: '#6f6f6f', grafito: '#3c3c3c',
  plata: '#c0c0c0', dorado: '#c8a64b', oro: '#c8a64b', caqui: '#a89f68', kaki: '#a89f68',
  terracota: '#c06a45', salmon: '#f4a582',
};

const MODIFICADORES = { oscuro: -0.35, claro: 0.4, palo: 0.45, pastel: 0.5 };

function normalizar(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

function ajustar(hex, factor) {
  const n = parseInt(hex.slice(1), 16);
  const canal = (v) => Math.round(factor >= 0 ? v + (255 - v) * factor : v * (1 + factor));
  const r = canal((n >> 16) & 255);
  const g = canal((n >> 8) & 255);
  const b = canal(n & 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/** Hex de un nombre de color, o null si no se reconoce. */
export function hexDeColor(nombre) {
  const texto = String(nombre ?? '').trim();
  if (/^#[0-9a-f]{6}$/i.test(texto)) return texto;

  const palabras = normalizar(texto).split(/\s+/);
  const base = palabras.find((p) => PALETA[p]) ?? (palabras.join('') in PALETA ? palabras.join('') : null);
  if (!base) return null;

  const modificador = palabras.find((p) => MODIFICADORES[p] !== undefined);
  return modificador ? ajustar(PALETA[base], MODIFICADORES[modificador]) : PALETA[base];
}

/** Separa "Negro / Blanco", "Azul y rojo", "Rojo, Negro" en colores individuales. */
export function separarColores(texto) {
  return String(texto ?? '')
    .split(/\s*(?:,|\/|\||;|\s+y\s+|\s+e\s+|\s*&\s*)\s*/i)
    .map((c) => c.trim())
    .filter(Boolean);
}

/** Fondo CSS de la muestra: un color sólido o un degradado partido si hay varios. */
export function fondoMuestra(texto) {
  const hexes = separarColores(texto).map((c) => hexDeColor(c) ?? '#d4c2a8');
  if (!hexes.length) return '#d4c2a8';
  if (hexes.length === 1) return hexes[0];
  const paso = 100 / hexes.length;
  return `linear-gradient(135deg, ${hexes.map((h, i) => `${h} ${i * paso}% ${(i + 1) * paso}%`).join(', ')})`;
}

export function mismoColor(a, b) {
  return normalizar(a) === normalizar(b);
}

export function claveNombrePrenda(nombre) {
  return normalizar(nombre).replace(/\s+/g, ' ');
}
