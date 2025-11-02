import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 3000 },   // or omit to use default 5173
  preview: { port: 3000 }
});
