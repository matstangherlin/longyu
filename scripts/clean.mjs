import { readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

const root = process.cwd()

const directories = ['dist', 'dist-ssr', '.vite']
const rootFilePatterns = [
  /\.tsbuildinfo$/,
  /^vite\.config\.[cm]?[jt]s\.timestamp-\d+-[a-f0-9]+\.mjs$/,
  /\.log$/,
]

async function remove(relativePath, { optional = false } = {}) {
  try {
    await rm(join(root, relativePath), { recursive: true, force: true })
    console.log(`removed ${relativePath}`)
  } catch (error) {
    if (optional) {
      console.warn(`skipped ${relativePath}: ${error.code ?? error.message}`)
      return
    }

    throw error
  }
}

for (const directory of directories) {
  await remove(directory)
}

for (const entry of await readdir(root, { withFileTypes: true })) {
  if (!entry.isFile()) continue

  if (rootFilePatterns.some((pattern) => pattern.test(entry.name))) {
    await remove(entry.name, { optional: true })
  }
}

console.log('kept node_modules; remove it manually before a clean install')
