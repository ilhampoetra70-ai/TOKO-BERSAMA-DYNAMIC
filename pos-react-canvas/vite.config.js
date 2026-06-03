import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  define: {
    'import.meta.env.VITE_TOKOBERSAMA_BUILD_ID': JSON.stringify(process.env.TOKOBERSAMA_BUILD_ID || new Date().toISOString().replace(/\D/g, '').slice(0, 14)),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    modulePreload: false,
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          const normalized = id.replaceAll('\\', '/');
          const packagePath = normalized.split('/node_modules/')[1] ?? '';
          if (packagePath.startsWith('react/') || packagePath.startsWith('react-dom/') || packagePath.startsWith('scheduler/')) return 'vendor-react';
          if (packagePath.startsWith('recharts/') || packagePath.startsWith('d3-')) return 'vendor-charts';
          if (packagePath.startsWith('xlsx/')) return 'xlsx';
          return undefined;
        },
      },
    },
  },
});
