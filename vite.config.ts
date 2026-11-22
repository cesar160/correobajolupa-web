import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// La app siempre llama a la API con URL relativa /api/v1 (mismo origen).
// En desarrollo Vite hace de proxy inverso; en producción lo hace nginx (ver docker/).
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
});
