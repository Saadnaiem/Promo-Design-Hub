import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Ensure assets are loaded correctly if deployed to a root domain
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Increase chunk size limit to avoid warnings for the PDF library
    chunkSizeWarningLimit: 1600
  }
})