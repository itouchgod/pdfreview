import { PerformanceMonitor } from './performance';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  version: string;
}

export class CacheManager {
  private static instance: CacheManager;
  private storage: 'localStorage' | 'indexedDB' = 'localStorage';
  private readonly MAX_LOCAL_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly DEFAULT_EXPIRY = 365 * 24 * 60 * 60 * 1000; // 1年（PDF文件不会变化）
  private readonly CACHE_VERSION = '1.0.0'; // 缓存版本控制

  private constructor() {
    this.initStorage();
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  private async initStorage() {
    // 检查 IndexedDB 支持
    if ('indexedDB' in window) {
      try {
        await this.openIndexedDB();
        this.storage = 'indexedDB';
      } catch (error) {
        console.warn('IndexedDB initialization failed, falling back to localStorage:', error);
        this.storage = 'localStorage';
      }
    }
  }

  private async openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ImpaPDFCache', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('pdfs')) {
          db.createObjectStore('pdfs');
        }
      };
    });
  }

  async set<T>(key: string, data: T, expiry: number = this.DEFAULT_EXPIRY): Promise<boolean> {
    const performanceMonitor = PerformanceMonitor.getInstance();
    const startTime = performanceMonitor.startMeasure();

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + expiry,
      version: this.CACHE_VERSION
    };

    try {
      if (this.storage === 'indexedDB') {
        await this.setIndexedDB(key, entry);
      } else {
        await this.setLocalStorage(key, entry);
      }

      performanceMonitor.endMeasure('cacheWrite', startTime, { key, storage: this.storage });
      return true;
    } catch (error) {
      console.error('Cache write failed:', error);
      performanceMonitor.endMeasure('cacheWrite', startTime, { key, error: true });
      return false;
    }
  }

  // 专门用于PDF文件的缓存方法，设置更长的过期时间
  async setPDF<T>(key: string, data: T): Promise<boolean> {
    const PDF_CACHE_EXPIRY = 365 * 24 * 60 * 60 * 1000; // 1年
    return this.set(key, data, PDF_CACHE_EXPIRY);
  }

  async get<T>(key: string): Promise<T | null> {
    const performanceMonitor = PerformanceMonitor.getInstance();
    const startTime = performanceMonitor.startMeasure();

    try {
      let entry: CacheEntry<T> | null = null;

      if (this.storage === 'indexedDB') {
        entry = await this.getIndexedDB<T>(key);
      } else {
        entry = await this.getLocalStorage<T>(key);
      }

      if (!entry) {
        performanceMonitor.endMeasure('cacheRead', startTime, { key, hit: false });
        return null;
      }

      // 检查是否过期
      if (entry.expiresAt < Date.now()) {
        await this.delete(key);
        performanceMonitor.endMeasure('cacheRead', startTime, { key, expired: true });
        return null;
      }

      // 检查版本兼容性
      if (entry.version !== this.CACHE_VERSION) {
        await this.delete(key);
        performanceMonitor.endMeasure('cacheRead', startTime, { key, versionMismatch: true });
        return null;
      }

      performanceMonitor.endMeasure('cacheRead', startTime, { key, hit: true });
      return entry.data;
    } catch (error) {
      console.error('Cache read failed:', error);
      performanceMonitor.endMeasure('cacheRead', startTime, { key, error: true });
      return null;
    }
  }

  private async setIndexedDB<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    const db = await this.openIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['pdfs'], 'readwrite');
      const store = transaction.objectStore('pdfs');
      const request = store.put(entry, key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private async getIndexedDB<T>(key: string): Promise<CacheEntry<T> | null> {
    const db = await this.openIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['pdfs'], 'readonly');
      const store = transaction.objectStore('pdfs');
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  private async setLocalStorage<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    try {
      const serialized = JSON.stringify(entry);
      if (serialized.length > this.MAX_LOCAL_STORAGE_SIZE) {
        throw new Error('Data too large for localStorage');
      }
      localStorage.setItem(key, serialized);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        await this.clearOldCache();
        // 重试一次
        localStorage.setItem(key, JSON.stringify(entry));
      } else {
        throw error;
      }
    }
  }

  private async getLocalStorage<T>(key: string): Promise<CacheEntry<T> | null> {
    const serialized = localStorage.getItem(key);
    if (!serialized) return null;
    return JSON.parse(serialized);
  }

  async delete(key: string): Promise<boolean> {
    try {
      if (this.storage === 'indexedDB') {
        const db = await this.openIndexedDB();
        const transaction = db.transaction(['pdfs'], 'readwrite');
        const store = transaction.objectStore('pdfs');
        await new Promise((resolve, reject) => {
          const request = store.delete(key);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve(true);
        });
      } else {
        localStorage.removeItem(key);
      }
      return true;
    } catch (error) {
      console.error('Cache delete failed:', error);
      return false;
    }
  }

  private async clearOldCache(): Promise<void> {
    const now = Date.now();
    if (this.storage === 'indexedDB') {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['pdfs'], 'readwrite');
      const store = transaction.objectStore('pdfs');
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const entry = cursor.value as CacheEntry<unknown>;
          if (entry.expiresAt < now) {
            cursor.delete();
          }
          cursor.continue();
        }
      };
    } else {
      // 清理 localStorage - 优化版本
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const serialized = localStorage.getItem(key);
          if (serialized) {
            try {
              const entry = JSON.parse(serialized) as CacheEntry<unknown>;
              if (entry.expiresAt < now) {
                keysToRemove.push(key);
              }
            } catch {
              // 忽略无效的 JSON
            }
          }
        }
      }
      // 批量删除过期项
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
  }
}
