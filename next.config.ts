import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NextConfig } from 'next'

const configDir = path.dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  // Server port is set via PORT env var or npm start -- -p 4000
  serverExternalPackages: ['openclaw'],
  turbopack: {
    root: configDir,
  },
}

export default nextConfig
