/** @type {import('tailwindcss').Config} */
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
        // Todas las clases pink-* pasan a tonos arena/pizarra de la tienda
        pink: {
          50: '#faf7f2', 100: '#f3eee6', 200: '#e4ddd2', 300: '#d4c2a8',
          400: '#b5a385', 500: '#56657a', 600: '#4a5869', 700: '#3d4857',
          800: '#2f3844', 900: '#222831', 950: '#111111'
        }
      },
      fontFamily: {
        titulos: ['Poppins', 'sans-serif'],
        lectura: ['Montserrat', 'Inter', 'sans-serif'],
        tienda: ['Inter', 'Montserrat', 'sans-serif']
      }
    },
  },
  plugins: [],
}