// next.config.js (あるいは next.config.ts)
// ※ TypeScriptの場合でも、Vercelで実行されるのは最終的にJSにビルドされたものです。
// 　ここでは ES Modules 形式で書かれていますが、CommonJS 形式でも OK です。

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.scdn.co",
        // Spotify の通常のジャケット画像は /image/ のあとに続く
        pathname: "/image/**",
      },
    ],
  },
};

export default nextConfig;
