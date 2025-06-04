import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Disable CSS optimization that causes critters error
  experimental: {
    optimizeCss: false,
  },
  
  // Basic configuration for Vercel
  output: 'standalone',
  
  // Disable checks during build
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Image configuration
  images: {
    unoptimized: true,
  },
  
  // Webpack config for SQLite compatibility
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        'better-sqlite3': 'commonjs better-sqlite3',
      });
    }
    
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };
    
    return config;
  },
}

export default nextConfig
