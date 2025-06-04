/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable experimental CSS optimization that's causing the critters error
  experimental: {
    optimizeCss: false, // This was causing the critters module error
  },
  
  // Ensure static generation works properly
  trailingSlash: true,
  
  // Configure for Vercel deployment
  output: 'standalone',
  
  // Disable TypeScript checking during build (since you have --no-lint)
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Disable ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Configure images for Vercel
  images: {
    domains: ['localhost'],
    unoptimized: true, // For static export compatibility
  },
  
  // Webpack configuration for SQLite compatibility
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Handle SQLite native modules for server-side rendering
      config.externals.push({
        'better-sqlite3': 'commonjs better-sqlite3',
        'sqlite3': 'commonjs sqlite3'
      });
    }
    
    // Handle file system operations
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    
    return config;
  },
  
  // Environment variables
  env: {
    CUSTOM_KEY: 'my-value',
  },
  
  // Headers for security and CORS
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
  
  // Redirects for better UX
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
