import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Polyfill process.env για συμβατότητα
  define: {
    'process.env': {} 
  },

  server: {
    port: 8080,      // Το βάζουμε στην 8080 για να μην κολλάει με το άλλο σου app
    strictPort: true, 
    host: '127.0.0.1', 
  },

  // ΑΦΑΙΡΕΘΗΚΕ ΤΟ EXTERNAL: 
  // Τώρα το Vite θα διαβάζει όλες τις βιβλιοθήκες από το node_modules σου
  build: {
    rollupOptions: {
      external: [] // Το αφήνουμε κενό για να φορτώνουν όλα τοπικά
    }
  }
});