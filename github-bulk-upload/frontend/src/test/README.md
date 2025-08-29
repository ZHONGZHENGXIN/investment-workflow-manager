# 前端测试文档

## 测试结构

本项目采用现代化的前端测试策略，使用 Vitest 作为测试框架，包含以下类型的测试：

### 1. 组件测试 (Component Tests)

#### 认证组件测试 (`components/auth/__tests__/`)
- `LoginForm.test.tsx` - 登录表单组件测试
- `RegisterForm.test.tsx` - 注册表单组件测试

#### 工作流组件测试 (`components/workflow/__tests__/`)
- `WorkflowList.test.tsx` - 工作流列表组件测试
- `WorkflowBuilder.test.tsx` - 工作流构建器组件测试

#### 执行组件测试 (`components/execution/__tests__/`)
- `WorkflowExecution.test.tsx` - 工作流执行组件测试
- `ProgressTracker.test.tsx` - 进度跟踪组件测试

#### 通用组件测试 (`components/common/__tests__/`)
- `SkeletonLoader.test.tsx` - 骨架屏组件测试
- `NetworkStatus.test.tsx` - 网络状态组件测试

### 2. Hook测试 (Hook Tests)

#### 自定义Hook测试 (`hooks/__tests__/`)
- `useOffline.test.ts` - 离线状态Hook测试
- `usePerformance.test.ts` - 性能监控Hook测试

### 3. 服务层测试 (Service Tests)

#### API服务测试 (`services/__tests__/`)
- `auth.test.ts` - 认证服务测试
- `workflow.test.ts` - 工作流服务测试
- `execution.test.ts` - 执行服务测试

### 4. 工具函数测试 (Utility Tests)

#### 工具函数测试 (`utils/__tests__/`)
- `validation.test.ts` - 验证工具测试
- `storage.test.ts` - 存储工具测试
- `format.test.ts` - 格式化工具测试

## 测试工具和配置

### 测试框架
- **Vitest** - 快速的单元测试框架
- **@testing-library/react** - React组件测试工具
- **@testing-library/user-event** - 用户交互模拟
- **@testing-library/jest-dom** - DOM断言扩展

### 测试配置文件
- `vitest.config.ts` - Vitest配置
- `src/test/setup.ts` - 测试环境设置
- `src/test/utils.tsx` - 测试工具函数

## 运行测试

### 使用npm scripts
```bash
# 运行所有测试
npm test

# 监听模式运行测试
npm run test:watch

# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行测试UI界面
npm run test:ui
```

### 运行特定测试
```bash
# 运行特定文件的测试
npm test -- LoginForm.test.tsx

# 运行特定目录的测试
npm test -- components/auth

# 运行匹配模式的测试
npm test -- --grep "should login"
```

## 测试工具函数

### renderWithProviders
提供完整的应用上下文包装器，包括：
- Redux Store
- React Router
- Toast通知
- 主题提供者

```tsx
import { renderWithProviders } from '../test/utils'

test('should render component with providers', () => {
  renderWithProviders(<MyComponent />, {
    preloadedState: { auth: { user: mockUser } },
    route: '/dashboard'
  })
})
```

### Mock数据
提供常用的Mock数据：
- `mockUser` - 模拟用户数据
- `mockWorkflow` - 模拟工作流数据
- `mockExecution` - 模拟执行数据
- `mockReview` - 模拟复盘数据

### API Mock工具
```tsx
import { mockApiCall, mockApiError } from '../test/utils'

// Mock成功的API调用
const mockLogin = mockApiCall({ user: mockUser, tokens: mockTokens })

// Mock失败的API调用
const mockLoginError = mockApiError({ message: '登录失败' })
```

## 测试最佳实践

### 1. 测试命名
- 使用描述性的测试名称
- 遵循 "should [expected behavior] when [condition]" 格式
- 使用中文描述业务场景

```tsx
it('should show validation error when email is invalid', async () => {
  // 测试代码
})

it('应该在邮箱格式错误时显示验证错误', async () => {
  // 测试代码
})
```

### 2. 测试结构
- 使用 AAA 模式：Arrange, Act, Assert
- 每个测试只验证一个行为
- 使用 beforeEach/afterEach 进行测试设置和清理

```tsx
describe('LoginForm', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should submit form with valid data', async () => {
    // Arrange
    const mockLogin = vi.fn().mockResolvedValue(mockResponse)
    renderWithProviders(<LoginForm />)
    
    // Act
    await user.type(screen.getByLabelText(/邮箱/), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /登录/ }))
    
    // Assert
    expect(mockLogin).toHaveBeenCalledWith(expectedData)
  })
})
```

### 3. 异步测试
- 使用 `waitFor` 等待异步操作
- 正确处理Promise和async/await
- 设置合适的超时时间

```tsx
it('should show loading state during submission', async () => {
  const mockSubmit = vi.fn().mockImplementation(() => 
    new Promise(resolve => setTimeout(resolve, 100))
  )
  
  renderWithProviders(<MyForm onSubmit={mockSubmit} />)
  
  await user.click(screen.getByRole('button', { name: /提交/ }))
  
  expect(screen.getByText(/提交中/)).toBeInTheDocument()
  
  await waitFor(() => {
    expect(screen.queryByText(/提交中/)).not.toBeInTheDocument()
  })
})
```

### 4. Mock策略
- Mock外部依赖（API、第三方库）
- 保持Mock的简单性和可维护性
- 验证Mock的调用参数和次数

```tsx
// Mock整个模块
vi.mock('../services/auth')

// Mock特定函数
const mockLogin = vi.fn()
authService.login = mockLogin

// 验证Mock调用
expect(mockLogin).toHaveBeenCalledWith(expectedArgs)
expect(mockLogin).toHaveBeenCalledTimes(1)
```

### 5. 用户交互测试
- 使用 `@testing-library/user-event` 模拟真实用户操作
- 测试键盘导航和可访问性
- 验证表单验证和错误处理

```tsx
const user = userEvent.setup()

// 模拟用户输入
await user.type(screen.getByLabelText(/用户名/), 'testuser')

// 模拟点击
await user.click(screen.getByRole('button', { name: /提交/ }))

// 模拟键盘操作
await user.keyboard('{Tab}{Enter}')
```

## 测试覆盖率

目标覆盖率指标：
- **语句覆盖率**: > 85%
- **分支覆盖率**: > 80%
- **函数覆盖率**: > 85%
- **行覆盖率**: > 85%

覆盖率报告生成位置：`coverage/index.html`

## 持续集成

测试集成到CI/CD流程中：

1. **代码提交时** - 运行相关组件测试
2. **Pull Request时** - 运行完整测试套件
3. **部署前** - 运行所有测试并生成覆盖率报告

## 故障排除

### 常见问题

1. **组件渲染失败**
   - 检查是否正确提供了必要的上下文
   - 验证Mock数据的格式
   - 确保异步操作正确处理

2. **用户事件不触发**
   - 确保使用 `await` 等待用户操作
   - 检查元素是否可见和可交互
   - 验证选择器是否正确

3. **异步测试超时**
   - 增加 `waitFor` 的超时时间
   - 检查异步操作是否正确Mock
   - 确保清理定时器和事件监听器

4. **Mock不生效**
   - 检查Mock的导入路径
   - 确保Mock在正确的位置
   - 验证Mock的重置和清理

### 调试技巧

1. 使用 `screen.debug()` 查看DOM结构
2. 使用 `--reporter=verbose` 获取详细输出
3. 使用 `test.only` 运行单个测试
4. 使用浏览器开发者工具调试

## 贡献指南

添加新测试时请遵循：

1. 为新组件编写对应的测试
2. 保持测试覆盖率不下降
3. 遵循现有的测试模式和命名约定
4. 更新相关文档
5. 确保所有测试通过

## 相关资源

- [Vitest官方文档](https://vitest.dev/)
- [Testing Library文档](https://testing-library.com/docs/react-testing-library/intro/)
- [React测试最佳实践](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [用户事件API](https://testing-library.com/docs/user-event/intro/)