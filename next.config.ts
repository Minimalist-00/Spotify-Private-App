import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
};

module.exports = {
  images: {
    domains: ['mosaic.scdn.co', 'i.scdn.co'], // Spotifyの画像ホストを追加
  },
};

export default nextConfig;
