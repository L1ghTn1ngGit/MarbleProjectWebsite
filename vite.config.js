import { defineConfig } from 'vite';

export default defineConfig({
  // put your built files in "dist/"
  build: {
    outDir: 'dist',
  },
  // public/ folder is served as-is (CSV, images, video)
  publicDir: 'public',
});
