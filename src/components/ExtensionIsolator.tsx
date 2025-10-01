'use client';

import { useEffect } from 'react';

/**
 * 浏览器扩展隔离器
 * 检测和隔离浏览器扩展对页面的干扰
 */
export default function ExtensionIsolator() {
  useEffect(() => {
    // 检测常见的浏览器扩展
    const detectExtensions = () => {
      const extensions = [];
      
      // 检测 Chext 扩展 - 增强检测
      if ((window as any).chext || 
          document.querySelector('[data-chext]') ||
          document.querySelector('script[src*="chext"]') ||
          document.querySelector('script[src*="metadata.js"]') ||
          document.querySelector('script[src*="contentscript.js"]') ||
          document.querySelector('script[src*="chext_driver.js"]') ||
          document.querySelector('script[src*="chext_loader.js"]')) {
        extensions.push('Chext');
      }
      
      // 检测 YouTube 相关扩展
      if (document.querySelector('[data-yt-ext]') || 
          document.querySelector('.yt-ext-') ||
          (window as any).ytExt) {
        extensions.push('YouTube Extension');
      }
      
      // 检测其他常见扩展
      if ((window as any).chrome && (window as any).chrome.runtime) {
        extensions.push('Chrome Extension');
      }
      
      return extensions;
    };

    // 创建扩展隔离样式
    const createIsolationStyles = () => {
      const style = document.createElement('style');
      style.id = 'extension-isolation';
      style.textContent = `
        /* 防止扩展修改关键元素 */
        body {
          position: relative;
          z-index: 1;
        }
        
        /* 保护主要容器 */
        #__next, main, [data-main] {
          position: relative;
          z-index: 10;
          isolation: isolate;
        }
        
        /* 防止扩展注入的元素干扰 */
        [data-extension],
        [data-chext],
        [id*="chext"],
        [class*="chext"],
        [id*="metadata"],
        [class*="metadata"],
        [id*="contentscript"],
        [class*="contentscript"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
        
        /* 保护悬浮按钮 */
        [data-floating-button] {
          z-index: 1000 !important;
          position: fixed !important;
        }
        
        /* 保护搜索框 */
        [data-search] {
          z-index: 100 !important;
        }
        
        /* 防止扩展脚本注入 */
        script[src*="chext"],
        script[src*="metadata.js"],
        script[src*="contentscript.js"],
        script[src*="chext_driver.js"],
        script[src*="chext_loader.js"] {
          display: none !important;
        }
      `;
      document.head.appendChild(style);
    };

    // 监控扩展注入的元素
    const monitorExtensionInjection = () => {
      // 确保 document.body 存在
      if (!document.body) {
        console.warn('🔇 document.body 不存在，跳过扩展监控');
        return null;
      }

      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              
              // 检查是否是扩展注入的元素 - 增强检测
              if (element.id?.includes('chext') ||
                  element.className?.includes('chext') ||
                  element.id?.includes('metadata') ||
                  element.className?.includes('metadata') ||
                  element.id?.includes('contentscript') ||
                  element.className?.includes('contentscript') ||
                  element.className?.includes('yt-ext') ||
                  element.getAttribute('data-extension') ||
                  element.getAttribute('data-chext') ||
                  element.tagName?.toLowerCase().includes('extension') ||
                  element.getAttribute('src')?.includes('chext') ||
                  element.getAttribute('src')?.includes('metadata.js') ||
                  element.getAttribute('src')?.includes('contentscript.js')) {
                
                // 标记为扩展元素
                element.setAttribute('data-extension', 'true');
                if (element instanceof HTMLElement) {
                  element.style.display = 'none';
                  element.style.visibility = 'hidden';
                  element.style.opacity = '0';
                  element.style.pointerEvents = 'none';
                }
                
                console.warn('🔇 已隔离扩展注入的元素:', element.tagName, element.id || element.className);
              }
            }
          });
        });
      });

      try {
        // 确保 document.body 是有效的 Node
        if (document.body instanceof Node) {
          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
          return observer;
        } else {
          console.warn('🔇 document.body 不是有效的 Node');
          return null;
        }
      } catch (error) {
        console.warn('🔇 MutationObserver 初始化失败:', error);
        return null;
      }
    };

    // 增强错误抑制机制
    const enhanceErrorSuppression = () => {
      const originalError = console.error;
      const originalWarn = console.warn;
      
      // 扩展错误关键词列表 - 增强
      const extensionKeywords = [
        'chext_', 'metadata.js', 'contentscript.js', 'content.js',
        'chext_driver.js', 'chext_loader.js', 'chrome-extension://',
        'net::ERR_ABORTED', '404 (Not Found)', 'siteDubbingRules',
        'ender metadata', 'mountUi return undefined', 'yt-ext-',
        'cz-shortcut-listen', 'Skipping ads',
        'Failed to execute \'observe\' on \'MutationObserver\'',
        'parameter 1 is not of type \'Node\'',
        'Unexpected identifier \'observe\'',
        'appendChild\' on \'Node\'',
        'Failed to execute \'appendChild\' on \'Node\'',
        'Initialized driver at:',
        'Initialized chextloader at:',
        'searchs (7)',
        'messages MessageEvent',
        'vendors-326d2db556600f52.js',
        'webpack-f9bdc8f8e7ef5feb.js',
        'main-app-e131d669f65d8db7.js',
        'index.ts-loader3.js',
        'VM210:14',
        'VM531:14',
        'VM56:14',
        'vendors-326d2db556600f52.js:1:126815',
        'vendors-326d2db556600f52.js:1:126622'
      ];
      
      console.error = function(...args) {
        const message = args[0];
        if (typeof message === 'string') {
          const isExtensionError = extensionKeywords.some(keyword => 
            message.includes(keyword)
          );
          if (isExtensionError) {
            return; // 静默处理扩展错误
          }
        }
        originalError.apply(console, args);
      };
      
      console.warn = function(...args) {
        const message = args[0];
        if (typeof message === 'string') {
          const isExtensionWarning = extensionKeywords.some(keyword => 
            message.includes(keyword)
          );
          if (isExtensionWarning) {
            return; // 静默处理扩展警告
          }
        }
        originalWarn.apply(console, args);
      };

      // 全局错误处理
      const originalOnError = window.onerror;
      window.onerror = function(message, source, _lineno, _colno, _error) {
        if (typeof message === 'string') {
          const isExtensionError = extensionKeywords.some(keyword => 
            message.includes(keyword) || 
            (source && source.includes(keyword))
          );
          if (isExtensionError) {
            return true; // 阻止错误传播
          }
        }
        if (originalOnError) {
          return originalOnError.apply(this, [message, source, _lineno, _colno, _error]);
        }
        return false;
      };

      // 全局未捕获的 Promise 错误处理
      const originalOnUnhandledRejection = window.onunhandledrejection;
      window.onunhandledrejection = function(event) {
        const reason = event.reason;
        if (typeof reason === 'string') {
          const isExtensionError = extensionKeywords.some(keyword => 
            reason.includes(keyword)
          );
          if (isExtensionError) {
            event.preventDefault(); // 阻止错误传播
            return;
          }
        }
        if (originalOnUnhandledRejection) {
          return originalOnUnhandledRejection(event);
        }
      };
    };

    // 执行扩展检测和隔离
    const extensions = detectExtensions();
    
    // 无论是否检测到扩展，都启用错误抑制
    enhanceErrorSuppression();
    
    if (extensions.length > 0) {
      console.info('🔍 检测到浏览器扩展:', extensions.join(', '));
      createIsolationStyles();
      const observer = monitorExtensionInjection();
      
      // 清理函数
      return () => {
        if (observer) {
          observer.disconnect();
        }
        const style = document.getElementById('extension-isolation');
        if (style) {
          style.remove();
        }
      };
    } else {
      // 即使没有检测到扩展，也创建基础隔离样式
      createIsolationStyles();
      const observer = monitorExtensionInjection();
      
      return () => {
        if (observer) {
          observer.disconnect();
        }
        const style = document.getElementById('extension-isolation');
        if (style) {
          style.remove();
        }
      };
    }
  }, []);

  return null;
}
