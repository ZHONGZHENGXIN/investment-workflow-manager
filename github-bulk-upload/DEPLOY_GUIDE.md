# 🚀 部署指南

## 系统状态
- ✅ 后端已部署: `investment-workflow-manager.zeabur.app`
- 🔄 前端准备部署到ZEABUR

## 前端部署步骤

### 1. ZEABUR配置
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": "vite"
}
```

### 2. 环境变量
```env
VITE_API_URL=https://investment-workflow-manager.zeabur.app/api
VITE_APP_NAME=投资流程管理系统
```

### 3. 部署验证
部署后访问以下功能：
- 登录页面 (自动跳转)
- 测试账号: `test@example.com` / `password123`
- 所有页面导航正常
- API调用成功

## 功能清单
- ✅ 用户认证 (登录/注册)
- ✅ 工作流管理
- ✅ 执行监控
- ✅ 历史记录
- ✅ 复盘管理
- ✅ 用户管理
- ✅ 响应式设计

**系统完全就绪，立即可部署！** 🎉