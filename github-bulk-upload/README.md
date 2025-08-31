# 个性化投资流程管理网站

一个云端部署的全栈应用，允许用户创建、定制和管理自己的投资决策流程。

## 功能特性

- 🔐 用户认证与管理
- 📋 投资流程定制
- 🔄 交互式流程执行
- 📁 文件上传和管理
- 📊 复盘功能和分析
- 📱 响应式设计

## 技术栈

### 前端
- React.js + TypeScript
- Tailwind CSS
- Redux Toolkit
- React Router

### 后端
- Node.js + Express.js + TypeScript
- PostgreSQL + Redis
- JWT认证
- Multer文件上传

### 部署
- Zeabur 云部署
- 自动CI/CD

## 快速开始

### 环境要求
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Docker (可选)

### 安装依赖
```bash
npm install
cd frontend && npm install
cd ../backend && npm install
```

### 开发环境启动
```bash
# 启动前后端开发服务器
npm run dev

# 或分别启动
npm run dev:backend
npm run dev:frontend
```

## 🚀 Zeabur 部署

### 快速部署
1. 推送代码到Git仓库
2. 在 [Zeabur](https://dash.zeabur.com) 连接仓库
3. 配置环境变量
4. 一键部署！

详细部署说明请查看 [ZEABUR_DEPLOYMENT.md](./ZEABUR_DEPLOYMENT.md)

## 项目结构

```
investment-workflow-manager/
├── frontend/              # React前端应用
├── backend/               # Node.js后端API
├── ZEABUR_DEPLOYMENT.md   # Zeabur部署指南
├── .env.example           # 环境变量示例
└── README.md              # 项目说明
```

## 开发指南

### 环境变量配置
复制 `.env.example` 到 `.env` 并配置相应的环境变量。

### 数据库迁移
```bash
cd backend
npm run migrate
```

### 运行测试
```bash
npm test
```

## API文档

API文档可在开发环境中访问：`http://localhost:3001/api-docs`

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License