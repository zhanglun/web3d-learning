// Resolve a public-dir asset against Vite's base path so it works both at
// the dev root ("/") and under the GitHub Pages subpath ("/web3d-learning/").
// Accepts paths with or without a leading slash.
export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
}
