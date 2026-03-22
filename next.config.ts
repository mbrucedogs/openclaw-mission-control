import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server port is set via PORT env var or npm start -- -p 4000
  serverExternalPackages: ['openclaw'],
};

export default nextConfig;
