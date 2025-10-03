/**
 * 开发者工具 - 用于调试和性能监控
 */

import { PerformanceMonitor } from './performance';

// 将开发者工具暴露到全局对象
declare global {
  interface Window {
    devTools: {
      performance: {
        enableVerbose: () => void;
        disableVerbose: () => void;
        getMetrics: () => any;
        clearMetrics: () => void;
        getAverages: () => any;
      };
      clearConsole: () => void;
      help: () => void;
    };
  }
}

export function initDevTools() {
  if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') {
    return;
  }

  const performanceMonitor = PerformanceMonitor.getInstance();

  window.devTools = {
    performance: {
      enableVerbose: () => {
        performanceMonitor.setVerboseLogging(true);
        console.log('🔍 详细性能日志已启用');
      },
      disableVerbose: () => {
        performanceMonitor.setVerboseLogging(false);
        console.log('🔇 详细性能日志已禁用');
      },
      getMetrics: () => {
        const metrics = performanceMonitor.getMetrics();
        console.table(metrics);
        return metrics;
      },
      clearMetrics: () => {
        performanceMonitor.clearMetrics();
        console.log('📊 性能指标已清空');
      },
      getAverages: () => {
        const averages = performanceMonitor.getAverages();
        console.table(averages);
        return averages;
      }
    },
    clearConsole: () => {
      console.clear();
      console.log('🧹 控制台已清空');
    },
    help: () => {
      console.log(`
🛠️ PDF预览平台 开发者工具

性能监控:
  devTools.performance.enableVerbose()  - 启用详细性能日志
  devTools.performance.disableVerbose() - 禁用详细性能日志
  devTools.performance.getMetrics()     - 查看所有性能指标
  devTools.performance.clearMetrics()   - 清空性能指标
  devTools.performance.getAverages()    - 查看平均性能

工具:
  devTools.clearConsole()               - 清空控制台
  devTools.help()                       - 显示此帮助信息

示例:
  // 启用详细日志，查看性能数据，然后禁用
  devTools.performance.enableVerbose();
  // ... 进行一些操作 ...
  devTools.performance.getAverages();
  devTools.performance.disableVerbose();
      `);
    }
  };

  // 显示欢迎信息
  console.log(`
🎯 PDF预览平台 开发者工具已加载

输入 devTools.help() 查看可用命令
输入 devTools.performance.enableVerbose() 启用详细性能日志
  `);
}
