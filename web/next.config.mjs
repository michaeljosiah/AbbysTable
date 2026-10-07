/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Dish and hero art ships as large source PNGs extracted from the design
    // bundle; next/image re-encodes them to modern formats on demand.
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
