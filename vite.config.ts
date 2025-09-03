import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import dotenv from 'dotenv'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// Load environment variables
dotenv.config({ path: '.env.local' })
// https://vitejs.dev/config/
export default defineConfig({ 
  resolve: {
    alias: {
      'ws': path.resolve(__dirname, './src/shims/ws-browser.js'),
      '@': path.resolve(__dirname, './src'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/utils': path.resolve(__dirname, './src/utils')
    }
  },
  define: {
    'process.env.GOOGLE_GENERATIVE_AI_API_KEY': JSON.stringify(process.env.GOOGLE_GENERATIVE_AI_API_KEY),
    'process.env.DEEPGRAM_API_KEY': JSON.stringify(process.env.DEEPGRAM_API_KEY),
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['buffer', 'process', 'events', 'stream-browserify', 'util']
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        overlay: path.resolve(__dirname, 'overlay.html')
      }
    }
  },
  ssr: {
    noExternal: ['streamdown'],
  },
  plugins: [
    react(),
    tailwindcss(),
    nodePolyfills(),
    electron({
      main: {
        // Shortcut of `build.lib.entry`.
        entry: 'electron/main.ts',
      },
      preload: {
        // Shortcut of `build.rollupOptions.input`.
        // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
        input: path.join(__dirname, 'electron/preload.ts'),
        vite: {
          build: {
            rollupOptions: {
              output: {
                format: 'cjs',
                entryFileNames: '[name].cjs',
              },
            },
          },
        },
      },
      // Ployfill the Electron and Node.js API for Renderer process.
      // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
      // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
      renderer: process.env.NODE_ENV === 'test'
        // https://github.com/electron-vite/vite-plugin-electron-renderer/issues/78#issuecomment-2053600808
        ? undefined
        : {},
    }),
  ],
})
