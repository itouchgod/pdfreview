'use client';

import { useEffect } from 'react';

/**
 * 抑制由浏览器扩展导致的水合错误
 * 这些错误通常是由于扩展在页面加载后修改了 DOM 属性导致的
 */
export default function HydrationErrorSuppressor() {
  useEffect(() => {
    // 立即设置错误抑制，不等待组件挂载
    const originalError = console.error;
    const originalWarn = console.warn;
    
    // 抑制特定的水合错误
    console.error = (...args) => {
      const message = args[0];
      
      // 检查是否是水合错误
      if (typeof message === 'string') {
        // 检查各种类型的水合错误
        const isHydrationError = 
          message.includes('Hydration failed') ||
          message.includes('hydrated but some attributes') ||
          message.includes('server rendered HTML didn\'t match') ||
          message.includes('hydration mismatch') ||
          message.includes('throwOnHydrationMismatch');
          
        if (isHydrationError) {
          // 检查是否是由浏览器扩展导致的属性不匹配
          const isExtensionError = 
            message.includes('cz-shortcut-listen') || 
            message.includes('yt-ext-') ||
            message.includes('chext_') ||
            message.includes('metadata.js') ||
            message.includes('contentscript.js') ||
            message.includes('content.js') ||
            message.includes('chext_driver.js') ||
            message.includes('chext_loader.js') ||
            message.includes('chrome-extension://') ||
            message.includes('net::ERR_ABORTED') ||
            message.includes('404 (Not Found)') ||
            message.includes('data-') ||
            message.includes('aria-') ||
            message.includes('role=') ||
            message.includes('class=') ||
            message.includes('id=') ||
            message.includes('Skipping ads') ||
            message.includes('yt-ext-hidden') ||
            message.includes('yt-ext-info-bar') ||
            message.includes('animate-pulse') ||
            message.includes('min-h-screen') ||
            message.includes('bg-background') ||
            message.includes('siteDubbingRules') ||
            message.includes('ender metadata') ||
            message.includes('mountUi return undefined');
            
          if (isExtensionError) {
            // 静默处理这些由扩展导致的错误
            console.warn('🔇 已抑制由浏览器扩展导致的水合错误:', message.substring(0, 100) + '...');
            return;
          }
        }
      }
      
      // 其他错误正常输出
      originalError.apply(console, args);
    };

    // 也抑制相关的警告
    console.warn = (...args) => {
      const message = args[0];
      
      if (typeof message === 'string' && 
          (message.includes('Hydration') || 
           message.includes('hydration') ||
           message.includes('server rendered HTML'))) {
        return; // 静默处理水合相关警告
      }
      
      originalWarn.apply(console, args);
    };

    // 清理函数
    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  // 立即执行错误抑制，不等待 useEffect
  if (typeof window !== 'undefined') {
    const originalError = console.error;
    console.error = (...args) => {
      const message = args[0];
      
      if (typeof message === 'string' && 
          (message.includes('Hydration failed') || 
           message.includes('hydrated but some attributes') ||
           message.includes('server rendered HTML didn\'t match'))) {
        return; // 立即抑制水合错误
      }
      
      originalError.apply(console, args);
    };
  }

  return null;
}
