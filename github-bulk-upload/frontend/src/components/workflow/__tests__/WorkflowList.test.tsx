import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { render, userInteraction, assertions, createMockWorkflow, mockApiResponse, mockApiError } from '../../../test/utils';
import WorkflowList from '../WorkflowList';
import * as workflowService from '../../../services/workflow';

// Mock workflow service
jest.mock('../../../services/workflow');
const mockWorkflowService = workflowService as jest.Mocked<typeof workflowService>;

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

describe('WorkflowList', () => {
  const mockWorkflows = [
    createMockWorkflow({ id: '1', name: '投资决策流程', category: 'investment' }),
    createMockWorkflow({ id: '2', name: '风险评估流程', category: 'risk' }),
    createMockWorkflow({ id: '3', name: '项目审批流程', category: 'approval' })
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockWorkflowService.getWorkflows.mockResolvedValue(mockApiResponse({
      data: mockWorkflows,
      pagination: {
        page: 1,
        limit: 10,
        total: 3,
        totalPages: 1
      }
    }));
  });

  describe('Rendering', () => {
    it('renders workflow list correctly', async () => {
      render(<WorkflowList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
        expect(screen.getByText('风险评估流程')).toBeInTheDocument();
        expect(screen.getByText('项目审批流程')).toBeInTheDocument();
      });
    });

    it('shows loading state initially', () => {
      mockWorkflowService.getWorkflows.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockApiResponse({})), 1000))
      );
      
      render(<WorkflowList />);
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText(/加载中/i)).toBeInTheDocument();
    });

    it('shows empty state when no workflows', async () => {
      mockWorkflowService.getWorkflows.mockResolvedValue(mockApiResponse({
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0
        }
      }));
      
      render(<WorkflowList />);
      
      await waitFor(() => {
        expect(screen.getByText(/暂无工作流/i)).toBeInTheDocument();
        expect(screen.getByText(/创建第一个工作流/i)).toBeInTheDocument();
      });
    });

    it('shows error state on fetch failure', async () => {
      mockWorkflowService.getWorkflows.mockRejectedValue(mockApiError('网络错误'));
      
      render(<WorkflowList />);
      
      await assertions.expectValidationError(/加载失败/i);
      expect(screen.getByRole('button', { name: /重试/i })).toBeInTheDocument();
    });

    it('displays workflow cards with correct information', async () => {
      render(<WorkflowList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });

      // 检查工作流卡片信息
      expect(screen.getByText(/投资/i)).toBeInTheDocument(); // 分类
      expect(screen.getByText(/个步骤/i)).toBeInTheDocument(); // 步骤数量
      expect(screen.getByText(/创建时间/i)).toBeInTheDocument(); // 创建时间
    });
  });

  describe('Error Handling', () => {
    it('retries loading on error', async () => {
      mockWorkflowService.getWorkflows
        .mockRejectedValueOnce(mockApiError('网络错误'))
        .mockResolvedValueOnce(mockApiResponse({
          data: mockWorkflows,
          pagination: {
            page: 1,
            limit: 10,
            total: 3,
            totalPages: 1
          }
        }));
      
      render(<WorkflowList />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /重试/i })).toBeInTheDocument();
      });
      
      await userInteraction.clickButton(/重试/i);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
    });

    it('handles network timeout', async () => {
      mockWorkflowService.getWorkflows.mockRejectedValue(new Error('timeout'));
      
      render(<WorkflowList />);
      
      await assertions.expectValidationError(/网络超时/i);
    });

    it('handles server error', async () => {
      mockWorkflowService.getWorkflows.mockRejectedValue(mockApiError('服务器错误', 500));
      
      render(<WorkflowList />);
      
      await assertions.expectValidationError(/服务器错误/i);
    });
  });

  describe('Search and Filtering', () => {
    it('filters workflows by search term', async () => {
      render(<WorkflowList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      await userInteraction.fillInput(/搜索工作流/i, '投资');
      
      await waitFor(() => {
        expect(mockWorkflowService.getWorkflows).toHaveBeenCalledWith(
          expect.objectContaining({
            search: '投资'
          })
        );
      });
    });

    it('filters workflows by category', async () => {
      render(<WorkflowList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      await userInteraction.selectOption(/分类/i, 'investment');
      
      await waitFor(() => {
        expect(mockWorkflowService.getWorkflows).toHaveBeenCalledWith(
          expect.objectContaining({
            category: 'investment'
          })
        );
      });
    });

    it('filters workflows by status', async () => {
      render(<WorkflowList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      await userInteraction.selectOption(/状态/i, 'active');
      
      await waitFor(() => {
        expect(mockWorkflowService.getWorkflows).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'active'
          })
        );
      });
    });

    it('sorts workflows by different criteria', async () => {
      render(<WorkflowList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      await userInteraction.selectOption(/排序/i, 'name');
      
      await waitFor(() => {
        expect(mockWorkflowService.getWorkflows).toHaveBeenCalledWith(
          expect.objectContaining({
            sortBy: 'name',
            sortOrder: 'asc'
          })
        );
      });
    });

    it('clears search filters', async () => {
      render(<WorkflowList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      // 设置搜索条件
      await userInteraction.fillInput(/搜索工作流/i, '投资');
      await userInteraction.selectOption(/分类/i, 'investment');
      
      // 清除筛选
      await userInteraction.clickButton(/清除筛选/i);
      
      await waitFor(() => {
        expect(mockWorkflowService.getWorkflows).toHaveBeenCalledWith(
          expect.objectContaining({
            search: '',
            category: '',
            status: ''
          })
        );
      });
    });

    it('debounces search input', async () => {
      render(<WorkflowList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByLabelText(/搜索工作流/i);
      
      // 快速输入多个字符
      fireEvent.change(searchInput, { target: { value: '投' } });
      fireEvent.change(searchInput, { target: { value: '投资' } });
      fireEvent.change(searchInput, { target: { value: '投资决策' } });
      
      // 应该只调用一次（防抖）
      await waitFor(() => {
        expect(mockWorkflowService.getWorkflows).toHaveBeenCalledTimes(2); // 初始加载 + 搜索
      }, { timeout: 1000 });
    });
  });

  describe('User Interactions', () => {
    it('navigates to workflow detail on click', async () => {
      render(<WorkflowList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      const workflowCard = screen.getByText('投资决策流程').closest('a');
      expect(workflowCard).toHaveAttribute('href', '/workflows/1');
    });

    it('shows workflow actions menu', async () => {
      render(<WorkflowList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      const menuButtons = screen.getAllByLabelText(/更多操作/i);
      await userInteraction.clickButton(menuButtons[0]);
      
      expect(screen.getByText(/编辑/i)).toBeInTheDocument();
      expect(screen.getByText(/复制/i)).toBeInTheDocument();
      expect(screen.getByText(/删除/i)).toBeInTheDocument();
      expect(screen.getByText(/导出/i)).toBeInTheDocument();
    });

    it('edits workflow', async () => {
      render(<WorkflowList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      const menuButtons = screen.getAllByLabelText(/更多操作/i);
      await userInteraction.clickButton(menuButtons[0]);
      
      const editButton = screen.getByText(/编辑/i);
      expect(editButton.closest('a')).toHaveAttribute('href', '/workflows/1/edit');
    });

    it('copies workflow', async () => {
      mockWorkflowService.copyWorkflow.mockResolvedValue(mockApiResponse(
        createMockWorkflow({ id: '4', name: '投资决策流程 (副本)' })
      ));
      
      render(<WorkflowList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      const menuButtons = screen.getAllByLabelText(/更多操作/i);
      await userInteraction.clickButton(menuButtons[0]);
      
      await userInteraction.clickButton(/复制/i);
      
      await waitFor(() => {
        expect(mockWorkflowService.copyWorkflow).toHaveBeenCalledWith('1');
      });
      
      await assertions.expectSuccessMessage(/复制成功/i);
    });

    it('deletes workflow with confirmation', async () => {
      mockWorkflowService.deleteWorkflow.mockResolvedValue(mockApiResponse({}));
      
      render(<WorkflowList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      const menuButtons = screen.getAllByLabelText(/更多操作/i);
      await userInteraction.clickButton(menuButtons[0]);
      
      await userInteraction.clickButton(/删除/i);
      
      // 确认删除对话框
      expect(screen.getByText(/确认删除工作流/i)).toBeInTheDocument();
      expect(screen.getByText(/此操作不可撤销/i)).toBeInTheDocument();
      
      await userInteraction.clickButton(/确认删除/i);
      
      await waitFor(() => {
        expect(mockWorkflowService.deleteWorkflow).toHaveBeenCalledWith('1');
      });
      
      await assertions.expectSuccessMessage(/删除成功/i);
    });

    it('cancels workflow deletion', async () => {
      render(<WorkflowList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      const menuButtons = screen.getAllByLabelText(/更多操作/i);
      await userInteraction.clickButton(menuButtons[0]);
      
      await userInteraction.clickButton(/删除/i);
      
      // 取消删除
      await userInteraction.clickButton(/取消/i);
      
      expect(mockWorkflowService.deleteWorkflow).not.toHaveBeenCalled();
      expect(screen.queryByText(/确认删除工作流/i)).not.toBeInTheDocument();
    });

    it('creates new workflow', async () => {
      render(<WorkflowList />);
      
      const createButton = screen.getByRole('button', { name: /创建工作流/i });
      expect(createButton.closest('a')).toHaveAttribute('href', '/workflows/new');
    });

    it('imports workflow', async () => {
      render(<WorkflowList />);
      
      const importButton = screen.getByRole('button', { name: /导入工作流/i });
      await userInteraction.clickButton(importButton);
      
      expect(screen.getByText(/选择工作流文件/i)).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      mockWorkflowService.getWorkflows.mockResolvedValue(mockApiResponse({
        data: mockWorkflows,
        pagination: {
          page: 1,
          limit: 2,
          total: 10,
          totalPages: 5
        }
      }));
    });

    it('handles pagination navigation', async () => {
      render(<WorkflowList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      // 下一页
      const nextButton = screen.getByLabelText(/下一页/i);
      await userInteraction.clickButton(nextButton);
      
      await waitFor(() => {
        expect(mockWorkflowService.getWorkflows).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 2
          })
        );
      });
    });

    it('shows pagination info', async () => {
      render(<WorkflowList />);
      
      await waitFor(() => {
        expect(screen.getByText(/共 10 条记录/i)).toBeInTheDocument();
        expect(screen.getByText(/第 1 页，共 5 页/i)).toBeInTheDocument();
      });
    });

    it('changes page size', async () => {
      render(<WorkflowList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      await userInteraction.selectOption(/每页显示/i, '20');
      
      await waitFor(() => {
        expect(mockWorkflowService.getWorkflows).toHaveBeenCalledWith(
          expect.objectContaining({
            limit: 20,
            page: 1
          })
        );
      });
    });

    it('jumps to specific page', async () => {
      render(<WorkflowList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      const pageInput = screen.getByLabelText(/跳转到页/i);
      await userInteraction.fillInput(pageInput, '3');
      
      fireEvent.keyDown(pageInput, { key: 'Enter', code: 'Enter' });
      
      await waitFor(() => {
        expect(mockWorkflowService.getWorkflows).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 3
          })
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', async () => {
      render(<WorkflowList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      expect(screen.getByRole('main')).toHaveAttribute('aria-label', '工作流列表');
      expect(screen.getByRole('searchbox')).toHaveAttribute('aria-label', '搜索工作流');
      
      const workflowCards = screen.getAllByRole('article');
      workflowCards.forEach(card => {
        expect(card).toHaveAttribute('aria-label');
      });
    });

    it('supports keyboard navigation', async () => {
      render(<WorkflowList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByRole('searchbox');
      searchInput.focus();
      expect(document.activeElement).toBe(searchInput);
      
      // Tab 导航到第一个工作流卡片
      fireEvent.keyDown(searchInput, { key: 'Tab' });
      const firstCard = screen.getAllByRole('link')[0];
      expect(document.activeElement).toBe(firstCard);
    });

    it('announces loading states to screen readers', () => {
      mockWorkflowService.getWorkflows.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockApiResponse({})), 1000))
      );
      
      render(<WorkflowList />);
      
      const loadingElement = screen.getByRole('status');
      expect(loadingElement).toHaveAttribute('aria-live', 'polite');
      expect(loadingElement).toHaveTextContent(/加载中/i);
    });
  });

  describe('Performance', () => {
    it('virtualizes large lists', async () => {
      const manyWorkflows = Array.from({ length: 100 }, (_, i) => 
        createMockWorkflow({ id: `${i + 1}`, name: `工作流 ${i + 1}` })
      );
      
      mockWorkflowService.getWorkflows.mockResolvedValue(mockApiResponse({
        data: manyWorkflows,
        pagination: {
          page: 1,
          limit: 100,
          total: 100,
          totalPages: 1
        }
      }));
      
      render(<WorkflowList />);
      
      await waitFor(() => {
        expect(screen.getByText('工作流 1')).toBeInTheDocument();
      });
      
      // 检查是否使用了虚拟化
      expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
    });

    it('memoizes workflow cards', async () => {
      const { rerender } = render(<WorkflowList />);
      
      await waitFor(() => {
        expect(screen.getByText('投资决策流程')).toBeInTheDocument();
      });
      
      // 重新渲染不应该重新创建卡片
      rerender(<WorkflowList />);
      
      // 验证卡片没有重新渲染（通过检查 key 或其他标识）
      expect(screen.getByTestId('workflow-card-1')).toBeInTheDocument();
    });
  });
})