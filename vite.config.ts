/// <reference types="vitest" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

// GitHub Pages has no SPA fallback: a refresh on /robot would 404. Serving a
// copy of index.html as 404.html lets Pages return the app for any deep link,
// and React Router then resolves the route client-side.
function spa404Fallback(): Plugin {
  return {
    name: 'spa-404-fallback',
    apply: 'build',
    closeBundle() {
      const index = resolve(__dirname, 'dist/index.html')
      if (existsSync(index)) copyFileSync(index, resolve(__dirname, 'dist/404.html'))
    },
  }
}

// closed-chain-ik@0.0.3 uses removed Three.js APIs and depends on svd-js (UMD).
// This plugin handles both issues so neither needs special optimizeDeps treatment.
function threeCompatShim(): Plugin {
  return {
    name: 'three-compat-shim',
    transform(code, id) {
      // Rewrite removed Three.js APIs used by closed-chain-ik
      if (id.includes('closed-chain-ik')) {
        return code
          .replace(/\bBoxBufferGeometry\b/g, 'BoxGeometry')
          .replace(/\bCylinderBufferGeometry\b/g, 'CylinderGeometry')
          .replace(/\bSphereBufferGeometry\b/g, 'SphereGeometry')
      }
      // svd-js and linear-solve ship as CJS/UMD with no ESM exports.
      // Wrap each in a synthetic module/exports scope so the CJS assignments work,
      // then re-export what closed-chain-ik expects.
      if (id.includes('svd-js') && id.includes('.min.js')) {
        return [
          'const module = { exports: {} };',
          'const exports = module.exports;',
          code,
          'export const SVD = module.exports.SVD ?? module.exports;',
          'export default module.exports;',
        ].join('\n')
      }
      if (id.includes('linear-solve')) {
        return [
          'const module = { exports: {} };',
          'const exports = module.exports;',
          code,
          'export default module.exports;',
        ].join('\n')
      }
    },
  }
}

export default defineConfig(({ command }) => ({
  // Dev stays at "/"; the production build is served from the project-pages
  // subpath https://<user>.github.io/web3d-learning/.
  base: command === 'build' ? '/web3d-learning/' : '/',
  plugins: [threeCompatShim(), spa404Fallback(), react()],
  optimizeDeps: {
    // closed-chain-ik uses removed Three.js APIs; exclude from pre-bundling so
    // threeCompatShim can rewrite the code before rolldown resolves the imports.
    // svd-js (its UMD dep) is also handled by threeCompatShim directly.
    exclude: ['closed-chain-ik'],
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    passWithNoTests: true,
  },
}))
