import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { render, userInteraction, assertions, createMockExecution, mockApiResponse, mockApiError } from '../../../test/utils';
import ReviewEditor from '../ReviewEditor';
import * as reviewService from '../../../services/review';

// Mock review service
jest.mock('../../../services/review');
const mockReviewService = reviewService as jest.Mocked<typeof reviewService>;

// Mock rich text editor
jest.mock('@tinymce/tinymce-react', () => ({
  Editor: ({ onEditorChange, value, ...props }: any) => (
    <textarea
      data-testid="rich-text-editor"
      value={value}
      onChange={(e) => onEditorChange(e.target.value)}
      {...props}
    />
  )
}));

describe('ReviewEditor', () => {
  const mockExecution = createMockExecution({
    id: 'execution-1',
    status: 'COMPLETED',
    completedAt: '2023-12-01T12:00:00Z'
  });

  const mockReview = {
    id: 'review-1',
    executionId: 'execution-1',
    content: '这是一个测试复盘内容',
    rating: 4,
    tags: ['成功', '高效'],
    improvements: ['可以优化流程步骤'],
    lessons: ['团队协作很重要'],
    createdAt: '2023-12-01T13:00:00Z',
    updatedAt: '2023-12-01T13:00:00Z'
  };

  const defaultProps = {
    execution: mockExecution,
    onSave: jest.fn(),
    onCancel: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders new review editor correctly', () => {
      render(<ReviewEditor {...defaultProps} />);
      
      expect(screen.getByText(/创建复盘报告/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/复盘内容/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/整体评分/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/标签/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/改进建议/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/经验教训/i)).toBeInTheDocument();
    });

    it('renders existing review for editing', () => {
      render(<ReviewEditor {...defaultProps} review={mockReview} />);
      
      expect(screen.getByText(/编辑复盘报告/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('这是一个测试复盘内容')).toBeInTheDocument();
      expect(screen.getByDisplayValue('4')).toBeInTheDocument();
    });

    it('shows execution information', () => {
      render(<ReviewEditor {...defaultProps} />);
      
      expect(screen.getByText(/执行信息/i)).toBeInTheDocument();
      expect(screen.getByText(/执行ID: execution-1/i)).toBeInTheDocument();
      expect(screen.getByText(/完成时间/i)).toBeInTheDocument();
    });

    it('displays rating stars correctly', () => {
      render(<ReviewEditor {...defaultProps} review={mockReview} />);
      
      const stars = screen.getAllByTestId(/star-/);
      expect(stars).toHaveLength(5);
      
      // 前4个星应该是填充的
      expect(stars[0]).toHaveClass('star-filled');
      expect(stars[1]).toHaveClass('star-filled');
      expect(stars[2]).toHaveClass('star-filled');
      expect(stars[3]).toHaveClass('star-filled');
      expect(stars[4]).toHaveClass('star-empty');
    });
  });

  describe('Form Interactions', () => {
    it('updates content in rich text editor', async () => {
      render(<ReviewEditor {...defaultProps} />);
      
      const editor = screen.getByTestId('rich-text-editor');
      await userInteraction.fillInput(editor, '这是新的复盘内容');
      
      expect(editor).toHaveValue('这是新的复盘内容');
    });

    it('updates rating by clicking stars', async () => {
      render(<ReviewEditor {...defaultProps} />);
      
      const thirdStar = screen.getByTestId('star-2'); // 0-indexed
      await userInteraction.clickButton(thirdStar);
      
      expect(screen.getByDisplayValue('3')).toBeInTheDocument();
      
      // 前3个星应该是填充的
      const stars = screen.getAllByTestId(/star-/);
      expect(stars[0]).toHaveClass('star-filled');
      expect(stars[1]).toHaveClass('star-filled');
      expect(stars[2]).toHaveClass('star-filled');
      expect(stars[3]).toHaveClass('star-empty');
      expect(stars[4]).toHaveClass('star-empty');
    });

    it('adds and removes tags', async () => {
      render(<ReviewEditor {...defaultProps} />);
      
      const tagInput = screen.getByLabelText(/添加标签/i);
      await userInteraction.fillInput(tagInput, '高效');
      
      fireEvent.keyDown(tagInput, { key: 'Enter', code: 'Enter' });
      
      expect(screen.getByText('高效')).toBeInTheDocument();
      expect(screen.getByLabelText(/删除标签 高效/i)).toBeInTheDocument();
      
      // 删除标签
      await userInteraction.clickButton(/删除标签 高效/i);
      expect(screen.queryByText('高效')).not.toBeInTheDocument();
    });

    it('adds multiple improvement suggestions', async () => {
      render(<ReviewEditor {...defaultProps} />);
      
      const addButton = screen.getByRole('button', { name: /添加改进建议/i });
      await userInteraction.clickButton(addButton);
      
      const improvementInputs = screen.getAllByLabelText(/改进建议/i);
      expect(improvementInputs).toHaveLength(2); // 默认1个 + 新增1个
      
      await userInteraction.fillInput(improvementInputs[0], '优化流程步骤');
      await userInteraction.fillInput(improvementInputs[1], '加强团队沟通');
      
      expect(improvementInputs[0]).toHaveValue('优化流程步骤');
      expect(improvementInputs[1]).toHaveValue('加强团队沟通');
    });

    it('removes improvement suggestions', async () => {
      render(<ReviewEditor {...defaultProps} />);
      
      // 添加一个改进建议
      const addButton = screen.getByRole('button', { name: /添加改进建议/i });
      await userInteraction.clickButton(addButton);
      
      const removeButtons = screen.getAllByLabelText(/删除改进建议/i);
      await userInteraction.clickButton(removeButtons[0]);
      
      const improvementInputs = screen.getAllByLabelText(/改进建议/i);
      expect(improvementInputs).toHaveLength(1);
    });

    it('adds and removes lessons learned', async () => {
      render(<ReviewEditor {...defaultProps} />);
      
      const addButton = screen.getByRole('button', { name: /添加经验教训/i });
      await userInteraction.clickButton(addButton);
      
      const lessonInputs = screen.getAllByLabelText(/经验教训/i);
      expect(lessonInputs).toHaveLength(2);
      
      await userInteraction.fillInput(lessonInputs[0], '团队协作很重要');
      
      // 删除经验教训
      const removeButtons = screen.getAllByLabelText(/删除经验教训/i);
      await userInteraction.clickButton(removeButtons[0]);
      
      const updatedLessonInputs = screen.getAllByLabelText(/经验教训/i);
      expect(updatedLessonInputs).toHaveLength(1);
    });
  });

  describe('Form Validation', () => {
    it('validates required fields', async () => {
      render(<ReviewEditor {...defaultProps} />);
      
      await userInteraction.clickButton(/保存复盘/i);
      
      await assertions.expectValidationError(/请填写复盘内容/i);
      await assertions.expectValidationError(/请选择评分/i);
    });

    it('validates minimum content length', async () => {
      render(<ReviewEditor {...defaultProps} />);
      
      const editor = screen.getByTestId('rich-text-editor');
      await userInteraction.fillInput(editor, '太短');
      
      await userInteraction.clickButton(/保存复盘/i);
      
      await assertions.expectValidationError(/复盘内容至少需要10个字符/i);
    });

    it('validates rating range', async () => {
      render(<ReviewEditor {...defaultProps} />);
      
      const ratingInput = screen.getByLabelText(/整体评分/i);
      await userInteraction.fillInput(ratingInput, '6');
      
      await userInteraction.clickButton(/保存复盘/i);
      
      await assertions.expectValidationError(/评分必须在1-5之间/i);
    });

    it('validates tag format', async () => {
      render(<ReviewEditor {...defaultProps} />);
      
      const tagInput = screen.getByLabelText(/添加标签/i);
      await userInteraction.fillInput(tagInput, '包含特殊字符@#$');
      
      fireEvent.keyDown(tagInput, { key: 'Enter', code: 'Enter' });
      
      await assertions.expectValidationError(/标签只能包含字母、数字和中文/i);
    });

    it('limits maximum number of tags', async () => {
      render(<ReviewEditor {...defaultProps} />);
      
      const tagInput = screen.getByLabelText(/添加标签/i);
      
      // 添加10个标签
      for (let i = 1; i <= 10; i++) {
        await userInteraction.fillInput(tagInput, `标签${i}`);
        fireEvent.keyDown(tagInput, { key: 'Enter', code: 'Enter' });
      }
      
      // 尝试添加第11个标签
      await userInteraction.fillInput(tagInput, '标签11');
      fireEvent.keyDown(tagInput, { key: 'Enter', code: 'Enter' });
      
      await assertions.expectValidationError(/最多只能添加10个标签/i);
    });
  });

  describe('Save and Cancel', () => {
    it('saves new review successfully', async () => {
      mockReviewService.createReview.mockResolvedValue(mockApiResponse(mockReview));
      
      render(<ReviewEditor {...defaultProps} />);
      
      // 填写表单
      const editor = screen.getByTestId('rich-text-editor');
      await userInteraction.fillInput(editor, '这是一个详细的复盘内容，包含了执行过程中的各种细节和思考。');
      
      const fourthStar = screen.getByTestId('star-3');
      await userInteraction.clickButton(fourthStar);
      
      const tagInput = screen.getByLabelText(/添加标签/i);
      await userInteraction.fillInput(tagInput, '成功');
      fireEvent.keyDown(tagInput, { key: 'Enter', code: 'Enter' });
      
      const improvementInput = screen.getByLabelText(/改进建议/i);
      await userInteraction.fillInput(improvementInput, '可以优化流程步骤');
      
      const lessonInput = screen.getByLabelText(/经验教训/i);
      await userInteraction.fillInput(lessonInput, '团队协作很重要');
      
      await userInteraction.clickButton(/保存复盘/i);
      
      await waitFor(() => {
        expect(mockReviewService.createReview).toHaveBeenCalledWith({
          executionId: 'execution-1',
          content: '这是一个详细的复盘内容，包含了执行过程中的各种细节和思考。',
          rating: 4,
          tags: ['成功'],
          improvements: ['可以优化流程步骤'],
          lessons: ['团队协作很重要']
        });
      });
      
      expect(defaultProps.onSave).toHaveBeenCalledWith(mockReview);
    });

    it('updates existing review successfully', async () => {
      mockReviewService.updateReview.mockResolvedValue(mockApiResponse({
        ...mockReview,
        content: '更新后的复盘内容'
      }));
      
      render(<ReviewEditor {...defaultProps} review={mockReview} />);
      
      const editor = screen.getByTestId('rich-text-editor');
      await userInteraction.fillInput(editor, '更新后的复盘内容');
      
      await userInteraction.clickButton(/保存复盘/i);
      
      await waitFor(() => {
        expect(mockReviewService.updateReview).toHaveBeenCalledWith('review-1', {
          content: '更新后的复盘内容',
          rating: 4,
          tags: ['成功', '高效'],
          improvements: ['可以优化流程步骤'],
          lessons: ['团队协作很重要']
        });
      });
    });

    it('shows loading state during save', async () => {
      mockReviewService.createReview.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockApiResponse(mockReview)), 1000))
      );
      
      render(<ReviewEditor {...defaultProps} />);
      
      const editor = screen.getByTestId('rich-text-editor');
      await userInteraction.fillInput(editor, '测试内容，足够长的内容用于通过验证');
      
      const firstStar = screen.getByTestId('star-0');
      await userInteraction.clickButton(firstStar);
      
      await userInteraction.clickButton(/保存复盘/i);
      
      expect(screen.getByRole('button', { name: /保存中/i })).toBeDisabled();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('handles save error', async () => {
      mockReviewService.createReview.mockRejectedValue(mockApiError('保存失败'));
      
      render(<ReviewEditor {...defaultProps} />);
      
      const editor = screen.getByTestId('rich-text-editor');
      await userInteraction.fillInput(editor, '测试内容，足够长的内容用于通过验证');
      
      const firstStar = screen.getByTestId('star-0');
      await userInteraction.clickButton(firstStar);
      
      await userInteraction.clickButton(/保存复盘/i);
      
      await assertions.expectValidationError(/保存失败/i);
      expect(screen.getByRole('button', { name: /保存复盘/i })).toBeEnabled();
    });

    it('cancels editing with confirmation', async () => {
      render(<ReviewEditor {...defaultProps} />);
      
      // 修改内容
      const editor = screen.getByTestId('rich-text-editor');
      await userInteraction.fillInput(editor, '修改了内容');
      
      await userInteraction.clickButton(/取消/i);
      
      // 确认取消对话框
      expect(screen.getByText(/确认取消编辑/i)).toBeInTheDocument();
      expect(screen.getByText(/未保存的更改将丢失/i)).toBeInTheDocument();
      
      await userInteraction.clickButton(/确认取消/i);
      
      expect(defaultProps.onCancel).toHaveBeenCalled();
    });

    it('cancels without confirmation when no changes', async () => {
      render(<ReviewEditor {...defaultProps} />);
      
      await userInteraction.clickButton(/取消/i);
      
      // 没有修改，直接取消
      expect(screen.queryByText(/确认取消编辑/i)).not.toBeInTheDocument();
      expect(defaultProps.onCancel).toHaveBeenCalled();
    });
  });

  describe('Auto-save', () => {
    it('auto-saves draft periodically', async () => {
      mockReviewService.saveDraft.mockResolvedValue(mockApiResponse({}));
      
      render(<ReviewEditor {...defaultProps} />);
      
      const editor = screen.getByTestId('rich-text-editor');
      await userInteraction.fillInput(editor, '自动保存的内容');
      
      // 等待自动保存触发
      await waitFor(() => {
        expect(mockReviewService.saveDraft).toHaveBeenCalledWith('execution-1', {
          content: '自动保存的内容',
          rating: 0,
          tags: [],
          improvements: [''],
          lessons: ['']
        });
      }, { timeout: 5000 });
      
      expect(screen.getByText(/草稿已保存/i)).toBeInTheDocument();
    });

    it('loads draft on initialization', async () => {
      const draftData = {
        content: '草稿内容',
        rating: 3,
        tags: ['草稿'],
        improvements: ['草稿改进'],
        lessons: ['草稿教训']
      };
      
      mockReviewService.loadDraft.mockResolvedValue(mockApiResponse(draftData));
      
      render(<ReviewEditor {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('草稿内容')).toBeInTheDocument();
        expect(screen.getByDisplayValue('3')).toBeInTheDocument();
        expect(screen.getByText('草稿')).toBeInTheDocument();
      });
      
      expect(screen.getByText(/已加载草稿/i)).toBeInTheDocument();
    });

    it('clears draft after successful save', async () => {
      mockReviewService.createReview.mockResolvedValue(mockApiResponse(mockReview));
      mockReviewService.clearDraft.mockResolvedValue(mockApiResponse({}));
      
      render(<ReviewEditor {...defaultProps} />);
      
      const editor = screen.getByTestId('rich-text-editor');
      await userInteraction.fillInput(editor, '测试内容，足够长的内容用于通过验证');
      
      const firstStar = screen.getByTestId('star-0');
      await userInteraction.clickButton(firstStar);
      
      await userInteraction.clickButton(/保存复盘/i);
      
      await waitFor(() => {
        expect(mockReviewService.clearDraft).toHaveBeenCalledWith('execution-1');
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<ReviewEditor {...defaultProps} />);
      
      expect(screen.getByRole('form')).toHaveAttribute('aria-label', '复盘报告编辑器');
      expect(screen.getByLabelText(/复盘内容/i)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText(/整体评分/i)).toHaveAttribute('aria-required', 'true');
      
      const stars = screen.getAllByTestId(/star-/);
      stars.forEach((star, index) => {
        expect(star).toHaveAttribute('aria-label', `评分 ${index + 1} 星`);
      });
    });

    it('supports keyboard navigation', () => {
      render(<ReviewEditor {...defaultProps} />);
      
      const editor = screen.getByTestId('rich-text-editor');
      editor.focus();
      expect(document.activeElement).toBe(editor);
      
      // Tab 导航到评分
      fireEvent.keyDown(editor, { key: 'Tab' });
      const firstStar = screen.getByTestId('star-0');
      expect(document.activeElement).toBe(firstStar);
      
      // 使用空格键选择评分
      fireEvent.keyDown(firstStar, { key: ' ', code: 'Space' });
      expect(screen.getByDisplayValue('1')).toBeInTheDocument();
    });

    it('announces form validation errors to screen readers', async () => {
      render(<ReviewEditor {...defaultProps} />);
      
      await userInteraction.clickButton(/保存复盘/i);
      
      const errorElement = screen.getByRole('alert');
      expect(errorElement).toHaveAttribute('aria-live', 'assertive');
      expect(errorElement).toHaveTextContent(/请填写复盘内容/i);
    });
  });

  describe('Responsive Design', () => {
    it('adapts to mobile layout', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });
      
      render(<ReviewEditor {...defaultProps} />);
      
      const container = screen.getByTestId('review-editor-container');
      expect(container).toHaveClass('mobile-layout');
    });

    it('stacks form sections vertically on small screens', () => {
      render(<ReviewEditor {...defaultProps} />, {
        theme: {
          breakpoints: {
            down: () => '@media (max-width: 600px)'
          }
        }
      });
      
      const formSections = screen.getByTestId('form-sections');
      expect(formSections).toHaveClass('vertical-stack');
    });
  });
});