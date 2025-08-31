# 📁 项目结构

## 根目录
```
investment-workflow-manager/
├── .github/               # GitHub Actions 配置
├── .vscode/               # VS Code 配置
├── backend/               # Node.js 后端服务
├── frontend/              # React 前端应用
├── scripts/               # 构建和部署脚本
├── .env.example           # 环境变量示例
├── .gitignore             # Git 忽略文件
├── README.md              # 项目说明
├── ZEABUR_DEPLOYMENT.md   # Zeabur 部署指南
└── PROJECT_STRUCTURE.md   # 项目结构说明
```

## 前端结构 (frontend/)
```
frontend/
├── dist/                  # 构建产物 (自动生成)
├── public/                # 静态资源
├── src/                   # 源代码
│   ├── components/        # React 组件
│   ├── contexts/          # React Context
│   ├── hooks/             # 自定义 Hooks
│   ├── pages/             # 页面组件
│   ├── services/          # API 服务
│   ├── store/             # Redux 状态管理
│   ├── types/             # TypeScript 类型定义
│   ├── utils/             # 工具函数
│   ├── App.tsx            # 主应用组件
│   └── main.tsx           # 应用入口
├── .env.example           # 前端环境变量示例
├── .env.production        # 生产环境配置
├── index.html             # HTML 模板
├── package.json           # 依赖和脚本
├── tailwind.config.js     # Tailwind CSS 配置
├── tsconfig.json          # TypeScript 配置
├── tsconfig.node.json     # Node.js TypeScript 配置
└── vite.config.ts         # Vite 构建配置
```

## 后端结构 (backend/)
```
backend/
├── dist/                  # 构建产物 (自动生成)
├── prisma/                # 数据库配置
│   ├── migrations/        # 数据库迁移
│   ├── schema.prisma      # 数据库模式
│   └── seed.ts            # 数据库种子
├── src/                   # 源代码
│   ├── config/            # 配置文件
│   ├── controllers/       # 控制器
│   ├── middleware/        # 中间件
│   ├── models/            # 数据模型
│   ├── routes/            # 路由定义
│   ├── services/          # 业务逻辑
│   ├── types/             # TypeScript 类型
│   ├── utils/             # 工具函数
│   ├── index.ts           # 完整服务器入口
│   └── index.deploy.ts    # 部署用简化入口
├── .env.example           # 后端环境变量示例
├── package.json           # 依赖和脚本
├── tsconfig.json          # TypeScript 配置
├── tsconfig.deploy.json   # 部署用 TypeScript 配置
└── zeabur.json            # Zeabur 部署配置
```

## 关键文件说明

### 部署相关
- `backend/src/index.deploy.ts` - Zeabur 部署入口，简化版服务器
- `backend/zeabur.json` - Zeabur 部署配置
- `ZEABUR_DEPLOYMENT.md` - 详细部署指南

### 构建配置
- `frontend/vite.config.ts` - 前端构建配置
- `backend/tsconfig.deploy.json` - 后端部署构建配置
- `frontend/tailwind.config.js` - CSS 框架配置

### 环境配置
- `.env.example` - 环境变量模板
- `frontend/.env.production` - 前端生产环境配置

## 开发工作流

### 本地开发
```bash
# 前端开发
cd frontend && npm run dev

# 后端开发
cd backend && npm run dev:deploy
```

### 构建测试
```bash
# 前端构建
cd frontend && npm run build

# 后端构建
cd backend && npm run build
```

### 部署
1. 推送到 Git 仓库
2. Zeabur 自动检测并部署
3. 前端部署为静态网站
4. 后端部署为 Node.js 服务

---

**项目已优化为 Zeabur 部署，结构清晰简洁！**