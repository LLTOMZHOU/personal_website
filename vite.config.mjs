import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss()],
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: false,
    manifest: true,
    rollupOptions: {
      input: {
        site: "src/client/site.ts",
        gallery: "src/client/gallery.ts",
        assistant: "src/client/assistant/entry.ts"
      }
    }
  }
});
