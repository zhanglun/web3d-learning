// src/components/annotator/annotatorStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useAnnotatorStore } from './annotatorStore'

const baseBox = {
  position: [0, 0, 0] as [number, number, number],
  size: [2, 4, 1.5] as [number, number, number],
  rotation: 0,
  label: 'car',
}

beforeEach(() => {
  useAnnotatorStore.setState({
    pointCloud: null,
    boxes: [],
    selectedId: null,
    mode: 'view',
  })
})

describe('annotatorStore', () => {
  it('addBox assigns a unique ID', () => {
    useAnnotatorStore.getState().addBox(baseBox)
    useAnnotatorStore.getState().addBox(baseBox)
    const { boxes } = useAnnotatorStore.getState()
    expect(boxes).toHaveLength(2)
    expect(boxes[0].id).not.toBe(boxes[1].id)
    expect(typeof boxes[0].id).toBe('string')
    expect(boxes[0].id.length).toBeGreaterThan(0)
  })

  it('updateBox applies a partial patch without touching other fields', () => {
    useAnnotatorStore.getState().addBox(baseBox)
    const id = useAnnotatorStore.getState().boxes[0].id
    useAnnotatorStore.getState().updateBox(id, { label: 'truck', rotation: 1.5 })
    const box = useAnnotatorStore.getState().boxes[0]
    expect(box.label).toBe('truck')
    expect(box.rotation).toBe(1.5)
    expect(box.position).toEqual([0, 0, 0])
    expect(box.size).toEqual([2, 4, 1.5])
  })

  it('deleteBox removes the box', () => {
    useAnnotatorStore.getState().addBox(baseBox)
    const id = useAnnotatorStore.getState().boxes[0].id
    useAnnotatorStore.getState().deleteBox(id)
    expect(useAnnotatorStore.getState().boxes).toHaveLength(0)
  })

  it('deleteBox clears selectedId when the deleted box was selected', () => {
    useAnnotatorStore.getState().addBox(baseBox)
    const id = useAnnotatorStore.getState().boxes[0].id
    useAnnotatorStore.getState().selectBox(id)
    useAnnotatorStore.getState().deleteBox(id)
    expect(useAnnotatorStore.getState().selectedId).toBeNull()
  })

  it('selectBox sets selectedId', () => {
    useAnnotatorStore.getState().addBox(baseBox)
    const id = useAnnotatorStore.getState().boxes[0].id
    useAnnotatorStore.getState().selectBox(id)
    expect(useAnnotatorStore.getState().selectedId).toBe(id)
  })

  it('selectBox(null) deselects', () => {
    useAnnotatorStore.getState().addBox(baseBox)
    const id = useAnnotatorStore.getState().boxes[0].id
    useAnnotatorStore.getState().selectBox(id)
    useAnnotatorStore.getState().selectBox(null)
    expect(useAnnotatorStore.getState().selectedId).toBeNull()
  })

  it('setMode changes mode between view and annotate', () => {
    expect(useAnnotatorStore.getState().mode).toBe('view')
    useAnnotatorStore.getState().setMode('annotate')
    expect(useAnnotatorStore.getState().mode).toBe('annotate')
    useAnnotatorStore.getState().setMode('view')
    expect(useAnnotatorStore.getState().mode).toBe('view')
  })

  it('loadPointCloud stores the Float32Array', () => {
    const data = new Float32Array([1, 2, 3, 4, 5, 6])
    useAnnotatorStore.getState().loadPointCloud(data)
    expect(useAnnotatorStore.getState().pointCloud).toBe(data)
  })
})
