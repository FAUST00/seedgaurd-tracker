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
  NEXT_PUBLIC_SUPABASE_URL: "https://ezqyfdobdrtosomzpdst.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_-VBntNg0Es2VP5tBmURADw_SpMrpAV-",   // ← Get this from Supabase
  NEXT_PUBLIC_SEEDGUARD_API_URL: "https://seedguard-api.onrender.com",
},
};

module.exports = nextConfig;
