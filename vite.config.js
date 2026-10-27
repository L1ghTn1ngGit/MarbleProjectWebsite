import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({build:{outDir:'dist',rollupOptions:{input:{journalist:resolve(process.cwd(),'index.html'),presentation:resolve(process.cwd(),'presentation.html'),intro:resolve(process.cwd(),'intro.html')}}},publicDir:'public'});

