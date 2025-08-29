# 后端测试文档

## 测试结构

本项目采用分层测试策略，包含以下类型的测试：

### 1. 单元测试 (Unit Tests)

#### 数据模型测试 (`models/`)
- `User.test.ts` - 用户模型测试
- `Workflow.test.ts` - 工作流模型测试

#### 控制器测试 (`controllers/`)
- `authController.test.ts` - 认证控制器测试
- `workflowController.test.ts` - 工作流控制器测试
- `executionController.test.ts` - 执行控制器测试

#### 服务层测试 (`services/`)
- `authService.test.ts` - 认证服务测试
- `workflowService.test.ts` - 工作流服务测试
- `executionService.test.ts` - 执行服务测试

#### 工具函数测试 (`utils/`)
- `validation.test.ts` - 数据验证工具测试
- `database.test.ts` - 数据库工具测试
- `fileUpload.test.ts` - 文件上传工具测试

#### 中间件测试 (`middleware/`)
- `auth.test.ts` - 认证中间件测试
- `permissions.test.ts` - 权限中间件测试

### 2. 集成测试 (Integration Tests)

#### API集成测试 (`integration/`)
- `workflow.integration.test.ts` - 工作流API集成测试
- `execution.integration.test.ts` - 执行API集成测试
- `api.integration.test.ts` - 通用API集成测试

#### 端到端测试 (`integration/`)
- `e2e.test.ts` - 完整业务流程端到端测试

### 3. 功能测试

#### 业务功能测试 (根目录)
- `workflow.test.ts` - 工作流功能测试
- `execution.test.ts` - 执行功能测试
- `attachment.test.ts` - 附件功能测试
- `review.test.ts` - 复盘功能测试
- `history.test.ts` - 历史记录功能测试
- `security.test.ts` - 安全功能测试

## 测试工具和配置

### 测试框架
- **Jest** - 主要测试框架
- **Supertest** - HTTP接口测试
- **ts-jest** - TypeScript支持

### Mock和测试工具
- **@jest/globals** - Jest全局函数
- **bcryptjs** - 密码加密测试
- **jsonwebtoken** - JWT令牌测试

### 测试配置文件
- `jest.config.js` - Jest配置
- `setup.ts` - 测试环境设置
- `helpers/database.ts` - 测试数据库辅助函数

## 运行测试

### 使用npm scripts
```bash
# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 运行端到端测试
npm run test:e2e

# 生成覆盖率报告
npm run test:coverage

# 监听模式运行测试
npm run test:watch
```

### 使用测试运行器
```bash
# 运行自定义测试运行器
npm run test:runner

# 运行特定模式的测试
npm run test:runner -- --pattern "controllers"

# 生成覆盖率报告
npm run test:runner -- --coverage
```

### 运行特定测试套件
```bash
# 运行模型测试
npm run test:models

# 运行控制器测试
npm run test:controllers

# 运行服务测试
npm run test:services

# 运行工具函数测试
npm run test:utils

# 运行中间件测试
npm run test:middleware
```

## 测试数据库

### 环境配置
测试使用独立的测试数据库，通过以下环境变量配置：

```env
NODE_ENV=test
TEST_DATABASE_URL=postgresql://test:test@localhost:5432/test_db
JWT_SECRET=test-jwt-secret-key
```

### 数据库设置
- 每个测试套件运行前会设置干净的测试环境
- 每个测试运行后会清理测试数据
- 使用事务回滚确保测试隔离

## 测试覆盖率

目标覆盖率指标：
- **语句覆盖率**: > 90%
- **分支覆盖率**: > 85%
- **函数覆盖率**: > 90%
- **行覆盖率**: > 90%

覆盖率报告生成位置：`coverage/index.html`

## 测试最佳实践

### 1. 测试命名
- 使用描述性的测试名称
- 遵循 "should [expected behavior] when [condition]" 格式
- 使用中文描述业务场景

### 2. 测试结构
- 使用 AAA 模式：Arrange, Act, Assert
- 每个测试只验证一个行为
- 使用 beforeEach/afterEach 进行测试设置和清理

### 3. Mock策略
- Mock外部依赖（数据库、第三方服务）
- 保持Mock的简单性和可维护性
- 验证Mock的调用参数和次数

### 4. 数据管理
- 使用工厂函数创建测试数据
- 避免测试间的数据依赖
- 及时清理测试数据

### 5. 异步测试
- 正确处理Promise和async/await
- 设置合适的超时时间
- 验证异步操作的结果

## 持续集成

测试集成到CI/CD流程中：

1. **代码提交时** - 运行单元测试
2. **Pull Request时** - 运行完整测试套件
3. **部署前** - 运行所有测试并生成覆盖率报告

## 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查测试数据库是否运行
   - 验证数据库连接字符串
   - 确保数据库权限正确

2. **测试超时**
   - 增加Jest超时配置
   - 检查异步操作是否正确处理
   - 优化测试数据库操作

3. **Mock失效**
   - 确保Mock在正确的位置
   - 检查Mock的导入路径
   - 验证Mock的重置和清理

4. **测试数据污染**
   - 检查测试清理逻辑
   - 使用事务回滚
   - 确保测试隔离

### 调试技巧

1. 使用 `--verbose` 标志获取详细输出
2. 使用 `--detectOpenHandles` 检测未关闭的句柄
3. 使用 `console.log` 进行调试（记得清理）
4. 使用Jest的调试模式

## 贡献指南

添加新测试时请遵循：

1. 为新功能编写对应的测试
2. 保持测试覆盖率不下降
3. 遵循现有的测试模式和命名约定
4. 更新相关文档
5. 确保所有测试通过

## 相关资源

- [Jest官方文档](https://jestjs.io/docs/getting-started)
- [Supertest文档](https://github.com/visionmedia/supertest)
- [Prisma测试指南](https://www.prisma.io/docs/guides/testing)
- [TypeScript Jest配置](https://jestjs.io/docs/getting-started#using-typescript)