/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/seedgaurd-tracker',
  assetPrefix: '/seedgaurd-tracker/',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
