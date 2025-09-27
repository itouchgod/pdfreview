import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 获取响应头
  const response = NextResponse.next();
  
  // 定义 CSP
  const csp = [
    // 默认配置
    "default-src 'self'",
    // 允许 PDF.js 使用 worker
    "worker-src 'self' blob:",
    // 允许 PDF.js 执行必要的脚本
    "script-src 'self' 'unsafe-eval' blob:",
    // 允许内联样式
    "style-src 'self' 'unsafe-inline'",
    // 允许图片
    "img-src 'self' blob: data:",
    // 允许 PDF 文件
    "object-src 'self' blob:",
    // 允许连接到自己
    "connect-src 'self'",
    // 字体
    "font-src 'self'",
  ].join('; ');

  // 设置 CSP header
  response.headers.set('Content-Security-Policy', csp);
  
  // 设置其他安全相关的 headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}
