import React, { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries, HistogramSeries, ColorType, CrosshairMode } from 'lightweight-charts';

const AssetChart = ({ candles, support, resistance, height = 400 }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current || !candles || candles.length === 0) return;

    // Clear previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height,
      localization: {
        locale: 'en-US',
        dateFormat: 'yyyy-MM-dd',
        timeFormatter: (time) => {
          const d = new Date(time * 1000);
          return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        },
      },
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#888',
        fontFamily: 'Inter, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.03)' },
        horzLines: { color: 'rgba(255,255,255,0.03)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(207,174,70,0.3)', labelBackgroundColor: '#CFAE46' },
        horzLine: { color: 'rgba(207,174,70,0.3)', labelBackgroundColor: '#CFAE46' },
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.1)',
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.1)',
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time) => {
          const d = new Date(time * 1000);
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const hours = String(d.getHours()).padStart(2, '0');
          const mins = String(d.getMinutes()).padStart(2, '0');
          return `${month}/${day} ${hours}:${mins}`;
        },
      },
    });

    chartRef.current = chart;

    // Candlestick series (v5 API - pass class reference)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#00E676',
      downColor: '#FF5252',
      borderDownColor: '#FF5252',
      borderUpColor: '#00E676',
      wickDownColor: '#FF5252',
      wickUpColor: '#00E676',
    });

    // Convert timestamps to Unix seconds (ensure proper integer)
    const toUnix = (c) => {
      if (typeof c.time === 'number') return c.time;
      return Math.floor(new Date(c.timestamp).getTime() / 1000);
    };

    const chartData = candles.map(c => ({
      time: toUnix(c),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    candleSeries.setData(chartData);

    // Volume series (v5 API)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: 'rgba(207,174,70,0.15)',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    volumeSeries.setData(candles.map(c => ({
      time: toUnix(c),
      value: c.volume,
      color: c.close >= c.open ? 'rgba(0,230,118,0.2)' : 'rgba(255,82,82,0.2)',
    })));

    // Support/Resistance lines
    if (support) {
      candleSeries.createPriceLine({
        price: support,
        color: '#00E676',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'Support',
      });
    }
    if (resistance) {
      candleSeries.createPriceLine({
        price: resistance,
        color: '#FF5252',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'Resistance',
      });
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [candles, support, resistance, height]);

  return (
    <div ref={chartContainerRef} className="w-full rounded-xl overflow-hidden" data-testid="asset-chart" />
  );
};

export default AssetChart;
