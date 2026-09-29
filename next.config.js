/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  // pdfjs-dist (used by the in-app book reader) has an optional, Node-only
  // dependency on the "canvas" package that we never install and never need
  // — PDF pages are rendered on a real <canvas> element in the browser.
  // Without this, the production build can fail trying to resolve it.
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};

module.exports = nextConfig;
