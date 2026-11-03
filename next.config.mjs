/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server build (admin CMS needs API routes + dynamic pages).
  // Deploy to Vercel/Netlify/Node. Not a static export anymore.
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        // HTML always fresh; static assets are hash-named so they cache fine
        source: "/:path*",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
    ];
  },
};

export default nextConfig;
