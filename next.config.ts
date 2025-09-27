import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // PDF.js worker 配置
    config.resolve.alias.canvas = false;

    if (isServer) {
      // 在服务器端构建时忽略 canvas 模块
      config.externals = [...(config.externals || []), 'canvas'];
    }

    return config;
  },
};

export default nextConfig;