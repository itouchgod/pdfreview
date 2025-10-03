/**
 * 性能优化工具类
 * 提供各种性能优化功能，包括虚拟滚动、懒加载、防抖等
 */

// 防抖函数
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
}

// 节流函数
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// 虚拟滚动配置
export interface VirtualScrollConfig {
  itemHeight: number;
  containerHeight: number;
  overscan?: number; // 预渲染的项目数量
}

// 虚拟滚动计算器
export class VirtualScrollCalculator {
  private config: VirtualScrollConfig;
  
  constructor(config: VirtualScrollConfig) {
    this.config = {
      overscan: 5,
      ...config
    };
  }
  
  calculateVisibleRange(
    scrollTop: number,
    totalItems: number
  ): { start: number; end: number; offsetY: number } {
    const { itemHeight, containerHeight, overscan = 5 } = this.config;
    
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(totalItems, start + visibleCount + overscan * 2);
    const offsetY = start * itemHeight;
    
    return { start, end, offsetY };
  }
  
  getTotalHeight(totalItems: number): number {
    return totalItems * this.config.itemHeight;
  }
}

// 图片懒加载
export class LazyImageLoader {
  private observer: IntersectionObserver | null = null;
  private loadedImages = new Set<string>();
  
  constructor() {
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement;
              const src = img.dataset.src;
              if (src && !this.loadedImages.has(src)) {
                img.src = src;
                img.classList.remove('lazy');
                this.loadedImages.add(src);
                this.observer?.unobserve(img);
              }
            }
          });
        },
        {
          rootMargin: '50px 0px',
          threshold: 0.01
        }
      );
    }
  }
  
  observe(img: HTMLImageElement): void {
    if (this.observer) {
      this.observer.observe(img);
    }
  }
  
  unobserve(img: HTMLImageElement): void {
    if (this.observer) {
      this.observer.unobserve(img);
    }
  }
  
  disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// 内存管理
export class MemoryManager {
  private static instance: MemoryManager;
  private cache = new Map<string, any>();
  private maxCacheSize = 100; // 最大缓存项数
  private maxCacheAge = 5 * 60 * 1000; // 5分钟
  
  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }
  
  set(key: string, value: any, ttl?: number): void {
    // 如果缓存已满，删除最旧的项
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    
    const expiry = ttl ? Date.now() + ttl : Date.now() + this.maxCacheAge;
    this.cache.set(key, {
      value,
      expiry
    });
  }
  
  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

// 批量处理
export class BatchProcessor<T> {
  private queue: T[] = [];
  private processing = false;
  private batchSize: number;
  private delay: number;
  private processor: (items: T[]) => Promise<void> | void;
  
  constructor(
    processor: (items: T[]) => Promise<void> | void,
    batchSize = 10,
    delay = 100
  ) {
    this.processor = processor;
    this.batchSize = batchSize;
    this.delay = delay;
  }
  
  add(item: T): void {
    this.queue.push(item);
    this.scheduleProcess();
  }
  
  addBatch(items: T[]): void {
    this.queue.push(...items);
    this.scheduleProcess();
  }
  
  private scheduleProcess(): void {
    if (this.processing) return;
    
    setTimeout(() => {
      this.process();
    }, this.delay);
  }
  
  private async process(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.batchSize);
      try {
        await this.processor(batch);
      } catch (error) {
        console.error('Batch processing error:', error);
      }
    }
    
    this.processing = false;
  }
  
  clear(): void {
    this.queue = [];
  }
  
  getQueueSize(): number {
    return this.queue.length;
  }
}

// 性能监控
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics = new Map<string, number[]>();
  private isEnabled = false;
  
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  enable(): void {
    this.isEnabled = true;
  }
  
  disable(): void {
    this.isEnabled = false;
  }
  
  startMeasure(_name: string): number {
    if (!this.isEnabled) return 0;
    return performance.now();
  }
  
  endMeasure(name: string, startTime: number, metadata?: any): number {
    if (!this.isEnabled || startTime === 0) return 0;
    
    const duration = performance.now() - startTime;
    
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const measurements = this.metrics.get(name)!;
    measurements.push(duration);
    
    // 只保留最近100次测量
    if (measurements.length > 100) {
      measurements.shift();
    }
    
    if (metadata) {
      console.log(`Performance [${name}]: ${duration.toFixed(2)}ms`, metadata);
    }
    
    return duration;
  }
  
  getAverage(name: string): number {
    const measurements = this.metrics.get(name);
    if (!measurements || measurements.length === 0) return 0;
    
    return measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
  }
  
  getMetrics(): Record<string, { average: number; count: number; latest: number }> {
    const result: Record<string, { average: number; count: number; latest: number }> = {};
    
    for (const [name, measurements] of this.metrics.entries()) {
      result[name] = {
        average: this.getAverage(name),
        count: measurements.length,
        latest: measurements[measurements.length - 1] || 0
      };
    }
    
    return result;
  }
  
  clear(): void {
    this.metrics.clear();
  }
}

// 资源预加载
export class ResourcePreloader {
  private static instance: ResourcePreloader;
  private preloadedResources = new Set<string>();
  
  static getInstance(): ResourcePreloader {
    if (!ResourcePreloader.instance) {
      ResourcePreloader.instance = new ResourcePreloader();
    }
    return ResourcePreloader.instance;
  }
  
  async preloadImage(src: string): Promise<void> {
    if (this.preloadedResources.has(src)) return;
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.preloadedResources.add(src);
        resolve();
      };
      img.onerror = reject;
      img.src = src;
    });
  }
  
  async preloadScript(src: string): Promise<void> {
    if (this.preloadedResources.has(src)) return;
    
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.onload = () => {
        this.preloadedResources.add(src);
        resolve();
      };
      script.onerror = reject;
      script.src = src;
      document.head.appendChild(script);
    });
  }
  
  async preloadStylesheet(href: string): Promise<void> {
    if (this.preloadedResources.has(href)) return;
    
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'style';
      link.href = href;
      link.onload = () => {
        this.preloadedResources.add(href);
        resolve();
      };
      link.onerror = reject;
      document.head.appendChild(link);
    });
  }
  
  isPreloaded(src: string): boolean {
    return this.preloadedResources.has(src);
  }
  
  clear(): void {
    this.preloadedResources.clear();
  }
}

// 导出单例实例
export const memoryManager = MemoryManager.getInstance();
export const performanceMonitor = PerformanceMonitor.getInstance();
export const resourcePreloader = ResourcePreloader.getInstance();
