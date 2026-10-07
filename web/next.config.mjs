/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Dish and hero art ships as large source PNGs extracted from the design
    // bundle; next/image re-encodes them to modern formats on demand.
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    // The Contact form's action carries up to three 10MB images (contract
    // §3e; `MAX_ENQUIRY_IMAGES`, `MAX_ENQUIRY_IMAGE_BYTES`) plus its text
    // fields. Next's defaults would cut that off twice: 1MB for a server
    // action, and 10MB for any request body that passes through middleware
    // (src/middleware.ts, maintenance mode, matches every page) — which
    // truncates the body silently and fails the action with "Unexpected end of
    // form". Both apply to every request; the action re-checks count, type and
    // size of what arrives.
    serverActions: {
      bodySizeLimit: '32mb',
    },
    middlewareClientMaxBodySize: '32mb',
  },
};

export default nextConfig;
