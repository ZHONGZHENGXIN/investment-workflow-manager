# 投资流程管理系统

一个现代化的投资流程管理平台，支持工作流创建、执行监控、历史分析和复盘管理。

## 🚀 快速开始

### 后端部署 (已完成)
- **域名**: `investment-workflow-manager.zeabur.app`
- **状态**: ✅ 运行正常
- **API**: 所有端点正常响应

### 前端部署

#### 1. 环境要求
- Node.js 18+
- npm 或 yarn

#### 2. 安装依赖
```bash
cd frontend
npm install
```

#### 3. 构建项目
```bash
npm run build
```

#### 4. ZEABUR部署配置
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": "vite"
}
```

#### 5. 环境变量
```env
VITE_API_URL=https://investment-workflow-manager.zeabur.app/api
VITE_APP_NAME=投资流程管理系统
VITE_APP_VERSION=1.0.0
```

## 📱 功能特性

### 核心功能
- **用户认证**: 登录/注册/权限管理
- **工作流管理**: 创建和管理投资流程
- **执行监控**: 实时跟踪执行进度
- **历史分析**: 数据统计和趋势分析
- **复盘管理**: 投资决策记录和洞察
- **用户管理**: 系统用户和权限控制

### 技术特性
- **现代化架构**: React 18 + TypeScript + Redux
- **响应式设计**: 支持桌面和移动设备
- **高性能**: 代码分割和懒加载优化
- **安全可靠**: JWT认证和路由保护

## 🎯 使用指南

### 测试账号
```
邮箱: test@example.com
密码: password123
```

### 主要页面
- `/login` - 用户登录
- `/dashboard` - 系统仪表板
- `/workflows` - 工作流管理
- `/executions` - 执行记录
- `/history` - 历史数据
- `/reviews` - 复盘管理
- `/users` - 用户管理

## 🛠️ 技术栈

### 前端
- React 18
- TypeScript
- Redux Toolkit
- React Router
- Tailwind CSS
- Vite

### 后端
- Node.js
- Express
- TypeScript
- Zeabur

## 📁 项目结构

```
├── frontend/                 # 前端应用
│   ├── src/
│   │   ├── components/      # React组件
│   │   ├── pages/          # 页面组件
│   │   ├── services/       # API服务
│   │   ├── store/          # Redux状态管理
│   │   └── types/          # TypeScript类型定义
│   ├── dist/               # 构建输出
│   └── package.json
├── backend/                 # 后端应用
│   ├── src/
│   │   ├── routes/         # API路由
│   │   └── index.deploy.ts # 部署入口
│   └── package.json
└── README.md               # 项目说明
```

## 🚀 部署状态

- ✅ 后端服务已部署并运行正常
- ✅ 前端应用构建成功，准备部署
- ✅ 所有功能测试通过
- ✅ API集成完成
- ✅ 用户界面完整

## 📞 支持

系统已经过全面测试，具备生产环境部署条件。如有问题，请检查：

1. 环境变量配置是否正确
2. 后端API是否正常响应
3. 网络连接是否稳定

---

**系统已完全就绪，可立即部署使用！** 🎉