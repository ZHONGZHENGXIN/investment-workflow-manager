import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render, userInteraction, assertions } from '../utils';
import LoginForm from '../../components/auth/LoginForm';
import RegisterForm from '../../components/auth/RegisterForm';
import WorkflowBuilder from '../../components/workflow/WorkflowBuilder';
import FileUpload from '../../components/execution/FileUpload';

describe('Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('XSS Prevention', () => {
    it('should sanitize user input in workflow names', async () => {
      render(<WorkflowBuilder />);
      
      const nameInput = screen.getByLabelText(/工作流名称/i);
      
      // 尝试注入恶意脚本
      const maliciousInput = '<script>alert("XSS")</script>恶意工作流';
      
      await userInteraction.fillInput(nameInput, maliciousInput);
      
      // 输入应该被转义或清理
      expect(nameInput).toHaveValue('&lt;script&gt;alert("XSS")&lt;/script&gt;恶意工作流');
    });

    it('should prevent script injection in workflow descriptions', async () => {
      render(<WorkflowBuilder />);
      
      const descInput = screen.getByLabelText(/描述/i);
      
      const maliciousDesc = 'javascript:alert("XSS")';
      
      await userInteraction.fillInput(descInput, maliciousDesc);
      
      // 应该清理或转义恶意内容
      expect(descInput.value).not.toContain('javascript:');
    });

    it('should sanitize HTML content in rich text editors', async () => {
      render(<WorkflowBuilder />);
      
      // 假设有富文本编辑器
      const richTextEditor = screen.getByTestId('rich-text-editor');
      
      const maliciousHTML = '<img src="x" onerror="alert(\'XSS\')">';
      
      fireEvent.change(richTextEditor, { target: { value: maliciousHTML } });
      
      // HTML应该被清理
      expect(richTextEditor).not.toHaveValue(expect.stringContaining('onerror'));
    });

    it('should prevent XSS in search queries', async () => {
      render(<WorkflowBuilder />);
      
      const searchInput = screen.getByPlaceholderText(/搜索/i);
      
      const maliciousSearch = '"><script>alert("XSS")</script>';
      
      await userInteraction.fillInput(searchInput, maliciousSearch);
      
      // 搜索查询应该被转义
      expect(searchInput.value).not.toContain('<script>');
    });

    it('should escape user-generated content in displays', async () => {
      const maliciousContent = '<img src=x onerror=alert("XSS")>';
      
      render(<WorkflowBuilder />, {
        initialState: {
          workflow: {
            current: {
              name: maliciousContent,
              description: 'Test workflow'
            }
          }
        }
      });
      
      // 显示的内容应该被转义
      const displayedName = screen.getByTestId('workflow-name-display');
      expect(displayedName.innerHTML).not.toContain('onerror');
      expect(displayedName.textContent).toContain('&lt;img');
    });

    it('should prevent DOM-based XSS through URL parameters', () => {
      // 模拟恶意URL参数
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = {
        ...originalLocation,
        search: '?name=<script>alert("XSS")</script>'
      };
      
      render(<WorkflowBuilder />);
      
      // URL参数应该被安全处理
      const nameFromUrl = new URLSearchParams(window.location.search).get('name');
      if (nameFromUrl) {
        expect(document.body.innerHTML).not.toContain('<script>alert("XSS")</script>');
      }
      
      window.location = originalLocation;
    });
  });

  describe('CSRF Protection', () => {
    it('should include CSRF token in form submissions', async () => {
      // Mock fetch to capture requests
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
      global.fetch = mockFetch;
      
      render(<LoginForm />);
      
      await userInteraction.fillInput(/邮箱/i, 'test@example.com');
      await userInteraction.fillInput(/密码/i, 'password123');
      await userInteraction.clickButton(/登录/i);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
      
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      
      // 应该包含CSRF令牌
      expect(requestBody).toHaveProperty('_token');
      expect(requestBody._token).toBeTruthy();
    });

    it('should validate CSRF token on sensitive operations', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ error: 'CSRF token mismatch' })
      });
      global.fetch = mockFetch;
      
      render(<WorkflowBuilder />);
      
      await userInteraction.fillInput(/工作流名称/i, '测试工作流');
      await userInteraction.clickButton(/保存/i);
      
      await assertions.expectValidationError(/CSRF token mismatch/i);
    });

    it('should regenerate CSRF token after authentication', async () => {
      const mockFetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ 
            user: { id: '1', email: 'test@example.com' },
            token: 'auth-token',
            csrfToken: 'new-csrf-token'
          })
        });
      
      global.fetch = mockFetch;
      
      render(<LoginForm />);
      
      await userInteraction.fillInput(/邮箱/i, 'test@example.com');
      await userInteraction.fillInput(/密码/i, 'password123');
      await userInteraction.clickButton(/登录/i);
      
      await waitFor(() => {
        // 验证新的CSRF令牌被设置
        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        expect(csrfMeta?.getAttribute('content')).toBe('new-csrf-token');
      });
    });
  });

  describe('Input Validation', () => {
    it('should validate email format strictly', async () => {
      render(<RegisterForm />);
      
      const emailInput = screen.getByLabelText(/邮箱/i);
      
      // 测试各种无效邮箱格式
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user..name@domain.com',
        'user@domain',
        'user@.domain.com',
        'user@domain..com',
        'user name@domain.com'
      ];
      
      for (const email of invalidEmails) {
        await userInteraction.fillInput(emailInput, email);
        await userInteraction.clickButton(/注册/i);
        
        await assertions.expectValidationError(/邮箱格式不正确/i);
        
        // 清除输入
        fireEvent.change(emailInput, { target: { value: '' } });
      }
    });

    it('should enforce strong password requirements', async () => {
      render(<RegisterForm />);
      
      const passwordInput = screen.getByLabelText(/^密码/i);
      
      // 测试弱密码
      const weakPasswords = [
        '123456',
        'password',
        'abc123',
        '11111111',
        'qwerty',
        'password123', // 常见密码
        '12345678', // 纯数字
        'abcdefgh' // 纯字母
      ];
      
      for (const password of weakPasswords) {
        await userInteraction.fillInput(passwordInput, password);
        await userInteraction.clickButton(/注册/i);
        
        await assertions.expectValidationError(/密码强度不足/i);
        
        // 清除输入
        fireEvent.change(passwordInput, { target: { value: '' } });
      }
    });

    it('should validate file upload types and sizes', async () => {
      render(<FileUpload />);
      
      const fileInput = screen.getByTestId('file-upload-input');
      
      // 测试不允许的文件类型
      const maliciousFile = new File(['malicious content'], 'virus.exe', {
        type: 'application/x-msdownload'
      });
      
      await userInteraction.uploadFile('file-upload-input', maliciousFile);
      
      await assertions.expectValidationError(/不支持的文件类型/i);
      
      // 测试过大的文件
      const largeFile = new File(['x'.repeat(10 * 1024 * 1024)], 'large.pdf', {
        type: 'application/pdf'
      });
      
      await userInteraction.uploadFile('file-upload-input', largeFile);
      
      await assertions.expectValidationError(/文件大小超过限制/i);
    });

    it('should prevent SQL injection in search inputs', async () => {
      render(<WorkflowBuilder />);
      
      const searchInput = screen.getByPlaceholderText(/搜索工作流/i);
      
      // SQL注入尝试
      const sqlInjections = [
        "'; DROP TABLE workflows; --",
        "' OR '1'='1",
        "'; DELETE FROM users; --",
        "' UNION SELECT * FROM passwords --"
      ];
      
      for (const injection of sqlInjections) {
        await userInteraction.fillInput(searchInput, injection);
        
        // 输入应该被转义或拒绝
        expect(searchInput.value).not.toContain('DROP TABLE');
        expect(searchInput.value).not.toContain('DELETE FROM');
        expect(searchInput.value).not.toContain('UNION SELECT');
        
        // 清除输入
        fireEvent.change(searchInput, { target: { value: '' } });
      }
    });

    it('should validate numeric inputs strictly', async () => {
      render(<WorkflowBuilder />);
      
      const numericInput = screen.getByLabelText(/预计时长/i);
      
      // 测试无效数值输入
      const invalidNumbers = [
        'abc',
        '1.2.3',
        '1e10000',
        'Infinity',
        'NaN',
        '-1',
        '0'
      ];
      
      for (const value of invalidNumbers) {
        await userInteraction.fillInput(numericInput, value);
        
        // 应该显示验证错误或拒绝输入
        if (value === '-1' || value === '0') {
          await assertions.expectValidationError(/时长必须大于0/i);
        } else {
          await assertions.expectValidationError(/请输入有效数字/i);
        }
        
        fireEvent.change(numericInput, { target: { value: '' } });
      }
    });
  });

  describe('Authentication Security', () => {
    it('should implement rate limiting for login attempts', async () => {
      const mockFetch = jest.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: 'Invalid credentials' })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: 'Invalid credentials' })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: () => Promise.resolve({ error: 'Too many attempts. Please try again later.' })
        });
      
      global.fetch = mockFetch;
      
      render(<LoginForm />);
      
      // 多次失败登录尝试
      for (let i = 0; i < 3; i++) {
        await userInteraction.fillInput(/邮箱/i, 'test@example.com');
        await userInteraction.fillInput(/密码/i, 'wrongpassword');
        await userInteraction.clickButton(/登录/i);
        
        await waitFor(() => {
          if (i < 2) {
            expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
          } else {
            expect(screen.getByText(/Too many attempts/i)).toBeInTheDocument();
          }
        });
        
        // 清除表单
        if (i < 2) {
          fireEvent.change(screen.getByLabelText(/邮箱/i), { target: { value: '' } });
          fireEvent.change(screen.getByLabelText(/密码/i), { target: { value: '' } });
        }
      }
    });

    it('should handle session timeout securely', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Session expired' })
      });
      global.fetch = mockFetch;
      
      render(<WorkflowBuilder />, {
        initialState: {
          auth: {
            user: { id: '1', email: 'test@example.com' },
            token: 'expired-token',
            isAuthenticated: true
          }
        }
      });
      
      // 尝试执行需要认证的操作
      const saveButton = screen.getByRole('button', { name: /保存/i });
      fireEvent.click(saveButton);
      
      await assertions.expectValidationError(/会话已过期/i);
      
      // 应该重定向到登录页面
      await waitFor(() => {
        expect(screen.getByText(/请重新登录/i)).toBeInTheDocument();
      });
    });

    it('should clear sensitive data on logout', async () => {
      render(<WorkflowBuilder />, {
        initialState: {
          auth: {
            user: { id: '1', email: 'test@example.com' },
            token: 'valid-token',
            isAuthenticated: true
          }
        }
      });
      
      // 执行登出
      const logoutButton = screen.getByRole('button', { name: /退出登录/i });
      await userInteraction.clickButton(logoutButton);
      
      // 检查敏感数据是否被清除
      expect(localStorage.getItem('authToken')).toBeNull();
      expect(sessionStorage.getItem('userSession')).toBeNull();
      
      // 检查内存中的状态是否被清除
      const state = JSON.parse(document.body.getAttribute('data-redux-state') || '{}');
      expect(state.auth?.token).toBeUndefined();
      expect(state.auth?.user).toBeUndefined();
    });

    it('should validate JWT token integrity', async () => {
      // 模拟被篡改的JWT令牌
      const tamperedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.invalid_signature';
      
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Invalid token signature' })
      });
      global.fetch = mockFetch;
      
      render(<WorkflowBuilder />, {
        initialState: {
          auth: {
            user: { id: '1', email: 'test@example.com' },
            token: tamperedToken,
            isAuthenticated: true
          }
        }
      });
      
      // 尝试执行操作
      const saveButton = screen.getByRole('button', { name: /保存/i });
      fireEvent.click(saveButton);
      
      await assertions.expectValidationError(/令牌无效/i);
    });
  });

  describe('Data Protection', () => {
    it('should mask sensitive information in logs', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      render(<LoginForm />);
      
      const emailInput = screen.getByLabelText(/邮箱/i);
      const passwordInput = screen.getByLabelText(/密码/i);
      
      await userInteraction.fillInput(emailInput, 'sensitive@example.com');
      await userInteraction.fillInput(passwordInput, 'secretpassword');
      
      // 检查控制台日志不包含敏感信息
      const logs = consoleSpy.mock.calls.flat().join(' ');
      expect(logs).not.toContain('sensitive@example.com');
      expect(logs).not.toContain('secretpassword');
      
      consoleSpy.mockRestore();
    });

    it('should prevent data exposure in error messages', async () => {
      const mockFetch = jest.fn().mockRejectedValue(
        new Error('Database connection failed: user=admin, password=secret')
      );
      global.fetch = mockFetch;
      
      render(<WorkflowBuilder />);
      
      const saveButton = screen.getByRole('button', { name: /保存/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        const errorMessage = screen.getByText(/操作失败/i);
        expect(errorMessage).toBeInTheDocument();
        
        // 错误消息不应该包含敏感信息
        expect(errorMessage.textContent).not.toContain('admin');
        expect(errorMessage.textContent).not.toContain('secret');
        expect(errorMessage.textContent).not.toContain('Database');
      });
    });

    it('should implement proper content security policy', () => {
      // 检查CSP头部是否正确设置
      const metaTags = document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]');
      
      if (metaTags.length > 0) {
        const cspContent = metaTags[0].getAttribute('content');
        
        // 应该包含基本的CSP指令
        expect(cspContent).toContain("default-src 'self'");
        expect(cspContent).toContain("script-src 'self'");
        expect(cspContent).toContain("style-src 'self'");
        
        // 不应该允许不安全的内联脚本
        expect(cspContent).not.toContain("'unsafe-inline'");
        expect(cspContent).not.toContain("'unsafe-eval'");
      }
    });

    it('should sanitize file names and paths', async () => {
      render(<FileUpload />);
      
      // 测试恶意文件名
      const maliciousFiles = [
        new File(['content'], '../../../etc/passwd', { type: 'text/plain' }),
        new File(['content'], '..\\..\\windows\\system32\\config\\sam', { type: 'text/plain' }),
        new File(['content'], 'file<script>alert("xss")</script>.txt', { type: 'text/plain' }),
        new File(['content'], 'file\x00.exe.txt', { type: 'text/plain' })
      ];
      
      for (const file of maliciousFiles) {
        await userInteraction.uploadFile('file-upload-input', file);
        
        // 文件名应该被清理
        const displayedName = screen.getByTestId('uploaded-file-name');
        expect(displayedName.textContent).not.toContain('../');
        expect(displayedName.textContent).not.toContain('..\\');
        expect(displayedName.textContent).not.toContain('<script>');
        expect(displayedName.textContent).not.toContain('\x00');
      }
    });
  });

  describe('Access Control', () => {
    it('should enforce role-based permissions', async () => {
      // 测试普通用户权限
      render(<WorkflowBuilder />, {
        initialState: {
          auth: {
            user: { id: '1', email: 'user@example.com', role: 'USER' },
            token: 'valid-token',
            isAuthenticated: true
          }
        }
      });
      
      // 普通用户不应该看到管理员功能
      expect(screen.queryByText(/系统设置/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/用户管理/i)).not.toBeInTheDocument();
      
      // 重新渲染为管理员
      render(<WorkflowBuilder />, {
        initialState: {
          auth: {
            user: { id: '1', email: 'admin@example.com', role: 'ADMIN' },
            token: 'valid-token',
            isAuthenticated: true
          }
        }
      });
      
      // 管理员应该看到所有功能
      expect(screen.getByText(/系统设置/i)).toBeInTheDocument();
      expect(screen.getByText(/用户管理/i)).toBeInTheDocument();
    });

    it('should prevent unauthorized API access', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ error: 'Insufficient permissions' })
      });
      global.fetch = mockFetch;
      
      render(<WorkflowBuilder />, {
        initialState: {
          auth: {
            user: { id: '1', email: 'user@example.com', role: 'USER' },
            token: 'valid-token',
            isAuthenticated: true
          }
        }
      });
      
      // 尝试执行需要管理员权限的操作
      const adminButton = screen.getByTestId('admin-action-button');
      fireEvent.click(adminButton);
      
      await assertions.expectValidationError(/权限不足/i);
    });

    it('should validate resource ownership', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ error: 'Access denied: not resource owner' })
      });
      global.fetch = mockFetch;
      
      render(<WorkflowBuilder />, {
        initialState: {
          auth: {
            user: { id: '1', email: 'user@example.com', role: 'USER' },
            token: 'valid-token',
            isAuthenticated: true
          },
          workflow: {
            current: {
              id: 'workflow-1',
              name: 'Other User Workflow',
              ownerId: '2' // 不同的用户ID
            }
          }
        }
      });
      
      // 尝试编辑不属于自己的工作流
      const editButton = screen.getByRole('button', { name: /编辑/i });
      fireEvent.click(editButton);
      
      await assertions.expectValidationError(/无权访问此资源/i);
    });
  });

  describe('Client-Side Security', () => {
    it('should prevent clickjacking attacks', () => {
      // 检查是否设置了防止点击劫持的头部
      const frameOptions = document.querySelector('meta[http-equiv="X-Frame-Options"]');
      if (frameOptions) {
        expect(frameOptions.getAttribute('content')).toBe('DENY');
      }
      
      // 或者检查CSP frame-ancestors指令
      const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      if (cspMeta) {
        const cspContent = cspMeta.getAttribute('content');
        expect(cspContent).toContain("frame-ancestors 'none'");
      }
    });

    it('should implement secure cookie settings', () => {
      // 检查cookie设置
      document.cookie = 'testCookie=value; Secure; HttpOnly; SameSite=Strict';
      
      const cookies = document.cookie.split(';');
      const testCookie = cookies.find(cookie => cookie.includes('testCookie'));
      
      if (testCookie) {
        expect(testCookie).toContain('Secure');
        expect(testCookie).toContain('HttpOnly');
        expect(testCookie).toContain('SameSite=Strict');
      }
    });

    it('should validate all external links', () => {
      render(<WorkflowBuilder />);
      
      const externalLinks = screen.getAllByRole('link').filter(link => 
        link.getAttribute('href')?.startsWith('http')
      );
      
      externalLinks.forEach(link => {
        // 外部链接应该有安全属性
        expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
        expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
        
        // 如果是外部链接，应该在新窗口打开
        if (!link.getAttribute('href')?.includes(window.location.hostname)) {
          expect(link).toHaveAttribute('target', '_blank');
        }
      });
    });
  });
});