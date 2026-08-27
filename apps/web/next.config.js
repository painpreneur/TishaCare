/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@tishacare/db"],
  async headers() {
    return [
      {
        source: "/miniapp/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors https://web.telegram.org https://telegram.org",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
