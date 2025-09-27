export interface PerformanceMetric {
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private measurements: Record<string, PerformanceMetric[]> = {
    pdfLoad: [],
    search: [],
    pageRender: [],
    cacheHit: [],
    cacheMiss: []
  };

  private constructor() {
    // 私有构造函数
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  startMeasure(category: string, metadata?: Record<string, any>): number {
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

    // 记录到控制台
    console.log(`Performance [${category}]:`, {
      duration: `${duration.toFixed(2)}ms`,
      ...(metadata || {})
    });

    // 如果超过阈值，发出警告
    this.checkThreshold(category, duration);
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
      this.measurements = {
        pdfLoad: [],
        search: [],
        pageRender: [],
        cacheHit: [],
        cacheMiss: []
      };
    }
  }
}