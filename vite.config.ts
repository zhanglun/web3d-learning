/// <reference types="vitest" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react-swc'

// closed-chain-ik@0.0.3 uses removed Three.js APIs (BoxBufferGeometry etc.).
// This plugin rewrites imports in that package before bundling.
function threeCompatShim(): Plugin {
  return {
    name: 'three-compat-shim',
    transform(code, id) {
      if (!id.includes('closed-chain-ik')) return;
      return code
        .replace(/\bBoxBufferGeometry\b/g, 'BoxGeometry')
        .replace(/\bCylinderBufferGeometry\b/g, 'CylinderGeometry')
        .replace(/\bSphereBufferGeometry\b/g, 'SphereGeometry');
    },
  };
}

export default defineConfig({
  plugins: [threeCompatShim(), react()],
  optimizeDeps: {
    // closed-chain-ik uses removed Three.js APIs; exclude it from pre-bundling
    // so threeCompatShim can rewrite the imports before rolldown resolves them.
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
})
