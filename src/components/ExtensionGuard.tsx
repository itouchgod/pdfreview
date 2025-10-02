'use client';

import { useEffect } from 'react';
import { initExtensionGuard, destroyExtensionGuard } from '@/lib/extensionGuard';

interface ExtensionGuardProps {
  enableLogging?: boolean;
  enableIsolation?: boolean;
  enableErrorSuppression?: boolean;
  enableDOMProtection?: boolean;
}

/**
 * 浏览器扩展防护组件
 * 统一处理所有浏览器扩展对页面的干扰
 */
export default function ExtensionGuard({
  enableLogging = false,
  enableIsolation = true,
  enableErrorSuppression = true,
  enableDOMProtection = true
}: ExtensionGuardProps) {
  useEffect(() => {
    // 初始化扩展防护系统
    initExtensionGuard({
      enableLogging,
      enableIsolation,
      enableErrorSuppression,
      enableDOMProtection
    });

    // 清理函数
    return () => {
      destroyExtensionGuard();
    };
  }, [enableLogging, enableIsolation, enableErrorSuppression, enableDOMProtection]);

  // 这个组件不渲染任何内容
  return null;
}
