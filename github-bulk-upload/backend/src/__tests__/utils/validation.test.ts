import { 
  validateUser, 
  validateWorkflow, 
  validateWorkflowStep, 
  validateExecution,
  validateAttachment,
  validateReview 
} from '../../utils/validation';

describe('Validation Utils Tests', () => {
  describe('validateUser', () => {
    it('应该验证有效的用户数据', () => {
      const validUserData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      };

      const result = validateUser(validUserData);
      
      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(validUserData);
      expect(result.errors).toEqual([]);
    });

    it('应该拒绝无效的邮箱格式', () => {
      const invalidUserData = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'password123'
      };

      const result = validateUser(invalidUserData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('邮箱格式无效');
    });

    it('应该拒绝过短的密码', () => {
      const invalidUserData = {
        username: 'testuser',
        email: 'test@example.com',
        password: '123'
      };

      const result = validateUser(invalidUserData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('密码长度至少为6位');
    });

    it('应该拒绝缺少必需字段', () => {
      const invalidUserData = {
        email: 'test@example.com'
      };

      const result = validateUser(invalidUserData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该支持更新模式验证', () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name'
      };

      const result = validateUser(updateData, true);
      
      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(updateData);
    });
  });

  describe('validateWorkflow', () => {
    it('应该验证有效的工作流数据', () => {
      const validWorkflowData = {
        name: '测试工作流',
        description: '这是一个测试工作流',
        category: '投资',
        tags: ['测试', '投资'],
        steps: [
          {
            id: 'step1',
            title: '步骤1',
            description: '第一个步骤',
            type: 'MANUAL',
            order: 1,
            isRequired: true,
            estimatedDuration: 30,
            dependencies: []
          }
        ]
      };

      const result = validateWorkflow(validWorkflowData);
      
      expect(result.isValid).toBe(true);
      expect(result.data.name).toBe(validWorkflowData.name);
      expect(result.data.steps).toHaveLength(1);
    });

    it('应该拒绝缺少名称的工作流', () => {
      const invalidWorkflowData = {
        description: '缺少名称的工作流',
        steps: []
      };

      const result = validateWorkflow(invalidWorkflowData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('工作流名称不能为空');
    });

    it('应该拒绝空的步骤数组', () => {
      const invalidWorkflowData = {
        name: '无步骤工作流',
        steps: []
      };

      const result = validateWorkflow(invalidWorkflowData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('工作流至少需要一个步骤');
    });

    it('应该验证步骤的依赖关系', () => {
      const invalidWorkflowData = {
        name: '依赖错误工作流',
        steps: [
          {
            id: 'step1',
            title: '步骤1',
            type: 'MANUAL',
            order: 1,
            dependencies: ['step2'] // 依赖不存在的步骤
          },
          {
            id: 'step2',
            title: '步骤2',
            type: 'MANUAL',
            order: 2,
            dependencies: []
          }
        ]
      };

      const result = validateWorkflow(invalidWorkflowData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('依赖'))).toBe(true);
    });

    it('应该检测循环依赖', () => {
      const invalidWorkflowData = {
        name: '循环依赖工作流',
        steps: [
          {
            id: 'step1',
            title: '步骤1',
            type: 'MANUAL',
            order: 1,
            dependencies: ['step2']
          },
          {
            id: 'step2',
            title: '步骤2',
            type: 'MANUAL',
            order: 2,
            dependencies: ['step1'] // 循环依赖
          }
        ]
      };

      const result = validateWorkflow(invalidWorkflowData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('循环依赖'))).toBe(true);
    });
  });

  describe('validateWorkflowStep', () => {
    it('应该验证有效的工作流步骤', () => {
      const validStepData = {
        id: 'step1',
        title: '测试步骤',
        description: '这是一个测试步骤',
        type: 'MANUAL',
        order: 1,
        isRequired: true,
        estimatedDuration: 30,
        dependencies: []
      };

      const result = validateWorkflowStep(validStepData);
      
      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(validStepData);
    });

    it('应该拒绝无效的步骤类型', () => {
      const invalidStepData = {
        id: 'step1',
        title: '测试步骤',
        type: 'INVALID_TYPE',
        order: 1
      };

      const result = validateWorkflowStep(invalidStepData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('步骤类型无效');
    });

    it('应该拒绝负数的预估时长', () => {
      const invalidStepData = {
        id: 'step1',
        title: '测试步骤',
        type: 'MANUAL',
        order: 1,
        estimatedDuration: -10
      };

      const result = validateWorkflowStep(invalidStepData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('预估时长必须为正数');
    });
  });

  describe('validateExecution', () => {
    it('应该验证有效的执行数据', () => {
      const validExecutionData = {
        workflowId: 'workflow123',
        title: '测试执行',
        description: '这是一个测试执行',
        priority: 'MEDIUM',
        tags: ['测试'],
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      const result = validateExecution(validExecutionData);
      
      expect(result.isValid).toBe(true);
      expect(result.data.workflowId).toBe(validExecutionData.workflowId);
    });

    it('应该拒绝缺少工作流ID的执行', () => {
      const invalidExecutionData = {
        title: '缺少工作流ID的执行'
      };

      const result = validateExecution(invalidExecutionData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('工作流ID不能为空');
    });

    it('应该拒绝无效的优先级', () => {
      const invalidExecutionData = {
        workflowId: 'workflow123',
        title: '测试执行',
        priority: 'INVALID_PRIORITY'
      };

      const result = validateExecution(invalidExecutionData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('优先级无效');
    });

    it('应该拒绝过去的截止日期', () => {
      const invalidExecutionData = {
        workflowId: 'workflow123',
        title: '测试执行',
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // 昨天
      };

      const result = validateExecution(invalidExecutionData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('截止日期不能是过去的时间');
    });
  });

  describe('validateAttachment', () => {
    it('应该验证有效的附件数据', () => {
      const validAttachmentData = {
        filename: 'test.pdf',
        originalName: 'test-document.pdf',
        mimeType: 'application/pdf',
        size: 1024000,
        path: '/uploads/test.pdf'
      };

      const result = validateAttachment(validAttachmentData);
      
      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(validAttachmentData);
    });

    it('应该拒绝不支持的文件类型', () => {
      const invalidAttachmentData = {
        filename: 'test.exe',
        originalName: 'test.exe',
        mimeType: 'application/x-executable',
        size: 1024000,
        path: '/uploads/test.exe'
      };

      const result = validateAttachment(invalidAttachmentData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('不支持的文件类型');
    });

    it('应该拒绝过大的文件', () => {
      const invalidAttachmentData = {
        filename: 'large.pdf',
        originalName: 'large-document.pdf',
        mimeType: 'application/pdf',
        size: 100 * 1024 * 1024, // 100MB
        path: '/uploads/large.pdf'
      };

      const result = validateAttachment(invalidAttachmentData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('文件大小超过限制');
    });
  });

  describe('validateReview', () => {
    it('应该验证有效的复盘数据', () => {
      const validReviewData = {
        executionId: 'execution123',
        title: '测试复盘',
        content: '这是一个测试复盘内容',
        rating: 4,
        tags: ['测试', '复盘'],
        improvements: ['改进点1'],
        lessons: ['经验1']
      };

      const result = validateReview(validReviewData);
      
      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(validReviewData);
    });

    it('应该拒绝缺少执行ID的复盘', () => {
      const invalidReviewData = {
        title: '缺少执行ID的复盘',
        content: '内容'
      };

      const result = validateReview(invalidReviewData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('执行记录ID不能为空');
    });

    it('应该拒绝超出范围的评分', () => {
      const invalidReviewData = {
        executionId: 'execution123',
        title: '测试复盘',
        rating: 6 // 超出1-5范围
      };

      const result = validateReview(invalidReviewData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('评分必须在1-5之间');
    });

    it('应该拒绝过长的标题', () => {
      const invalidReviewData = {
        executionId: 'execution123',
        title: 'a'.repeat(201), // 超过200字符
        content: '内容'
      };

      const result = validateReview(invalidReviewData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('标题长度不能超过200字符');
    });
  });
});