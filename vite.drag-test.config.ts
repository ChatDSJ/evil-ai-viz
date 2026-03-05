import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist-drag-test",
    rollupOptions: { input: { main: "drag-test.html" } },
  },
});
