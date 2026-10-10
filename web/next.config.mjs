/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Dish and hero art ships as large source PNGs extracted from the design
    // bundle; next/image re-encodes them to modern formats on demand.
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        // The emailed secure link (#34). The token is in the fragment, which is
        // never sent here, but the page still must not be cached, indexed or
        // leave through a Referer.
        source: '/account/access',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
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
