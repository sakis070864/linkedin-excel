import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Ορισμός process.env για συμβατότητα με βιβλιοθήκες
  define: {
    'process.env': {} 
  },

  server: {
    port: 8080,      // Χρησιμοποιούμε την 8080 για να μην κολλάει με το άλλο app
    strictPort: true, 
    host: '127.0.0.1', 
  },

  // Αφαιρέσαμε τα external για να φορτώνουν όλα από το node_modules σου
  build: {
    rollupOptions: {
      external: [] 
    }
  }
});