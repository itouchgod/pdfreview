'use client';

import { useEffect } from 'react';

/**
 * 抑制由浏览器扩展导致的水合错误
 * 这些错误通常是由于扩展在页面加载后修改了 DOM 属性导致的
 */
export default function HydrationErrorSuppressor() {
  useEffect(() => {
    // 抑制特定的水合错误
    const originalError = console.error;
    console.error = (...args) => {
      const message = args[0];
      
      // 检查是否是水合错误
      if (typeof message === 'string' && message.includes('hydrated but some attributes')) {
        // 检查是否是由浏览器扩展导致的属性不匹配
        const isExtensionError = 
          message.includes('cz-shortcut-listen') || 
          message.includes('data-') ||
          message.includes('aria-') ||
          message.includes('role=') ||
          message.includes('class=') ||
          message.includes('id=');
          
        if (isExtensionError) {
          // 静默处理这些由扩展导致的错误
          console.warn('🔇 已抑制由浏览器扩展导致的水合错误:', message.substring(0, 100) + '...');
          return;
        }
      }
      
      // 其他错误正常输出
      originalError.apply(console, args);
    };

    // 清理函数
    return () => {
      console.error = originalError;
    };
  }, []);

  return null;
}
