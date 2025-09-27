import { NextResponse, NextRequest } from "next/server";
import crypto from "crypto";

export function middleware(req: NextRequest) {
  const nonce = crypto.randomBytes(16).toString("base64");

  const res = NextResponse.next({
    request: { headers: req.headers },
  });

  // Dev 环境先简化 CSP，避免 Next 的内部脚本因为 strict-dynamic 被拦
  const isProd = process.env.NODE_ENV === "production";

  const cspParts = [
    `default-src 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    // 生产可考虑改回含 'strict-dynamic' 的版本
    isProd
      ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval' blob:`
      : `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' blob:`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self' data:`,
    `connect-src 'self' https: ws:`,
    `frame-ancestors 'self'`,
  ];

  res.headers.set("x-nonce", nonce);
  res.headers.set("Content-Security-Policy", cspParts.join("; "));

  return res;
}

// 配置中间件匹配
export const config = {
  matcher: [
    /*
     * 匹配所有请求路径，除了：
     * - api 路由 (/api/*)
     * - 静态文件 (*.png, *.jpg, etc.)
     * - _next/static (Next.js 静态文件)
     * - _next/image (Next.js 优化的图片)
     * - favicon.ico
     */
    '/((?!api|_next/static|_next/image|.*\\..*|favicon.ico).*)',
  ],
};