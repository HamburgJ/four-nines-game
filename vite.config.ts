import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // VITE_BASE_URL wins so burgerfun can vendor this build at /four-nines/play/.
  // The CF_PAGES branch is only a fallback for a bare standalone Pages deploy;
  // without this precedence, Cloudflare's CF_PAGES=1 forces base '/four-nines/'
  // and the assets 404 under the vendored /four-nines/play/ location.
  base: process.env.VITE_BASE_URL || (process.env.CF_PAGES ? '/four-nines/' : '/'),
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
