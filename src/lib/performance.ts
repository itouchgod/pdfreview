export interface PerformanceMetric {
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private measurements: Record<string, PerformanceMetric[]> = {};
  private verboseLogging: boolean = false;

  private constructor() {
    // 私有构造函数
    // 检查是否有详细日志的环境变量
    if (typeof window !== 'undefined') {
      this.verboseLogging = localStorage.getItem('performance-verbose') === 'true';
    }
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startMeasure(category: string): number {
    return performance.now();
  }

  endMeasure(category: string, startTime: number, metadata?: Record<string, any>) {
    const duration = performance.now() - startTime;
    const metric: PerformanceMetric = {
      duration,
      timestamp: Date.now(),
      metadata
    };

    if (!this.measurements[category]) {
      this.measurements[category] = [];
    }
    this.measurements[category].push(metric);

    // 只在开发环境且满足条件时记录到控制台
    if (process.env.NODE_ENV === 'development') {
      const shouldLog = this.verboseLogging || this.shouldLogPerformance(category, duration, metadata);
      if (shouldLog) {
        console.log(`Performance [${category}]:`, {
          duration: `${duration.toFixed(2)}ms`,
          ...(metadata || {})
        });
      }
    }

    // 如果超过阈值，发出警告
    this.checkThreshold(category, duration);
  }

  private shouldLogPerformance(category: string, duration: number, metadata?: Record<string, any>): boolean {
    // 对于快速操作，减少日志频率
    const quickOperations = ['page_navigation'];
    if (quickOperations.includes(category) && duration < 10) {
      return false;
    }

    // 对于缓存命中，只在首次或异常时记录
    if (category === 'cacheRead' && metadata?.hit === true && duration < 100) {
      return false;
    }

    // 对于页面渲染，只在较慢时记录（提高阈值）
    if (category === 'page_render' && duration < 200) {
      return false;
    }

    // 对于PDF加载，只在首次或异常时记录
    if (category === 'pdf_load' && metadata?.cached === true && duration < 200) {
      return false;
    }

    return true;
  }

  private checkThreshold(category: string, duration: number) {
    const thresholds: Record<string, number> = {
      pdfLoad: 3000,    // 3秒
      search: 500,      // 500毫秒
      pageRender: 200,  // 200毫秒
      cacheHit: 100,    // 100毫秒
      cacheMiss: 1000   // 1秒
    };

    if (thresholds[category] && duration > thresholds[category]) {
      console.warn(`Performance warning: ${category} took ${duration.toFixed(2)}ms, threshold is ${thresholds[category]}ms`);
    }
  }

  getMetrics(category?: string): Record<string, PerformanceMetric[]> {
    if (category) {
      return { [category]: this.measurements[category] || [] };
    }
    return this.measurements;
  }

  getAverages(): Record<string, number> {
    const averages: Record<string, number> = {};
    
    Object.entries(this.measurements).forEach(([category, metrics]) => {
      if (metrics.length > 0) {
        const total = metrics.reduce((sum, metric) => sum + metric.duration, 0);
        averages[category] = total / metrics.length;
      }
    });
    
    return averages;
  }

  clearMetrics(category?: string) {
    if (category) {
      this.measurements[category] = [];
    } else {
      this.measurements = {};
    }
  }

  setVerboseLogging(enabled: boolean) {
    this.verboseLogging = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('performance-verbose', enabled.toString());
    }
  }

  getVerboseLogging(): boolean {
    return this.verboseLogging;
  }
}