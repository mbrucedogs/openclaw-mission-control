import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NextConfig } from 'next'

const configDir = path.dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  // Server port is set via PORT env var or npm start -- -p 4000
  serverExternalPackages: ['openclaw'],
  allowedDevOrigins: ['localhost', '127.0.0.1'],
  turbopack: {
    root: configDir,
  },
}

export default nextConfig
