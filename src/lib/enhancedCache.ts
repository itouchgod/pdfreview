/**
 * 增强的缓存管理器
 * 提供更智能的缓存策略和内存管理
 */

// import { memoryManager } from './performanceOptimizer';

export interface CacheOptions {
  ttl?: number; // 生存时间（毫秒）
  maxSize?: number; // 最大缓存大小
  priority?: 'low' | 'normal' | 'high'; // 缓存优先级
  persistent?: boolean; // 是否持久化到localStorage
}

export interface CacheItem<T> {
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  priority: 'low' | 'normal' | 'high';
  size: number;
}

export class EnhancedCache<T = any> {
  private cache = new Map<string, CacheItem<T>>();
  private maxSize: number;
  private defaultTTL: number;
  private persistent: boolean;
  private storageKey: string;
  
  constructor(
    name: string,
    options: CacheOptions = {}
  ) {
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.ttl || 5 * 60 * 1000; // 5分钟
    this.persistent = options.persistent || false;
    this.storageKey = `enhanced_cache_${name}`;
    
    if (this.persistent) {
      this.loadFromStorage();
    }
    
    // 定期清理过期项
    setInterval(() => this.cleanup(), 60000); // 每分钟清理一次
  }
  
  set(key: string, value: T, options: CacheOptions = {}): void {
    const now = Date.now();
    const ttl = options.ttl || this.defaultTTL;
    const priority = options.priority || 'normal';
    const size = this.calculateSize(value);
    
    // 如果缓存已满，删除最旧的项
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    
    const item: CacheItem<T> = {
      value,
      timestamp: now,
      ttl,
      accessCount: 0,
      lastAccessed: now,
      priority,
      size
    };
    
    this.cache.set(key, item);
    
    if (this.persistent) {
      this.saveToStorage();
    }
  }
  
  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    const now = Date.now();
    
    // 检查是否过期
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      if (this.persistent) {
        this.saveToStorage();
      }
      return null;
    }
    
    // 更新访问统计
    item.accessCount++;
    item.lastAccessed = now;
    
    return item.value;
  }
  
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
  
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted && this.persistent) {
      this.saveToStorage();
    }
    return deleted;
  }
  
  clear(): void {
    this.cache.clear();
    if (this.persistent) {
      localStorage.removeItem(this.storageKey);
    }
  }
  
  size(): number {
    return this.cache.size;
  }
  
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
  
  values(): T[] {
    return Array.from(this.cache.values()).map(item => item.value);
  }
  
  entries(): [string, T][] {
    return Array.from(this.cache.entries()).map(([key, item]) => [key, item.value]);
  }
  
  // 获取缓存统计信息
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    totalAccess: number;
    memoryUsage: number;
    oldestItem: number;
    newestItem: number;
  } {
    const items = Array.from(this.cache.values());
    const totalAccess = items.reduce((sum, item) => sum + item.accessCount, 0);
    const memoryUsage = items.reduce((sum, item) => sum + item.size, 0);
    const timestamps = items.map(item => item.timestamp);
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: totalAccess > 0 ? items.reduce((sum, item) => sum + item.accessCount, 0) / totalAccess : 0,
      totalAccess,
      memoryUsage,
      oldestItem: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestItem: timestamps.length > 0 ? Math.max(...timestamps) : 0
    };
  }
  
  // 清理过期项
  private cleanup(): void {
    const now = Date.now();
    let cleaned = false;
    
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        cleaned = true;
      }
    }
    
    if (cleaned && this.persistent) {
      this.saveToStorage();
    }
  }
  
  // LRU淘汰策略
  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    let lowestPriority = 'high';
    
    for (const [key, item] of this.cache.entries()) {
      const priority = this.getPriorityValue(item.priority);
      const currentPriority = this.getPriorityValue(lowestPriority);
      
      // 优先淘汰低优先级的项
      if (priority < currentPriority) {
        oldestKey = key;
        oldestTime = item.lastAccessed;
        lowestPriority = item.priority;
      } else if (priority === currentPriority && item.lastAccessed < oldestTime) {
        oldestKey = key;
        oldestTime = item.lastAccessed;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
  
  private getPriorityValue(priority: string): number {
    switch (priority) {
      case 'high': return 3;
      case 'normal': return 2;
      case 'low': return 1;
      default: return 2;
    }
  }
  
  // 计算对象大小（粗略估算）
  private calculateSize(value: any): number {
    try {
      return JSON.stringify(value).length * 2; // 粗略估算，UTF-16编码
    } catch {
      return 1024; // 默认1KB
    }
  }
  
  // 从localStorage加载
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        for (const [key, item] of Object.entries(data)) {
          this.cache.set(key, item as CacheItem<T>);
        }
      }
    } catch (error) {
      console.warn('Failed to load cache from storage:', error);
    }
  }
  
  // 保存到localStorage
  private saveToStorage(): void {
    try {
      const data: Record<string, CacheItem<T>> = {};
      for (const [key, item] of this.cache.entries()) {
        data[key] = item;
      }
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save cache to storage:', error);
    }
  }
}

// 缓存管理器工厂
export class CacheManagerFactory {
  private static caches = new Map<string, EnhancedCache>();
  
  static create<T>(name: string, options?: CacheOptions): EnhancedCache<T> {
    if (!this.caches.has(name)) {
      this.caches.set(name, new EnhancedCache<T>(name, options));
    }
    return this.caches.get(name) as EnhancedCache<T>;
  }
  
  static get<T>(name: string): EnhancedCache<T> | undefined {
    return this.caches.get(name) as EnhancedCache<T>;
  }
  
  static clear(name?: string): void {
    if (name) {
      const cache = this.caches.get(name);
      if (cache) {
        cache.clear();
        this.caches.delete(name);
      }
    } else {
      for (const cache of this.caches.values()) {
        cache.clear();
      }
      this.caches.clear();
    }
  }
  
  static getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    for (const [name, cache] of this.caches.entries()) {
      stats[name] = cache.getStats();
    }
    return stats;
  }
}

// 预定义的缓存实例
export const pdfCache = CacheManagerFactory.create('pdf', {
  ttl: 24 * 60 * 60 * 1000, // 24小时
  maxSize: 50,
  priority: 'high',
  persistent: true
});

export const searchCache = CacheManagerFactory.create('search', {
  ttl: 60 * 60 * 1000, // 1小时
  maxSize: 200,
  priority: 'normal',
  persistent: true
});

export const imageCache = CacheManagerFactory.create('images', {
  ttl: 7 * 24 * 60 * 60 * 1000, // 7天
  maxSize: 100,
  priority: 'low',
  persistent: false
});

export const textCache = CacheManagerFactory.create('text', {
  ttl: 7 * 24 * 60 * 60 * 1000, // 7天
  maxSize: 1000,
  priority: 'high',
  persistent: true
});

// 缓存工具函数
export const cacheUtils = {
  // 创建带缓存的异步函数
  withCache: <T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    cache: EnhancedCache<R>,
    keyGenerator: (...args: T) => string,
    options?: CacheOptions
  ) => {
    return async (...args: T): Promise<R> => {
      const key = keyGenerator(...args);
      const cached = cache.get(key);
      
      if (cached !== null) {
        return cached;
      }
      
      const result = await fn(...args);
      cache.set(key, result, options);
      return result;
    };
  },
  
  // 批量获取缓存
  batchGet: <T>(cache: EnhancedCache<T>, keys: string[]): (T | null)[] => {
    return keys.map(key => cache.get(key));
  },
  
  // 批量设置缓存
  batchSet: <T>(cache: EnhancedCache<T>, entries: [string, T][], options?: CacheOptions): void => {
    entries.forEach(([key, value]) => cache.set(key, value, options));
  },
  
  // 预热缓存
  warmup: async <T>(
    cache: EnhancedCache<T>,
    keys: string[],
    loader: (key: string) => Promise<T>,
    options?: CacheOptions
  ): Promise<void> => {
    const promises = keys.map(async (key) => {
      if (!cache.has(key)) {
        try {
          const value = await loader(key);
          cache.set(key, value, options);
        } catch (error) {
          console.warn(`Failed to warmup cache for key ${key}:`, error);
        }
      }
    });
    
    await Promise.all(promises);
  }
};
