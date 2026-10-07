/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Dish and hero art ships as large source PNGs extracted from the design
    // bundle; next/image re-encodes them to modern formats on demand.
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    serverActions: {
      // The Contact form's action carries up to three 10MB images (contract
      // §3e; `MAX_ENQUIRY_IMAGES`, `MAX_ENQUIRY_IMAGE_BYTES`) plus its text
      // fields. Next's default is 1MB, which would reject one photo. It applies
      // to every server action; the action re-checks count, type and size.
      bodySizeLimit: '32mb',
    },
  },
};

export default nextConfig;
