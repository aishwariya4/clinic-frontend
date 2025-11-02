// vite.config.js (frontend root)
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)), // '@' -> src/
    },
  },
  server: {
    port: 3000, // optional: keep using 3000
  },
});
