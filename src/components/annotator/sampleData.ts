// src/components/annotator/sampleData.ts
export function generateSampleData(): Float32Array {
  const pts: number[] = []

  // Ground plane: 4000 points spread across 20x20m at y ≈ 0
  for (let i = 0; i < 4000; i++) {
    pts.push(
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 0.1,
      (Math.random() - 0.5) * 20,
    )
  }

  // Three vehicle clusters
  const vehicles = [
    { cx: 3,  cz: 2,  w: 2.0, d: 4.5 },
    { cx: -4, cz: -3, w: 2.0, d: 4.5 },
    { cx: 0,  cz: -7, w: 1.8, d: 4.2 },
  ]
  for (const v of vehicles) {
    for (let i = 0; i < 1200; i++) {
      pts.push(
        v.cx + (Math.random() - 0.5) * v.w + (Math.random() - 0.5) * 0.05,
        Math.random() * 1.5               + (Math.random() - 0.5) * 0.05,
        v.cz + (Math.random() - 0.5) * v.d + (Math.random() - 0.5) * 0.05,
      )
    }
  }

  return new Float32Array(pts)
}
