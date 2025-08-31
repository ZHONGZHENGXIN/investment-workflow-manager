import React, { useState, useRef, useMemo, useCallback } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number | ((index: number, item: T) => number);
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
  getItemKey?: (item: T, index: number) => string | number;
}

function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = '',
  onScroll,
  getItemKey,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 计算项目高度
  const getItemHeightValue = useCallback((index: number, item: T): number => {
    return typeof itemHeight === 'function' ? itemHeight(index, item) : itemHeight;
  }, [itemHeight]);

  // 计算总高度和项目位置
  const { totalHeight, itemPositions } = useMemo(() => {
    let height = 0;
    const positions: number[] = [];

    items.forEach((item, index) => {
      positions[index] = height;
      height += getItemHeightValue(index, item);
    });

    return {
      totalHeight: height,
      itemPositions: positions,
    };
  }, [items, getItemHeightValue]);

  // 计算可见范围
  const visibleRange = useMemo(() => {
    if (items.length === 0) {
      return { start: 0, end: 0 };
    }

    let start = 0;
    let end = items.length - 1;

    // 找到第一个可见项目
    for (let i = 0; i < items.length; i++) {
      if (itemPositions[i] + getItemHeightValue(i, items[i]) > scrollTop) {
        start = Math.max(0, i - overscan);
        break;
      }
    }

    // 找到最后一个可见项目
    for (let i = start; i < items.length; i++) {
      if (itemPositions[i] > scrollTop + containerHeight) {
        end = Math.min(items.length - 1, i + overscan);
        break;
      }
    }

    return { start, end };
  }, [items, itemPositions, scrollTop, containerHeight, overscan, getItemHeightValue]);

  // 处理滚动事件
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  }, [onScroll]);

  // 滚动到指定项目
  // const scrollToItem = useCallback((index: number, align: 'start' | 'center' | 'end' = 'start') => {
  //   if (!containerRef.current || index < 0 || index >= items.length) return;

  //   const itemTop = itemPositions[index];
  //   const itemHeight = getItemHeightValue(index, items[index]);
    
  //   let scrollTo = itemTop;

  //   if (align === 'center') {
  //     scrollTo = itemTop - (containerHeight - itemHeight) / 2;
  //   } else if (align === 'end') {
  //     scrollTo = itemTop - containerHeight + itemHeight;
  //   }

  //   containerRef.current.scrollTop = Math.max(0, Math.min(scrollTo, totalHeight - containerHeight));
  // }, [items, itemPositions, containerHeight, totalHeight, getItemHeightValue]);

  // 渲染可见项目
  const visibleItems = useMemo(() => {
    const items_to_render = [];
    
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      const item = items[i];
      const key = getItemKey ? getItemKey(item, i) : i;
      const top = itemPositions[i];
      const height = getItemHeightValue(i, item);

      items_to_render.push(
        <div
          key={key}
          style={{
            position: 'absolute',
            top,
            left: 0,
            right: 0,
            height,
          }}
        >
          {renderItem(item, i)}
        </div>
      );
    }

    return items_to_render;
  }, [items, visibleRange, itemPositions, renderItem, getItemKey, getItemHeightValue]);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: totalHeight,
          position: 'relative',
        }}
      >
        {visibleItems}
      </div>
    </div>
  );
}

// 固定高度的虚拟列表（性能更好）
interface FixedVirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
  getItemKey?: (item: T, index: number) => string | number;
}

export function FixedVirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = '',
  onScroll,
  getItemKey,
}: FixedVirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalHeight = items.length * itemHeight;
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(items.length - 1, startIndex + visibleCount + overscan * 2);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  }, [onScroll]);

  // const scrollToItem = useCallback((index: number, align: 'start' | 'center' | 'end' = 'start') => {
  //   if (!containerRef.current || index < 0 || index >= items.length) return;

  //   let scrollTo = index * itemHeight;

  //   if (align === 'center') {
  //     scrollTo = scrollTo - (containerHeight - itemHeight) / 2;
  //   } else if (align === 'end') {
  //     scrollTo = scrollTo - containerHeight + itemHeight;
  //   }

  //   containerRef.current.scrollTop = Math.max(0, Math.min(scrollTo, totalHeight - containerHeight));
  // }, [items.length, itemHeight, containerHeight, totalHeight]);

  const visibleItems = useMemo(() => {
    const items_to_render = [];
    
    for (let i = startIndex; i <= endIndex; i++) {
      const item = items[i];
      const key = getItemKey ? getItemKey(item, i) : i;

      items_to_render.push(
        <div
          key={key}
          style={{
            position: 'absolute',
            top: i * itemHeight,
            left: 0,
            right: 0,
            height: itemHeight,
          }}
        >
          {renderItem(item, i)}
        </div>
      );
    }

    return items_to_render;
  }, [items, startIndex, endIndex, itemHeight, renderItem, getItemKey]);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: totalHeight,
          position: 'relative',
        }}
      >
        {visibleItems}
      </div>
    </div>
  );
}

// 网格虚拟化组件
interface VirtualGridProps<T> {
  items: T[];
  itemWidth: number;
  itemHeight: number;
  containerWidth: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  gap?: number;
  overscan?: number;
  className?: string;
  getItemKey?: (item: T, index: number) => string | number;
}

export function VirtualGrid<T>({
  items,
  itemWidth,
  itemHeight,
  containerWidth,
  containerHeight,
  renderItem,
  gap = 0,
  overscan = 5,
  className = '',
  getItemKey,
}: VirtualGridProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const columnsCount = Math.floor((containerWidth + gap) / (itemWidth + gap));
  const rowsCount = Math.ceil(items.length / columnsCount);
  const totalHeight = rowsCount * (itemHeight + gap) - gap;

  const visibleRowsCount = Math.ceil(containerHeight / (itemHeight + gap));
  const startRow = Math.max(0, Math.floor(scrollTop / (itemHeight + gap)) - overscan);
  const endRow = Math.min(rowsCount - 1, startRow + visibleRowsCount + overscan * 2);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  const visibleItems = useMemo(() => {
    const items_to_render = [];

    for (let row = startRow; row <= endRow; row++) {
      for (let col = 0; col < columnsCount; col++) {
        const index = row * columnsCount + col;
        if (index >= items.length) break;

        const item = items[index];
        const key = getItemKey ? getItemKey(item, index) : index;
        const x = col * (itemWidth + gap);
        const y = row * (itemHeight + gap);

        items_to_render.push(
          <div
            key={key}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: itemWidth,
              height: itemHeight,
            }}
          >
            {renderItem(item, index)}
          </div>
        );
      }
    }

    return items_to_render;
  }, [items, startRow, endRow, columnsCount, itemWidth, itemHeight, gap, renderItem, getItemKey]);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ width: containerWidth, height: containerHeight }}
      onScroll={handleScroll}
    >
      <div
        style={{
          width: containerWidth,
          height: totalHeight,
          position: 'relative',
        }}
      >
        {visibleItems}
      </div>
    </div>
  );
}

export default VirtualList;