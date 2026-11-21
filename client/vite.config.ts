import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3333',
    },
  },
  // `npm run preview -w client`: testa o build de produção com a API local
  preview: {
    port: 4173,
    proxy: {
      '/api': 'http://localhost:3333',
    },
  },
  build: {
    // Saída usada pela Vercel (outputDirectory = client/dist)
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
  },
});
