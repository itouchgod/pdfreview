/**
 * 浏览器扩展干扰防护系统
 * 统一处理所有浏览器扩展对页面的干扰
 */

interface ExtensionGuardConfig {
  enableLogging?: boolean;
  enableIsolation?: boolean;
  enableErrorSuppression?: boolean;
  enableDOMProtection?: boolean;
}

class ExtensionGuard {
  private config: Required<ExtensionGuardConfig>;
  private originalConsole: {
    error: typeof console.error;
    warn: typeof console.warn;
    log: typeof console.log;
  };
  private originalWindowError: typeof window.onerror;
  private originalUnhandledRejection: typeof window.onunhandledrejection;
  private mutationObserver: MutationObserver | null = null;
  private isInitialized = false;

  // 扩展错误关键词列表 - 全面覆盖
  private readonly extensionKeywords = [
    // Chext 扩展相关
    'chext_', 'metadata.js', 'contentscript.js', 'content.js',
    'chext_driver.js', 'chext_loader.js', 'chrome-extension://',
    'Initialized driver at:', 'Initialized chextloader at:',
    
    // YouTube 扩展相关
    'yt-ext-', 'yt-ext-hidden', 'yt-ext-info-bar',
    
    // 通用扩展标识
    'chrome-extension://', 'moz-extension://', 'safari-extension://',
    
    // 网络错误
    'net::ERR_ABORTED', '404 (Not Found)', 'net::ERR_BLOCKED_BY_CLIENT',
    
    // DOM 操作错误
    'Failed to execute \'appendChild\' on \'Node\'',
    'Failed to execute \'appendChild\' on \'Node\': Unexpected identifier \'observe\'',
    'Failed to execute \'observe\' on \'MutationObserver\'',
    'parameter 1 is not of type \'Node\'',
    'Unexpected identifier \'observe\'',
    'appendChild\' on \'Node\'',
    
    // VM 脚本错误
    'VM', 'eval @ app-bootstrap.js', 'eval @ app-next-dev.js',
    'vendors-326d2db556600f52.js', 'webpack-f9bdc8f8e7ef5feb.js',
    'main-app-e131d669f65d8db7.js', 'index.ts-loader3.js',
    
    // 其他扩展相关
    'siteDubbingRules', 'ender metadata', 'mountUi return undefined',
    'cz-shortcut-listen', 'Skipping ads', 'searchs (7)',
    'messages MessageEvent', 'webpackJsonpCallback',
    
    // 水合错误
    'Hydration failed', 'hydrated but some attributes',
    'server rendered HTML didn\'t match', 'hydration mismatch',
    'throwOnHydrationMismatch'
  ];

  // VM 脚本模式匹配
  private readonly vmPatterns = [
    /VM\d+:14/,
    /VM\d+:\d+/,
    /eval @ app-bootstrap\.js/,
    /eval @ app-next-dev\.js/,
    /vendors-\w+\.js/,
    /webpack-\w+\.js/,
    /main-app-\w+\.js/
  ];

  constructor(config: ExtensionGuardConfig = {}) {
    this.config = {
      enableLogging: config.enableLogging ?? false,
      enableIsolation: config.enableIsolation ?? true,
      enableErrorSuppression: config.enableErrorSuppression ?? true,
      enableDOMProtection: config.enableDOMProtection ?? true
    };

    this.originalConsole = {
      error: console.error,
      warn: console.warn,
      log: console.log
    };

    this.originalWindowError = window.onerror;
    this.originalUnhandledRejection = window.onunhandledrejection;
  }

  /**
   * 初始化扩展防护系统
   */
  public init(): void {
    if (this.isInitialized) {
      return;
    }

    if (this.config.enableLogging) {
      this.log('🛡️ 扩展防护系统初始化中...');
    }

    // 立即启动错误抑制
    if (this.config.enableErrorSuppression) {
      this.setupErrorSuppression();
    }

    // 设置DOM保护
    if (this.config.enableDOMProtection) {
      this.setupDOMProtection();
    }

    // 设置扩展隔离
    if (this.config.enableIsolation) {
      this.setupExtensionIsolation();
    }

    // 监控扩展注入
    this.setupExtensionMonitoring();

    this.isInitialized = true;

    if (this.config.enableLogging) {
      this.log('✅ 扩展防护系统初始化完成');
    }
  }

  /**
   * 设置错误抑制机制
   */
  private setupErrorSuppression(): void {
    // 重写 console.error
    console.error = (...args) => {
      if (this.isExtensionError(args)) {
        return; // 静默处理扩展错误
      }
      this.originalConsole.error.apply(console, args);
    };

    // 重写 console.warn
    console.warn = (...args) => {
      if (this.isExtensionWarning(args)) {
        return; // 静默处理扩展警告
      }
      this.originalConsole.warn.apply(console, args);
    };

    // 全局错误处理
    window.onerror = (message, source, lineno, colno, error) => {
      if (this.isExtensionError([message, source])) {
        return true; // 阻止错误传播
      }
      if (this.originalWindowError) {
        return this.originalWindowError.call(window, message, source, lineno, colno, error);
      }
      return false;
    };

    // 未捕获的 Promise 错误处理
    window.onunhandledrejection = (event) => {
      if (this.isExtensionError([event.reason])) {
        event.preventDefault();
        return;
      }
      if (this.originalUnhandledRejection) {
        return this.originalUnhandledRejection.call(window, event);
      }
    };
  }

  /**
   * 设置DOM保护机制
   */
  private setupDOMProtection(): void {
    // 创建保护样式
    const style = document.createElement('style');
    style.id = 'extension-guard-protection';
    style.textContent = `
      /* 保护主要容器 */
      body {
        position: relative;
        z-index: 1;
      }
      
      #__next, main, [data-main] {
        position: relative;
        z-index: 10;
        isolation: isolate;
      }
      
      /* 隐藏扩展注入的元素 */
      [data-extension],
      [data-chext],
      [id*="chext"],
      [class*="chext"],
      [id*="metadata"],
      [class*="metadata"],
      [id*="contentscript"],
      [class*="contentscript"],
      [class*="yt-ext"],
      [data-yt-ext] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        z-index: -1 !important;
      }
      
      /* 保护关键组件 */
      [data-floating-button] {
        z-index: 1000 !important;
        position: fixed !important;
      }
      
      [data-search] {
        z-index: 100 !important;
      }
      
      /* 隐藏扩展脚本 */
      script[src*="chext"],
      script[src*="metadata.js"],
      script[src*="contentscript.js"],
      script[src*="chext_driver.js"],
      script[src*="chext_loader.js"] {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 设置扩展隔离机制
   */
  private setupExtensionIsolation(): void {
    // 检测并标记扩展
    this.detectExtensions();
  }

  /**
   * 设置扩展监控机制
   */
  private setupExtensionMonitoring(): void {
    if (!document.body) {
      // 等待 body 加载
      const observer = new MutationObserver(() => {
        if (document.body) {
          observer.disconnect();
          this.startDOMMonitoring();
        }
      });
      observer.observe(document.documentElement, { childList: true });
      return;
    }

    this.startDOMMonitoring();
  }

  /**
   * 开始DOM监控
   */
  private startDOMMonitoring(): void {
    try {
      this.mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.handleNewElement(node as Element);
            }
          });
        });
      });

      this.mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
      });

      if (this.config.enableLogging) {
        this.log('👁️ DOM监控已启动');
      }
    } catch (error) {
      if (this.config.enableLogging) {
        this.log('⚠️ DOM监控启动失败:', error);
      }
    }
  }

  /**
   * 处理新添加的元素
   */
  private handleNewElement(element: Element): void {
    if (this.isExtensionElement(element)) {
      this.isolateElement(element);
      if (this.config.enableLogging) {
        const elementId = element.id || '';
        const elementClass = typeof element.className === 'string' 
          ? element.className 
          : (element.className as DOMTokenList)?.toString() || '';
        this.log('🔇 已隔离扩展元素:', element.tagName, elementId || elementClass);
      }
    }
  }

  /**
   * 隔离扩展元素
   */
  private isolateElement(element: Element): void {
    element.setAttribute('data-extension', 'true');
    if (element instanceof HTMLElement) {
      element.style.display = 'none';
      element.style.visibility = 'hidden';
      element.style.opacity = '0';
      element.style.pointerEvents = 'none';
      element.style.zIndex = '-1';
    }
  }

  /**
   * 检测扩展
   */
  private detectExtensions(): string[] {
    const extensions: string[] = [];

    // 检测 Chext
    if ((window as any).chext || 
        document.querySelector('[data-chext]') ||
        document.querySelector('script[src*="chext"]')) {
      extensions.push('Chext');
    }

    // 检测 YouTube 扩展
    if (document.querySelector('[data-yt-ext]') || 
        document.querySelector('.yt-ext-')) {
      extensions.push('YouTube Extension');
    }

    // 检测 Chrome 扩展
    if ((window as any).chrome?.runtime) {
      extensions.push('Chrome Extension');
    }

    if (extensions.length > 0 && this.config.enableLogging) {
      this.log('🔍 检测到扩展:', extensions.join(', '));
    }

    return extensions;
  }

  /**
   * 检查是否是扩展错误
   */
  private isExtensionError(args: any[]): boolean {
    const message = args[0];
    if (typeof message !== 'string') {
      return false;
    }

    // 检查关键词匹配
    const hasKeyword = this.extensionKeywords.some(keyword => 
      message.includes(keyword)
    );

    // 检查VM脚本模式
    const hasVMPattern = this.vmPatterns.some(pattern => 
      pattern.test(message)
    );

    // 检查堆栈跟踪
    const stack = args[1] || '';
    const hasStackKeyword = typeof stack === 'string' && 
      this.extensionKeywords.some(keyword => stack.includes(keyword));

    return hasKeyword || hasVMPattern || hasStackKeyword;
  }

  /**
   * 检查是否是扩展警告
   */
  private isExtensionWarning(args: any[]): boolean {
    return this.isExtensionError(args);
  }

  /**
   * 检查是否是扩展元素
   */
  private isExtensionElement(element: Element): boolean {
    try {
      const id = element.id?.toLowerCase() || '';
      // 安全地处理 className，可能是字符串或 DOMTokenList
      const className = typeof element.className === 'string' 
        ? element.className.toLowerCase() 
        : (element.className as DOMTokenList)?.toString().toLowerCase() || '';
      const src = element.getAttribute('src')?.toLowerCase() || '';

      return (
        id.includes('chext') ||
        className.includes('chext') ||
        id.includes('metadata') ||
        className.includes('metadata') ||
        id.includes('contentscript') ||
        className.includes('contentscript') ||
        className.includes('yt-ext') ||
        element.hasAttribute('data-extension') ||
        element.hasAttribute('data-chext') ||
        element.hasAttribute('data-yt-ext') ||
        src.includes('chext') ||
        src.includes('metadata.js') ||
        src.includes('contentscript.js')
      );
    } catch (error) {
      // 如果出现任何错误，静默处理，避免影响页面功能
      if (this.config.enableLogging) {
        console.warn('[ExtensionGuard] Error checking extension element:', error);
      }
      return false;
    }
  }

  /**
   * 日志输出
   */
  private log(...args: any[]): void {
    if (this.config.enableLogging) {
      this.originalConsole.log('[ExtensionGuard]', ...args);
    }
  }

  /**
   * 销毁防护系统
   */
  public destroy(): void {
    if (!this.isInitialized) {
      return;
    }

    // 恢复原始console
    console.error = this.originalConsole.error;
    console.warn = this.originalConsole.warn;
    console.log = this.originalConsole.log;

    // 恢复原始错误处理
    window.onerror = this.originalWindowError;
    window.onunhandledrejection = this.originalUnhandledRejection;

    // 断开监控
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    // 移除保护样式
    const style = document.getElementById('extension-guard-protection');
    if (style) {
      style.remove();
    }

    this.isInitialized = false;

    if (this.config.enableLogging) {
      this.log('🗑️ 扩展防护系统已销毁');
    }
  }

  /**
   * 获取系统状态
   */
  public getStatus(): {
    initialized: boolean;
    extensions: string[];
    config: Required<ExtensionGuardConfig>;
  } {
    return {
      initialized: this.isInitialized,
      extensions: this.detectExtensions(),
      config: this.config
    };
  }
}

// 创建全局实例
let globalExtensionGuard: ExtensionGuard | null = null;

/**
 * 获取全局扩展防护实例
 */
export function getExtensionGuard(config?: ExtensionGuardConfig): ExtensionGuard {
  if (!globalExtensionGuard) {
    globalExtensionGuard = new ExtensionGuard(config);
  }
  return globalExtensionGuard;
}

/**
 * 初始化扩展防护系统
 */
export function initExtensionGuard(config?: ExtensionGuardConfig): ExtensionGuard {
  const guard = getExtensionGuard(config);
  guard.init();
  return guard;
}

/**
 * 销毁扩展防护系统
 */
export function destroyExtensionGuard(): void {
  if (globalExtensionGuard) {
    globalExtensionGuard.destroy();
    globalExtensionGuard = null;
  }
}

export default ExtensionGuard;
