import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist', // Build çıktılarının 'dist' klasörüne yazılacağından emin olalım
  },
  base: '/', // Netlify'da kök dizinde yayınlanacağı için bu ayar önemli
})