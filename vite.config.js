import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [vue()],
  // GitHub Pages sirve la app en https://<usuario>.github.io/vocab-app/
  base: command === 'build' ? '/vocab-app/' : '/',
}))
