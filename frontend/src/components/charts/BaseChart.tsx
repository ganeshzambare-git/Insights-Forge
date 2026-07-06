import React, { useEffect, useRef, useState } from 'react';
import type { ECharts, EChartsOption } from 'echarts';

interface BaseChartProps {
  option: EChartsOption;
  style?: React.CSSProperties;
  className?: string;
  theme?: 'light' | 'dark' | 'ventriloc';
  height?: string;
  onEvents?: Record<string, (params: unknown) => void>;
}

export const BaseChart: React.FC<BaseChartProps> = React.memo(({ option, style, className, theme = 'light', onEvents }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<ECharts | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let resizeObserver: ResizeObserver;
    
    // Lazy load ECharts to fix Sprint 1 bundle size issue (>1.4MB)
    const loadECharts = async () => {
      if (!chartRef.current) return;
      
      const echarts = await import('echarts');

      // Ventriloc editorial chart theme: monochrome grays, ember + brass strokes,
      // white surfaces — charts read like a printed report, not a terminal.
      echarts.registerTheme('ventriloc', {
        color: ['#ff682c', '#816729', '#4d4d4d', '#828282', '#202020'],
        backgroundColor: 'transparent',
        textStyle: { color: '#4d4d4d', fontFamily: 'Inter, sans-serif' },
        title: { textStyle: { color: '#202020', fontWeight: 400 } },
        legend: { textStyle: { color: '#4d4d4d' } },
        categoryAxis: {
          axisLine: { lineStyle: { color: '#e8e8e8' } },
          axisTick: { show: false },
          axisLabel: { color: '#828282' },
          splitLine: { lineStyle: { color: '#efefef' } },
        },
        valueAxis: {
          axisLine: { show: false },
          axisLabel: { color: '#828282' },
          splitLine: { lineStyle: { color: '#efefef' } },
        },
        tooltip: {
          backgroundColor: '#ffffff',
          borderColor: '#e8e8e8',
          textStyle: { color: '#202020' },
        },
      });

      if (!chartInstance.current) {
        chartInstance.current = echarts.init(chartRef.current, 'ventriloc', {
          renderer: 'canvas',
          useDirtyRect: true, // Optimizes redrawing
        });
        
        if (onEvents) {
          Object.entries(onEvents).forEach(([eventName, handler]) => {
            chartInstance.current?.on(eventName, handler);
          });
        }
      }

      chartInstance.current.setOption(option, true);
      setIsLoaded(true);

      resizeObserver = new ResizeObserver(() => {
        chartInstance.current?.resize({
          animation: { duration: 100 }
        });
      });
      
      resizeObserver.observe(chartRef.current);
    };

    loadECharts();

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, [option, theme]);

  return (
    <div 
      style={{ width: '100%', height: '100%', minHeight: '300px', position: 'relative', ...style }} 
      className={className}
    >
      {!isLoaded && (
        <div className="h-full w-full flex items-center justify-center text-muted-foreground animate-pulse" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Loading Visualization Engine...
        </div>
      )}
      <div 
        ref={chartRef} 
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
});

BaseChart.displayName = 'BaseChart';
