import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import electron from 'vite-plugin-electron'
import { rmSync } from 'node:fs'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  rmSync('dist-electron', { recursive: true, force: true })

  return {
    plugins: [
      vue(),
      vueJsx(),
      vueDevTools(),
      electron([
        {
          // 主进程
          entry: 'electron/main/main.js',
          onstart: (options) => options.startup(),
          vite: {
            build: {
              outDir: 'dist-electron/main',
              minify: command === 'build',
              rolldownOptions: {
                external: ['electron-log', 'electron-log/main', 'electron-log/renderer', 'electron-log/preload']
              }
            }
          }
        },
        {
          // 预加载脚本
          entry: 'electron/preload/preload.js',
          onstart: (options) => options.reload(),
          vite: {
            build: {
              outDir: 'dist-electron/preload',
              minify: command === 'build',
              rolldownOptions: {
                external: ['electron-log']
              }
            }
          }
        }
      ])
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    optimizeDeps: {
      exclude: ['pdfjs-dist']
    },
    // 生产构建配置
    build: {
      outDir: 'dist',
      emptyOutDir: true
    }
  }
})