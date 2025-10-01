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
      
      // 检测 Chext 扩展
      if (window.chext || document.querySelector('[data-chext]')) {
        extensions.push('Chext');
      }
      
      // 检测 YouTube 相关扩展
      if (document.querySelector('[data-yt-ext]') || 
          document.querySelector('.yt-ext-') ||
          window.ytExt) {
        extensions.push('YouTube Extension');
      }
      
      // 检测其他常见扩展
      if (window.chrome && window.chrome.runtime) {
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
        [data-extension] {
          display: none !important;
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
              
              // 检查是否是扩展注入的元素
              if (element.id?.includes('chext') ||
                  element.className?.includes('yt-ext') ||
                  element.getAttribute('data-extension') ||
                  element.tagName?.toLowerCase().includes('extension')) {
                
                // 标记为扩展元素
                element.setAttribute('data-extension', 'true');
                element.style.display = 'none';
                
                console.warn('🔇 已隔离扩展注入的元素:', element.tagName, element.id || element.className);
              }
            }
          });
        });
      });

      try {
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
        return observer;
      } catch (error) {
        console.warn('🔇 MutationObserver 初始化失败:', error);
        return null;
      }
    };

    // 执行扩展检测和隔离
    const extensions = detectExtensions();
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
    }

    return undefined;
  }, []);

  return null;
}
