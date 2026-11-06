/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server build (admin CMS needs API routes + dynamic pages).
  // Deploy to Vercel/Netlify/Node. Not a static export anymore.
  images: {
    unoptimized: true,
  },
  // Don't advertise the framework (pentest M-3).
  poweredByHeader: false,
  async headers() {
    return [
      {
        // HTML always fresh; static assets are hash-named so they cache fine
        source: "/:path*",
        headers: [
          { key: "Cache-Control", value: "no-cache" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            // frame-src covers the SoundCloud/YouTube embeds used by MixEmbed;
            // media/img come from self (uploads are same-origin API routes).
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self'; font-src 'self'; style-src 'self' 'unsafe-inline'; frame-src https://w.soundcloud.com https://www.youtube-nocookie.com https://bandcamp.com https://www.mixcloud.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
