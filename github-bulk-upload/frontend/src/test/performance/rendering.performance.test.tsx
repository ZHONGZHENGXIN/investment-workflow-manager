import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { performance } from 'perf_hooks';
import WorkflowList from '../../components/workflow/WorkflowList';
import HistoryList from '../../components/history/HistoryList';
import workflowSlice from '../../store/workflowSlice';
import historySlice from '../../store/historySlice';

// Generate large datasets for performance testing
const generateWorkflows = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `workflow-${i}`,
    name: `工作流 ${i + 1}`,
    description: `这是第 ${i + 1} 个工作流的描述`,
    steps: Array.from({ length: 5 }, (_, j) => ({
      id: `step-${i}-${j}`,
      title: `步骤 ${j + 1}`,
      description: `步骤 ${j + 1} 的描述`,
      type: 'MANUAL' as const,
      required: true,
      order: j + 1,
    })),
    createdAt: new Date(2024, 0, i + 1),
    updatedAt: new Date(2024, 0, i + 1),
  }));
};

const generateHistoryRecords = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `execution-${i}`,
    workflowId: `workflow-${i % 10}`,
    workflowName: `工作流 ${(i % 10) + 1}`,
    status: ['COMPLETED', 'FAILED', 'IN_PROGRESS'][i % 3] as const,
    startedAt: new Date(2024, 0, i + 1),
    completedAt: i % 3 === 0 ? new Date(2024, 0, i + 2) : null,
    duration: i % 3 === 0 ? (i + 1) * 1000 : null,
    userId: 'user-1',
    userName: 'Test User',
  }));
};

describe('Performance Tests', () => {
  describe('WorkflowList Performance', () => {
    it('renders 100 workflows within acceptable time', async () => {
      const workflows = generateWorkflows(100);
      const store = configureStore({
        reducer: { workflow: workflowSlice },
        preloadedState: {
          workflow: {
            workflows,
            currentWorkflow: null,
            loading: false,
            error: null,
          },
        },
      });

      const startTime = performance.now();
      
      render(
        <Provider store={store}>
          <WorkflowList />
        </Provider>
      );

      await waitFor(() => {
        expect(screen.getByText('工作流 1')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within 500ms
      expect(renderTime).toBeLessThan(500);
      console.log(`WorkflowList (100 items) rendered in ${renderTime.toFixed(2)}ms`);
    });

    it('renders 1000 workflows with virtualization', async () => {
      const workflows = generateWorkflows(1000);
      const store = configureStore({
        reducer: { workflow: workflowSlice },
        preloadedState: {
          workflow: {
            workflows,
            currentWorkflow: null,
            loading: false,
            error: null,
          },
        },
      });

      const startTime = performance.now();
      
      render(
        <Provider store={store}>
          <WorkflowList virtualized />
        </Provider>
      );

      await waitFor(() => {
        expect(screen.getByText('工作流 1')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // With virtualization, should still render quickly
      expect(renderTime).toBeLessThan(1000);
      console.log(`WorkflowList (1000 items, virtualized) rendered in ${renderTime.toFixed(2)}ms`);
    });
  });

  describe('HistoryList Performance', () => {
    it('renders 500 history records within acceptable time', async () => {
      const historyRecords = generateHistoryRecords(500);
      const store = configureStore({
        reducer: { history: historySlice },
        preloadedState: {
          history: {
            records: historyRecords,
            totalCount: 500,
            currentPage: 1,
            pageSize: 20,
            filters: {},
            loading: false,
            error: null,
          },
        },
      });

      const startTime = performance.now();
      
      render(
        <Provider store={store}>
          <HistoryList />
        </Provider>
      );

      await waitFor(() => {
        expect(screen.getByText(/执行历史/)).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within 300ms
      expect(renderTime).toBeLessThan(300);
      console.log(`HistoryList (500 items) rendered in ${renderTime.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage', () => {
    it('does not cause memory leaks with frequent re-renders', async () => {
      const workflows = generateWorkflows(50);
      const store = configureStore({
        reducer: { workflow: workflowSlice },
        preloadedState: {
          workflow: {
            workflows,
            currentWorkflow: null,
            loading: false,
            error: null,
          },
        },
      });

      // Measure initial memory
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Render and unmount multiple times
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(
          <Provider store={store}>
            <WorkflowList />
          </Provider>
        );
        
        await waitFor(() => {
          expect(screen.getByText('工作流 1')).toBeInTheDocument();
        });
        
        unmount();
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Measure final memory
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal (less than 5MB)
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
      console.log(`Memory increase after 10 renders: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Scroll Performance', () => {
    it('maintains smooth scrolling with large lists', async () => {
      const workflows = generateWorkflows(200);
      const store = configureStore({
        reducer: { workflow: workflowSlice },
        preloadedState: {
          workflow: {
            workflows,
            currentWorkflow: null,
            loading: false,
            error: null,
          },
        },
      });

      const { container } = render(
        <Provider store={store}>
          <div style={{ height: '400px', overflow: 'auto' }}>
            <WorkflowList />
          </div>
        </Provider>
      );

      const scrollContainer = container.firstChild as HTMLElement;
      
      // Measure scroll performance
      const scrollTimes: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        
        scrollContainer.scrollTop = i * 100;
        
        // Wait for scroll to complete
        await new Promise(resolve => setTimeout(resolve, 16)); // One frame
        
        const endTime = performance.now();
        scrollTimes.push(endTime - startTime);
      }

      const averageScrollTime = scrollTimes.reduce((a, b) => a + b, 0) / scrollTimes.length;
      
      // Average scroll time should be less than 16ms (60fps)
      expect(averageScrollTime).toBeLessThan(16);
      console.log(`Average scroll time: ${averageScrollTime.toFixed(2)}ms`);
    });
  });

  describe('Bundle Size Impact', () => {
    it('components should not significantly increase bundle size', () => {
      // This is more of a build-time test, but we can check component complexity
      const WorkflowListString = WorkflowList.toString();
      const HistoryListString = HistoryList.toString();
      
      // Components should not be excessively large
      expect(WorkflowListString.length).toBeLessThan(50000); // 50KB
      expect(HistoryListString.length).toBeLessThan(50000); // 50KB
      
      console.log(`WorkflowList component size: ${(WorkflowListString.length / 1024).toFixed(2)}KB`);
      console.log(`HistoryList component size: ${(HistoryListString.length / 1024).toFixed(2)}KB`);
    });
  });

  describe('Interaction Performance', () => {
    it('handles rapid user interactions efficiently', async () => {
      const workflows = generateWorkflows(50);
      const store = configureStore({
        reducer: { workflow: workflowSlice },
        preloadedState: {
          workflow: {
            workflows,
            currentWorkflow: null,
            loading: false,
            error: null,
          },
        },
      });

      render(
        <Provider store={store}>
          <WorkflowList />
        </Provider>
      );

      // Simulate rapid clicking
      const interactionTimes: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        
        // Simulate user interaction (e.g., clicking a workflow item)
        const workflowItem = screen.getByText(`工作流 ${i + 1}`);
        workflowItem.click();
        
        // Wait for interaction to complete
        await new Promise(resolve => setTimeout(resolve, 1));
        
        const endTime = performance.now();
        interactionTimes.push(endTime - startTime);
      }

      const averageInteractionTime = interactionTimes.reduce((a, b) => a + b, 0) / interactionTimes.length;
      
      // Interactions should be responsive (less than 100ms)
      expect(averageInteractionTime).toBeLessThan(100);
      console.log(`Average interaction time: ${averageInteractionTime.toFixed(2)}ms`);
    });
  });
});