import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  // URL por defecto segura
  const defaultApi = 'https://fashionstyle.api.adsocidm.com/public/api';
  const rawUrl = env.VITE_API_BASE_URL || defaultApi;

  // Asegura que sea una URL absoluta válida para extraer el origin
  let backendOrigin;
  try {
    backendOrigin = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`).origin;
  } catch {
    backendOrigin = 'https://fashionstyle.api.adsocidm.com';
  }

  return {
    // Keep generated asset URLs valid when dist/index.html is opened directly.
    base: './',
    plugins: [
      vue(),
      vueDevTools(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: {
      port: 3000,
      open: true,
      proxy: {
        '/api': { target: backendOrigin, changeOrigin: true },
        '/sanctum': { target: backendOrigin, changeOrigin: true },
        '/storage': { target: backendOrigin, changeOrigin: true }
      }
    }
  };
});