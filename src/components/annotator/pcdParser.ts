// src/components/annotator/pcdParser.ts
export function parsePCD(buffer: ArrayBuffer): Float32Array {
  const bytes = new Uint8Array(buffer)

  // Scan header line-by-line until DATA line
  const headerLines: string[] = []
  let pos = 0
  let dataOffset = 0

  while (pos < bytes.length) {
    let end = pos
    while (end < bytes.length && bytes[end] !== 10) end++ // find \n
    const line = new TextDecoder().decode(bytes.slice(pos, end)).replace(/\r$/, '').trim()
    pos = end + 1
    headerLines.push(line)
    if (line.startsWith('DATA')) { dataOffset = pos; break }
  }

  const get = (prefix: string) =>
    headerLines.find((l) => l.startsWith(prefix))?.slice(prefix.length).trim() ?? ''

  const fields = get('FIELDS ').split(/\s+/)
  const sizes  = get('SIZE ').split(/\s+/).map(Number)
  const points = parseInt(get('POINTS ') || '0', 10)
  const dataType = get('DATA ').split(/\s+/)[0]

  const xIdx = fields.indexOf('x')
  const yIdx = fields.indexOf('y')
  const zIdx = fields.indexOf('z')
  if (xIdx < 0 || yIdx < 0 || zIdx < 0) throw new Error('PCD missing x/y/z fields')

  if (dataType === 'ascii') {
    const text = new TextDecoder().decode(bytes.slice(dataOffset))
    const out: number[] = []
    for (const line of text.split('\n')) {
      const parts = line.trim().split(/\s+/)
      if (parts.length < fields.length) continue
      const x = parseFloat(parts[xIdx])
      const y = parseFloat(parts[yIdx])
      const z = parseFloat(parts[zIdx])
      if (isFinite(x) && isFinite(y) && isFinite(z)) out.push(x, y, z)
    }
    return new Float32Array(out)
  }

  if (dataType === 'binary') {
    const stride = sizes.reduce((s, v) => s + v, 0)
    const xOff = sizes.slice(0, xIdx).reduce((s, v) => s + v, 0)
    const yOff = sizes.slice(0, yIdx).reduce((s, v) => s + v, 0)
    const zOff = sizes.slice(0, zIdx).reduce((s, v) => s + v, 0)
    const view = new DataView(buffer, dataOffset)
    const out: number[] = []
    for (let i = 0; i < points; i++) {
      const base = i * stride
      const x = view.getFloat32(base + xOff, true)
      const y = view.getFloat32(base + yOff, true)
      const z = view.getFloat32(base + zOff, true)
      if (isFinite(x) && isFinite(y) && isFinite(z)) out.push(x, y, z)
    }
    return new Float32Array(out)
  }

  throw new Error(`Unsupported PCD DATA type: ${dataType}`)
}
