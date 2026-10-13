import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';

export default defineConfig({
 base:'/prototype/',
 build:{
  outDir:'../dist/prototype',
  emptyOutDir:true,
  rollupOptions:{input:{
   app:fileURLToPath(new URL('./index.html',import.meta.url)),
   materialStudy:fileURLToPath(new URL('./material-study.html',import.meta.url)),
   cabinetStudy:fileURLToPath(new URL('./cabinet-study.html',import.meta.url)),
  }},
 },
 server:{port:4175},
});
