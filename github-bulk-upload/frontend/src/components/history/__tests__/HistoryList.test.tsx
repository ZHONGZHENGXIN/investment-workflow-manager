import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { render, userInteraction, assertions, createMockExecution, createMockWorkflow, mockApiResponse, mockApiError } from '../../../test/utils';
import HistoryList from '../HistoryList';
import * as historyService from '../../../services/history';

// Mock history service
jest.mock('../../../services/history');
const mockHistoryService = historyService as jest.Mocked<typeof historyService>;

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

describe('HistoryList', () => {
  const mockExecutions = [
    createMockExecution({
      id: 'exec-1',
      workflowId: 'workflow-1',
      status: 'COMPLETED',
      startedAt: '2023-12-01T10:00:00Z',
      completedAt: '2023-12-01T12:00:00Z',
      workflow: createMockWorkflow({ name: '投资决策流程' })
    }),
    createMockExecution({
      id: 'exec-2',
      workflowId: 'workflow-2',
      status: 'IN_PROGRESS',
      startedAt: '2023-12-02T09:00:00Z',
      workflow: createMockWorkflow({ name: '风险评估流程' })
    }),
    createMockExecution({
      id: 'exec-3',
      workflowId: 'workflow-1',
      status: 'FAILED',
      startedAt: '2023-12-03T14:00:00Z',
      workflow: createMockWorkflow({ name: '投资决策流程' })
    })
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockHistoryService.getExecutionHistory.mockResolvedValue(mockApiResponse({
      data: mockExecutions,
      pagination: {
        page: 1,
        limit: 10,
        total: 3,
        totalPages: 1
      }
    }));
  });

  describe('Rendering', () => {
    it('renders execution history correctly', async () => {
      render(<HistoryList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
        expect(screen.getByText('风险评估流程')).toBeInTheDocument();
      });
      
      // 检查状态显示
      expect(screen.getByText(/已完成/i)).toBeInTheDocument();
      expect(screen.getByText(/进行中/i)).toBeInTheDocument();
      expect(screen.getByText(/失败/i)).toBeInTheDocument();
    });

    it('shows loading state initially', () => {
      mockHistoryService.getExecutionHistory.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockApiResponse({})), 1000))
      );
      
      render(<HistoryList />);
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText(/加载历史记录/i)).toBeInTheDocument();
    });

    it('shows empty state when no history', async () => {
      mockHistoryService.getExecutionHistory.mockResolvedValue(mockApiResponse({
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0
        }
      }));
      
      render(<HistoryList />);
      
      await waitFor(() => {
        expect(screen.getByText(/暂无执行记录/i)).toBeInTheDocument();
        expect(screen.getByText(/开始第一个工作流/i)).toBeInTheDocument();
      });
    });

    it('displays execution details correctly', async () => {
      render(<HistoryList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      // 检查执行时间
      expect(screen.getByText(/2023-12-01/i)).toBeInTheDocument();
      expect(screen.getByText(/2小时/i)).toBeInTheDocument(); // 执行时长
      
      // 检查执行人信息
      expect(screen.getByText(/Test User/i)).toBeInTheDocument();
    });

    it('shows status badges with correct colors', async () => {
      render(<HistoryList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      const completedBadge = screen.getByTestId('status-badge-COMPLETED');
      const inProgressBadge = screen.getByTestId('status-badge-IN_PROGRESS');
      const failedBadge = screen.getByTestId('status-badge-FAILED');
      
      expect(completedBadge).toHaveClass('status-success');
      expect(inProgressBadge).toHaveClass('status-warning');
      expect(failedBadge).toHaveClass('status-error');
    });
  });

  describe('Filtering and Search', () => {
    it('filters by execution status', async () => {
      render(<HistoryList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      await userInteraction.selectOption(/状态筛选/i, 'COMPLETED');
      
      await waitFor(() => {
        expect(mockHistoryService.getExecutionHistory).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'COMPLETED'
          })
        );
      });
    });

    it('filters by workflow', async () => {
      render(<HistoryList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      await userInteraction.selectOption(/工作流筛选/i, 'workflow-1');
      
      await waitFor(() => {
        expect(mockHistoryService.getExecutionHistory).toHaveBeenCalledWith(
          expect.objectContaining({
            workflowId: 'workflow-1'
          })
        );
      });
    });

    it('filters by date range', async () => {
      render(<HistoryList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      const startDateInput = screen.getByLabelText(/开始日期/i);
      const endDateInput = screen.getByLabelText(/结束日期/i);
      
      await userInteraction.fillInput(startDateInput, '2023-12-01');
      await userInteraction.fillInput(endDateInput, '2023-12-31');
      
      await waitFor(() => {
        expect(mockHistoryService.getExecutionHistory).toHaveBeenCalledWith(
          expect.objectContaining({
            startDate: '2023-12-01',
            endDate: '2023-12-31'
          })
        );
      });
    });

    it('searches by execution ID or workflow name', async () => {
      render(<HistoryList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      await userInteraction.fillInput(/搜索执行记录/i, '投资');
      
      await waitFor(() => {
        expect(mockHistoryService.getExecutionHistory).toHaveBeenCalledWith(
          expect.objectContaining({
            search: '投资'
          })
        );
      });
    });

    it('clears all filters', async () => {
      render(<HistoryList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      // 设置筛选条件
      await userInteraction.selectOption(/状态筛选/i, 'COMPLETED');
      await userInteraction.fillInput(/搜索执行记录/i, '投资');
      
      // 清除筛选
      await userInteraction.clickButton(/清除筛选/i);
      
      await waitFor(() => {
        expect(mockHistoryService.getExecutionHistory).toHaveBeenCalledWith(
          expect.objectContaining({
            status: '',
            search: '',
            workflowId: '',
            startDate: '',
            endDate: ''
          })
        );
      });
    });

    it('shows active filter count', async () => {
      render(<HistoryList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      await userInteraction.selectOption(/状态筛选/i, 'COMPLETED');
      await userInteraction.fillInput(/搜索执行记录/i, '投资');
      
      expect(screen.getByText(/已应用 2 个筛选条件/i)).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('sorts by execution time', async () => {
      render(<HistoryList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      await userInteraction.selectOption(/排序方式/i, 'startedAt');
      
      await waitFor(() => {
        expect(mockHistoryService.getExecutionHistory).toHaveBeenCalledWith(
          expect.objectContaining({
            sortBy: 'startedAt',
            sortOrder: 'desc'
          })
        );
      });
    });

    it('sorts by workflow name', async () => {
      render(<HistoryList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      await userInteraction.selectOption(/排序方式/i, 'workflowName');
      
      await waitFor(() => {
        expect(mockHistoryService.getExecutionHistory).toHaveBeenCalledWith(
          expect.objectContaining({
            sortBy: 'workflowName',
            sortOrder: 'asc'
          })
        );
      });
    });

    it('toggles sort order', async () => {
      render(<HistoryList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      const sortButton = screen.getByLabelText(/切换排序顺序/i);
      await userInteraction.clickButton(sortButton);
      
      await waitFor(() => {
        expect(mockHistoryService.getExecutionHistory).toHaveBeenCalledWith(
          expect.objectContaining({
            sortOrder: 'asc'
          })
        );
      });
    });
  });

  describe('User Interactions', () => {
    it('navigates to execution detail', async () => {
      render(<HistoryList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      const executionRow = screen.getByTestId('execution-row-exec-1');
      await userInteraction.clickButton(executionRow);
      
      expect(mockNavigate).toHaveBeenCalledWith('/executions/exec-1');
    });

    it('shows execution actions menu', async () => {
      render(<HistoryList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      const menuButtons = screen.getAllByLabelText(/更多操作/i);
      await userInteraction.clickButton(menuButtons[0]);
      
      expect(screen.getByText(/查看详情/i)).toBeInTheDocument();
      expect(screen.getByText(/导出报告/i)).toBeInTheDocument();
      expect(screen.getByText(/复制链接/i)).toBeInTheDocument();
    });

    it('exports execution report', async () => {
      mockHistoryService.exportExecutionReport.mockResolvedValue(mockApiResponse({
        downloadUrl: 'https://example.com/report.pdf'
      }));
      
      render(<HistoryList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      const menuButtons = screen.getAllByLabelText(/更多操作/i);
      await userInteraction.clickButton(menuButtons[0]);
      
      await userInteraction.clickButton(/导出报告/i);
      
      await waitFor(() => {
        expect(mockHistoryService.exportExecutionReport).toHaveBeenCalledWith('exec-1');
      });
      
      await assertions.expectSuccessMessage(/报告导出成功/i);
    });

    it('copies execution link', async () => {
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockResolvedValue(undefined)
        }
      });
      
      render(<HistoryList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      const menuButtons = screen.getAllByLabelText(/更多操作/i);
      await userInteraction.clickButton(menuButtons[0]);
      
      await userInteraction.clickButton(/复制链接/i);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('/executions/exec-1')
      );
      
      await assertions.expectSuccessMessage(/链接已复制/i);
    });

    it('restarts failed execution', async () => {
      mockHistoryService.restartExecution.mockResolvedValue(mockApiResponse({
        id: 'exec-4'
      }));
      
      render(<HistoryList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      // 找到失败的执行记录
      const failedRow = screen.getByTestId('execution-row-exec-3');
      const menuButton = failedRow.querySelector('[aria-label*="更多操作"]');
      await userInteraction.clickButton(menuButton);
      
      await userInteraction.clickButton(/重新执行/i);
      
      // 确认重新执行
      expect(screen.getByText(/确认重新执行/i)).toBeInTheDocument();
      await userInteraction.clickButton(/确认/i);
      
      await waitFor(() => {
        expect(mockHistoryService.restartExecution).toHaveBeenCalledWith('exec-3');
      });
      
      expect(mockNavigate).toHaveBeenCalledWith('/executions/exec-4');
    });
  });

  describe('Bulk Operations', () => {
    it('selects multiple executions', async () => {
      render(<HistoryList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      const checkboxes = screen.getAllByRole('checkbox');
      await userInteraction.clickButton(checkboxes[1]); // 第一个执行记录
      await userInteraction.clickButton(checkboxes[2]); // 第二个执行记录
      
      expect(screen.getByText(/已选择 2 项/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /批量导出/i })).toBeInTheDocument();
    });

    it('selects all executions', async () => {
      render(<HistoryList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      const selectAllCheckbox = screen.getByLabelText(/全选/i);
      await userInteraction.clickButton(selectAllCheckbox);
      
      expect(screen.getByText(/已选择 3 项/i)).toBeInTheDocument();
    });

    it('bulk exports selected executions', async () => {
      mockHistoryService.bulkExportExecutions.mockResolvedValue(mockApiResponse({
        downloadUrl: 'https://example.com/bulk-report.zip'
      }));
      
      render(<HistoryList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      // 选择多个执行记录
      const checkboxes = screen.getAllByRole('checkbox');
      await userInteraction.clickButton(checkboxes[1]);
      await userInteraction.clickButton(checkboxes[2]);
      
      await userInteraction.clickButton(/批量导出/i);
      
      await waitFor(() => {
        expect(mockHistoryService.bulkExportExecutions).toHaveBeenCalledWith(['exec-1', 'exec-2']);
      });
      
      await assertions.expectSuccessMessage(/批量导出成功/i);
    });

    it('clears selection', async () => {
      render(<HistoryList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      // 选择执行记录
      const checkboxes = screen.getAllByRole('checkbox');
      await userInteraction.clickButton(checkboxes[1]);
      
      // 清除选择
      await userInteraction.clickButton(/清除选择/i);
      
      expect(screen.queryByText(/已选择/i)).not.toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      mockHistoryService.getExecutionHistory.mockResolvedValue(mockApiResponse({
        data: mockExecutions,
        pagination: {
          page: 1,
          limit: 10,
          total: 50,
          totalPages: 5
        }
      }));
    });

    it('handles pagination navigation', async () => {
      render(<HistoryList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      const nextButton = screen.getByLabelText(/下一页/i);
      await userInteraction.clickButton(nextButton);
      
      await waitFor(() => {
        expect(mockHistoryService.getExecutionHistory).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 2
          })
        );
      });
    });

    it('shows pagination info', async () => {
      render(<HistoryList />);
      
      await waitFor(() => {
        expect(screen.getByText(/共 50 条记录/i)).toBeInTheDocument();
        expect(screen.getByText(/第 1 页，共 5 页/i)).toBeInTheDocument();
      });
    });

    it('changes page size', async () => {
      render(<HistoryList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      await userInteraction.selectOption(/每页显示/i, '25');
      
      await waitFor(() => {
        expect(mockHistoryService.getExecutionHistory).toHaveBeenCalledWith(
          expect.objectContaining({
            limit: 25,
            page: 1
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('handles loading error', async () => {
      mockHistoryService.getExecutionHistory.mockRejectedValue(mockApiError('网络错误'));
      
      render(<HistoryList />);
      
      await assertions.expectValidationError(/加载失败/i);
      expect(screen.getByRole('button', { name: /重试/i })).toBeInTheDocument();
    });

    it('retries loading on error', async () => {
      mockHistoryService.getExecutionHistory
        .mockRejectedValueOnce(mockApiError('网络错误'))
        .mockResolvedValueOnce(mockApiResponse({
          data: mockExecutions,
          pagination: {
            page: 1,
            limit: 10,
            total: 3,
            totalPages: 1
          }
        }));
      
      render(<HistoryList />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /重试/i })).toBeInTheDocument();
      });
      
      await userInteraction.clickButton(/重试/i);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
    });

    it('handles export error', async () => {
      mockHistoryService.exportExecutionReport.mockRejectedValue(mockApiError('导出失败'));
      
      render(<HistoryList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      const menuButtons = screen.getAllByLabelText(/更多操作/i);
      await userInteraction.clickButton(menuButtons[0]);
      
      await userInteraction.clickButton(/导出报告/i);
      
      await assertions.expectValidationError(/导出失败/i);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', async () => {
      render(<HistoryList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      expect(screen.getByRole('main')).toHaveAttribute('aria-label', '执行历史列表');
      expect(screen.getByRole('table')).toHaveAttribute('aria-label', '执行记录表格');
      
      const rows = screen.getAllByRole('row');
      rows.slice(1).forEach((row, index) => { // 跳过表头
        expect(row).toHaveAttribute('aria-label', expect.stringContaining('执行记录'));
      });
    });

    it('supports keyboard navigation', async () => {
      render(<HistoryList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      const firstRow = screen.getByTestId('execution-row-exec-1');
      firstRow.focus();
      expect(document.activeElement).toBe(firstRow);
      
      // 使用方向键导航
      fireEvent.keyDown(firstRow, { key: 'ArrowDown' });
      const secondRow = screen.getByTestId('execution-row-exec-2');
      expect(document.activeElement).toBe(secondRow);
    });

    it('announces filter changes to screen readers', async () => {
      render(<HistoryList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      const statusElement = screen.getByRole('status');
      expect(statusElement).toHaveAttribute('aria-live', 'polite');
      
      await userInteraction.selectOption(/状态筛选/i, 'COMPLETED');
      
      expect(statusElement).toHaveTextContent(/筛选条件已更新/i);
    });
  });

  describe('Performance', () => {
    it('virtualizes large lists', async () => {
      const manyExecutions = Array.from({ length: 100 }, (_, i) => 
        createMockExecution({ id: `exec-${i + 1}` })
      );
      
      mockHistoryService.getExecutionHistory.mockResolvedValue(mockApiResponse({
        data: manyExecutions,
        pagination: {
          page: 1,
          limit: 100,
          total: 100,
          totalPages: 1
        }
      }));
      
      render(<HistoryList />);
      
      await waitFor(() => {
        expect(screen.getByTestId('execution-row-exec-1')).toBeInTheDocument();
      });
      
      // 检查是否使用了虚拟化
      expect(screen.getByTestId('virtual-table')).toBeInTheDocument();
    });

    it('debounces search input', async () => {
      render(<HistoryList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByLabelText(/搜索执行记录/i);
      
      // 快速输入多个字符
      fireEvent.change(searchInput, { target: { value: '投' } });
      fireEvent.change(searchInput, { target: { value: '投资' } });
      fireEvent.change(searchInput, { target: { value: '投资决策' } });
      
      // 应该只调用一次（防抖）
      await waitFor(() => {
        expect(mockHistoryService.getExecutionHistory).toHaveBeenCalledTimes(2); // 初始加载 + 搜索
      }, { timeout: 1000 });
    });
  });
});