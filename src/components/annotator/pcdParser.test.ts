import { describe, it, expect } from 'vitest'
import { parsePCD } from './pcdParser'

function makeAsciiPCD(pts: [number, number, number][]): ArrayBuffer {
  const header = [
    'VERSION 0.7',
    'FIELDS x y z',
    'SIZE 4 4 4',
    'TYPE F F F',
    'COUNT 1 1 1',
    `WIDTH ${pts.length}`,
    'HEIGHT 1',
    'VIEWPOINT 0 0 0 1 0 0 0',
    `POINTS ${pts.length}`,
    'DATA ascii',
  ].join('\n') + '\n'
  const data = pts.map(([x, y, z]) => `${x} ${y} ${z}`).join('\n') + '\n'
  return new TextEncoder().encode(header + data).buffer as ArrayBuffer
}

function makeBinaryPCD(pts: [number, number, number][]): ArrayBuffer {
  const header = [
    'VERSION 0.7',
    'FIELDS x y z',
    'SIZE 4 4 4',
    'TYPE F F F',
    'COUNT 1 1 1',
    `WIDTH ${pts.length}`,
    'HEIGHT 1',
    'VIEWPOINT 0 0 0 1 0 0 0',
    `POINTS ${pts.length}`,
    'DATA binary',
  ].join('\n') + '\n'
  const headerBytes = new TextEncoder().encode(header)
  const dataBytes = new ArrayBuffer(pts.length * 12)
  const view = new DataView(dataBytes)
  pts.forEach(([x, y, z], i) => {
    view.setFloat32(i * 12,     x, true)
    view.setFloat32(i * 12 + 4, y, true)
    view.setFloat32(i * 12 + 8, z, true)
  })
  const out = new Uint8Array(headerBytes.byteLength + dataBytes.byteLength)
  out.set(headerBytes)
  out.set(new Uint8Array(dataBytes), headerBytes.byteLength)
  return out.buffer as ArrayBuffer
}

describe('parsePCD', () => {
  it('parses ASCII PCD into flat Float32Array', () => {
    const buf = makeAsciiPCD([[1, 2, 3], [4, 5, 6]])
    expect(Array.from(parsePCD(buf))).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('filters NaN and Infinity in ASCII data', () => {
    const header =
      'VERSION 0.7\nFIELDS x y z\nSIZE 4 4 4\nTYPE F F F\nCOUNT 1 1 1\n' +
      'WIDTH 3\nHEIGHT 1\nVIEWPOINT 0 0 0 1 0 0 0\nPOINTS 3\nDATA ascii\n'
    const data = '1 2 3\nnan 0 0\n4 inf 6\n'
    const buf = new TextEncoder().encode(header + data).buffer as ArrayBuffer
    expect(Array.from(parsePCD(buf))).toEqual([1, 2, 3])
  })

  it('parses binary PCD correctly', () => {
    const buf = makeBinaryPCD([[1.5, 2.5, 3.5]])
    const result = parsePCD(buf)
    expect(result[0]).toBeCloseTo(1.5)
    expect(result[1]).toBeCloseTo(2.5)
    expect(result[2]).toBeCloseTo(3.5)
    expect(result.length).toBe(3)
  })

  it('handles x/y/z fields not in first-column order', () => {
    const header =
      'VERSION 0.7\nFIELDS intensity x y z\nSIZE 4 4 4 4\nTYPE F F F F\nCOUNT 1 1 1 1\n' +
      'WIDTH 1\nHEIGHT 1\nVIEWPOINT 0 0 0 1 0 0 0\nPOINTS 1\nDATA ascii\n'
    const data = '99 7 8 9\n'
    const buf = new TextEncoder().encode(header + data).buffer as ArrayBuffer
    expect(Array.from(parsePCD(buf))).toEqual([7, 8, 9])
  })

  it('throws when x/y/z fields are missing', () => {
    const header =
      'VERSION 0.7\nFIELDS intensity\nSIZE 4\nTYPE F\nCOUNT 1\n' +
      'WIDTH 1\nHEIGHT 1\nVIEWPOINT 0 0 0 1 0 0 0\nPOINTS 1\nDATA ascii\n'
    const buf = new TextEncoder().encode(header + '1\n').buffer as ArrayBuffer
    expect(() => parsePCD(buf)).toThrow(/missing x\/y\/z/)
  })
})
