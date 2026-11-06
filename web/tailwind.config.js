/** @type {import('tailwindcss').Config} */

// Paleta única de FashionStyle: la misma que define Tienda.css (--fs-*).
// La tienda y el panel administrativo comparten tipografía, neutros cálidos
// y acentos; los tonos semánticos (verde, ámbar, rojo) se conservan.
const neutros = {
  50: '#faf8f5', 100: '#f3eee6', 200: '#e4ddd2', 300: '#d4cbbd', 400: '#a3a3a3',
  500: '#6f6f6f', 600: '#555555', 700: '#2b2b2b', 800: '#1f1f1f', 900: '#111111', 950: '#0a0a0a'
};

const pizarra = {
  50: '#f4f6f8', 100: '#e6eaef', 200: '#cdd4dd', 300: '#a9b4c2', 400: '#7d8a9c',
  500: '#56657a', 600: '#4a5869', 700: '#3d4857', 800: '#2f3844', 900: '#222831', 950: '#111111'
};

const arena = {
  50: '#faf7f2', 100: '#f3eee6', 200: '#e4ddd2', 300: '#d4c2a8', 400: '#b5a385',
  500: '#56657a', 600: '#4a5869', 700: '#3d4857', 800: '#2f3844', 900: '#222831', 950: '#111111'
};

const fuenteTienda = ['Inter', 'Montserrat', 'system-ui', 'sans-serif'];

export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta de la tienda (mismos valores que Tienda.css)
        corporativo: {
          rosa: '#111111',
          'rosa-hover': '#333333',
          'rosa-claro': '#f3eee6',
          oscuro: '#56657a',
          panel: '#f7f4ef'
        },
        tienda: {
          negro: '#111111',
          texto: '#2b2b2b',
          gris: '#6f6f6f',
          crema: '#f7f4ef',
          arena: '#ece5da',
          'arena-suave': '#f3eee6',
          'arena-oscura': '#d4c2a8',
          pizarra: '#56657a',
          borde: '#e4ddd2',
          rojo: '#d9434b'
        },
        // Neutros cálidos de la tienda en lugar de los grises fríos por defecto.
        gray: neutros,
        slate: pizarra,
        // Acentos decorativos heredados del panel → tonos pizarra/arena de la tienda.
        pink: arena,
        blue: pizarra,
        indigo: pizarra,
        purple: pizarra,
        teal: pizarra
      },
      fontFamily: {
        sans: fuenteTienda,
        titulos: fuenteTienda,
        lectura: fuenteTienda,
        tienda: fuenteTienda
      }
    },
  },
  plugins: [],
}
