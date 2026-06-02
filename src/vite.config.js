import { defineConfig } from 'vite';

export default defineConfig({
  // Proxy de desenvolvimento: evita CORS ao rodar `vite dev`.
  // As chamadas /api/* e /health do frontend são redirecionadas para o backend local.
  // Em produção, defina VITE_API_URL no .env e o proxy é ignorado.
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
