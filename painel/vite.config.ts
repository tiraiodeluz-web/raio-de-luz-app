import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// "@/..." aponta pra pasta src do app: o painel reaproveita os tipos do
// banco, o HTML do PDF do pedido e os formatadores, sem copiar código.
export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) },
  },
  server: { port: 5174 },
});
