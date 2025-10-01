import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 生产环境优化
  compress: true,
  poweredByHeader: false,
  
  // 部署区域配置 - 香港东部
  output: 'standalone',
  
  // 图片优化
  images: {
    unoptimized: true, // PDF 图标不需要优化
  },
  
  // 性能优化
  experimental: {
    // optimizeCss: true, // 暂时禁用，避免构建问题
  },
  
  webpack: (config, { isServer, dev }) => {
    // PDF.js worker 配置
    config.resolve.alias.canvas = false;

    if (isServer) {
      // 在服务器端构建时忽略 canvas 模块
      config.externals = [...(config.externals || []), 'canvas'];
    }

    // 生产环境优化
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
            pdfjs: {
              test: /[\\/]node_modules[\\/]pdfjs-dist[\\/]/,
              name: 'pdfjs',
              chunks: 'all',
              priority: 10,
            },
          },
        },
      };
    }

    return config;
  },
};

export default nextConfig;