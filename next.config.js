/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/seedguard-main',
  assetPrefix: '/seedguard-main/',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_SEEDGUARD_API_URL: "https://seedguard-api.onrender.com",   // ← CHANGE THIS
  },
};

module.exports = nextConfig;
