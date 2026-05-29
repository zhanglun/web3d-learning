
/**
 * 下载 UR5e 的 URDF 和 mesh 文件到 public/urdf/ur5e/
 *
 * 用法: npm run fetch:ur5e
 *
 * 数据来源: pybullet_ur5_gripper(已经把 xacro 编译成纯 URDF,且包含 mesh)
 *           https://github.com/culurciello/pybullet_ur5_gripper
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT_DIR = join(ROOT, 'public/urdf/ur5e')

const BASE =
  'https://raw.githubusercontent.com/culurciello/pybullet_ur5_gripper/master/robots'

// UR5e 有 6 个 link,每个 link 都有 visual (.dae) 和 collision (.stl)
const PARTS = ['base', 'shoulder', 'upperarm', 'forearm', 'wrist1', 'wrist2', 'wrist3']

const FILES = [
  { src: `${BASE}/urdf/ur5e.urdf`, dst: 'ur5e.urdf' },
  ...PARTS.flatMap((p) => [
    { src: `${BASE}/meshes/ur5e/visual/${p}.dae`, dst: `meshes/ur5e/visual/${p}.dae` },
    { src: `${BASE}/meshes/ur5e/collision/${p}.stl`, dst: `meshes/ur5e/collision/${p}.stl` },
  ]),
]

async function download(src, dstAbs) {
  const res = await fetch(src)
  if (!res.ok) throw new Error(`${src} → HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await mkdir(dirname(dstAbs), { recursive: true })
  await writeFile(dstAbs, buf)
  console.log(`  ✓ ${dstAbs.replace(ROOT + '/', '')} (${(buf.length / 1024).toFixed(1)} KB)`)
}

async function main() {
  console.log(`Downloading UR5e assets to ${OUT_DIR}\n`)
  await mkdir(OUT_DIR, { recursive: true })
  for (const { src, dst } of FILES) {
    try {
      await download(src, join(OUT_DIR, dst))
    } catch (e) {
      console.error(`  ✗ ${dst}:`, e.message)
    }
  }

  // pybullet 仓库里的 URDF mesh 路径写成 "../meshes/ur5e/visual/base.dae"
  // 这是相对于 urdf 文件的路径,我们调整成相对 public 根的路径
  console.log('\nPatching URDF mesh paths...')
  const { readFile } = await import('node:fs/promises')
  const urdfPath = join(OUT_DIR, 'ur5e.urdf')
  let urdf = await readFile(urdfPath, 'utf-8')
  urdf = urdf.replace(/"\.\.\/meshes\//g, '"meshes/')
  await writeFile(urdfPath, urdf)
  console.log('  ✓ Done\n')
  console.log('Now run: npm run dev')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
