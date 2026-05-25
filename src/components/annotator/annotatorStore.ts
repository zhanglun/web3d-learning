// src/components/annotator/annotatorStore.ts
import { create } from 'zustand'
import type { AnnotationBox, AnnotatorState } from './types'

interface AnnotatorStore extends AnnotatorState {
  loadPointCloud: (data: Float32Array) => void
  loadSample: () => void
  addBox: (box: Omit<AnnotationBox, 'id'>) => void
  updateBox: (id: string, patch: Partial<Omit<AnnotationBox, 'id'>>) => void
  deleteBox: (id: string) => void
  selectBox: (id: string | null) => void
  setMode: (mode: 'view' | 'annotate') => void
}

export const useAnnotatorStore = create<AnnotatorStore>((set) => ({
  pointCloud: null,
  boxes: [],
  selectedId: null,
  mode: 'view',

  loadPointCloud: (data) => set({ pointCloud: data }),

  loadSample: () => {
    // Populated in Task 3 when sampleData.ts exists.
    // Import is deferred to avoid circular dependency at test time.
    import('./sampleData')
      .then(({ generateSampleData }) => set({ pointCloud: generateSampleData() }))
      .catch((err) => console.error('[annotatorStore] loadSample failed:', err))
  },

  addBox: (box) =>
    set((s) => ({ boxes: [...s.boxes, { ...box, id: crypto.randomUUID() }] })),

  updateBox: (id, patch) =>
    set((s) => ({
      boxes: s.boxes.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    })),

  deleteBox: (id) =>
    set((s) => ({
      boxes: s.boxes.filter((b) => b.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  selectBox: (id) => set({ selectedId: id }),

  setMode: (mode) => set({ mode }),
}))
