import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  // 'info' показывает Local/Network URL при npm run dev; 'error' скрывает почти всё
  logLevel: 'info',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    // Чтобы вендорные библиотеки кэшировались отдельно — после деплоя
    // пользователю не приходится перекачивать React/Radix/Query, если
    // изменился только наш код.
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('react-dom') || id.includes('/react/')) return 'react-vendor'
          if (id.includes('@radix-ui')) return 'radix-vendor'
          if (id.includes('@tanstack')) return 'query-vendor'
          if (id.includes('lucide-react')) return 'icons-vendor'
          if (id.includes('react-router')) return 'router-vendor'
          return 'vendor'
        },
      },
    },
    // Чанк-предупреждение поднимаем — основной vendor неминуемо >500КБ
    chunkSizeWarningLimit: 700,
  },
})
