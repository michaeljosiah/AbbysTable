/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Dish and hero art ships as large source PNGs extracted from the design
    // bundle; next/image re-encodes them to modern formats on demand.
    formats: ['image/avif', 'image/webp'],
  },
  async redirects() {
    return [
      // There is no create-account page (accounts are made during checkout), but
      // old links and bookmarks to /register still land somewhere that works.
      { source: '/register', destination: '/login', permanent: true },
    ];
  },
};

export default nextConfig;
