import React, { useEffect, useState } from 'react';
import { usePerformance } from '../../hooks/usePerformance';
import { MONITORING_CONFIG, getPerformanceState } from '../../config/performance';

interface PerformanceData {
  fcp?: number;
  lcp?: number;
  fid?: number;
  cls?: number;
  ttfb?: number;
  loadTime: number;
  renderTime: number;
  memoryUsage?: number;
  networkInfo?: any;
}

interface PerformanceMonitorProps {
  enabled?: boolean;
  onReport?: (data: PerformanceData) => void;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  enabled = MONITORING_CONFIG.enabled,
  onReport,
}) => {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [reportQueue, setReportQueue] = useState<PerformanceData[]>([]);
  const metrics = usePerformance({
    trackMemory: true,
    trackConnection: true,
    onMetricsUpdate: (metrics) => {
      if (!enabled) return;
      
      const data: PerformanceData = {
        loadTime: metrics.loadTime,
        renderTime: metrics.renderTime,
        memoryUsage: metrics.memoryUsage,
        networkInfo: getPerformanceState().network,
      };
      
      setPerformanceData(data);
      onReport?.(data);
    },
  });

  // 收集Web Vitals指标
  useEffect(() => {
    if (!enabled || !MONITORING_CONFIG.metrics.webVitals) return;

    const collectWebVitals = async () => {
      try {
        // 收集FCP (First Contentful Paint)
        const paintEntries = performance.getEntriesByType('paint');
        const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        
        // 收集LCP (Largest Contentful Paint)
        let lcpValue = 0;
        if ('PerformanceObserver' in window) {
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            lcpValue = lastEntry.startTime;
          });
          
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
          
          // 停止观察（避免内存泄漏）
          setTimeout(() => lcpObserver.disconnect(), 10000);
        }

        // 收集FID (First Input Delay)
        let fidValue = 0;
        if ('PerformanceObserver' in window) {
          const fidObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry: any) => {
              fidValue = entry.processingStart - entry.startTime;
            });
          });
          
          fidObserver.observe({ entryTypes: ['first-input'] });
        }

        // 收集CLS (Cumulative Layout Shift)
        let clsValue = 0;
        if ('PerformanceObserver' in window) {
          const clsObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry: any) => {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            });
          });
          
          clsObserver.observe({ entryTypes: ['layout-shift'] });
        }

        // 收集TTFB (Time to First Byte)
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const ttfbValue = navigation ? navigation.responseStart - navigation.requestStart : 0;

        const webVitalsData: PerformanceData = {
          ...performanceData,
          fcp: fcpEntry?.startTime || 0,
          lcp: lcpValue,
          fid: fidValue,
          cls: clsValue,
          ttfb: ttfbValue,
          loadTime: metrics.loadTime,
          renderTime: metrics.renderTime,
          memoryUsage: metrics.memoryUsage,
        };

        setPerformanceData(webVitalsData);
        
        // 添加到报告队列
        setReportQueue(prev => [...prev, webVitalsData]);
        
      } catch (error) {
        console.error('Failed to collect Web Vitals:', error);
      }
    };

    // 延迟收集，确保页面完全加载
    const timer = setTimeout(collectWebVitals, 2000);
    return () => clearTimeout(timer);
  }, [enabled, performanceData, metrics]);

  // 批量发送性能报告
  useEffect(() => {
    if (!enabled || reportQueue.length === 0) return;

    const sendReports = async () => {
      if (reportQueue.length >= MONITORING_CONFIG.reporting.batchSize) {
        try {
          await fetch(MONITORING_CONFIG.reporting.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              reports: reportQueue,
              timestamp: Date.now(),
              url: window.location.href,
              userAgent: navigator.userAgent,
            }),
          });
          
          setReportQueue([]);
        } catch (error) {
          console.error('Failed to send performance reports:', error);
        }
      }
    };

    const interval = setInterval(sendReports, MONITORING_CONFIG.reporting.flushInterval);
    return () => clearInterval(interval);
  }, [enabled, reportQueue]);

  // 页面卸载时发送剩余报告
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = () => {
      if (reportQueue.length > 0) {
        // 使用sendBeacon发送最后的报告
        if ('sendBeacon' in navigator) {
          navigator.sendBeacon(
            MONITORING_CONFIG.reporting.endpoint,
            JSON.stringify({
              reports: reportQueue,
              timestamp: Date.now(),
              url: window.location.href,
              final: true,
            })
          );
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enabled, reportQueue]);

  // 性能预警
  useEffect(() => {
    if (!performanceData || !enabled) return;

    const checkThresholds = () => {
      const warnings = [];
      
      if (performanceData.fcp && performanceData.fcp > MONITORING_CONFIG.thresholds.fcp) {
        warnings.push(`FCP exceeded threshold: ${performanceData.fcp}ms`);
      }
      
      if (performanceData.lcp && performanceData.lcp > MONITORING_CONFIG.thresholds.lcp) {
        warnings.push(`LCP exceeded threshold: ${performanceData.lcp}ms`);
      }
      
      if (performanceData.fid && performanceData.fid > MONITORING_CONFIG.thresholds.fid) {
        warnings.push(`FID exceeded threshold: ${performanceData.fid}ms`);
      }
      
      if (performanceData.cls && performanceData.cls > MONITORING_CONFIG.thresholds.cls) {
        warnings.push(`CLS exceeded threshold: ${performanceData.cls}`);
      }
      
      if (performanceData.ttfb && performanceData.ttfb > MONITORING_CONFIG.thresholds.ttfb) {
        warnings.push(`TTFB exceeded threshold: ${performanceData.ttfb}ms`);
      }

      if (warnings.length > 0) {
        console.warn('Performance thresholds exceeded:', warnings);
        
        // 发送警告报告
        fetch('/api/performance/warnings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            warnings,
            data: performanceData,
            timestamp: Date.now(),
            url: window.location.href,
          }),
        }).catch(error => {
          console.error('Failed to send performance warnings:', error);
        });
      }
    };

    checkThresholds();
  }, [performanceData, enabled]);

  // 开发环境下显示性能信息
  if (process.env.NODE_ENV === 'development' && performanceData) {
    return (
      <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-3 rounded-lg text-xs font-mono z-50">
        <div className="space-y-1">
          <div>Load: {performanceData.loadTime}ms</div>
          <div>Render: {performanceData.renderTime}ms</div>
          {performanceData.fcp && <div>FCP: {Math.round(performanceData.fcp)}ms</div>}
          {performanceData.lcp && <div>LCP: {Math.round(performanceData.lcp)}ms</div>}
          {performanceData.fid && <div>FID: {Math.round(performanceData.fid)}ms</div>}
          {performanceData.cls && <div>CLS: {performanceData.cls.toFixed(3)}</div>}
          {performanceData.memoryUsage && (
            <div>Memory: {Math.round(performanceData.memoryUsage)}MB</div>
          )}
          {performanceData.networkInfo && (
            <div>Network: {performanceData.networkInfo.effectiveType}</div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default PerformanceMonitor;