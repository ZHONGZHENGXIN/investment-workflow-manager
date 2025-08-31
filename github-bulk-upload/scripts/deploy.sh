#!/bin/bash

# 投资流程管理系统部署脚本

set -e

echo "🚀 开始部署投资流程管理系统..."

# 检查环境变量
if [ -z "$NODE_ENV" ]; then
    export NODE_ENV=production
fi

echo "📋 环境: $NODE_ENV"

# 安装依赖
echo "📦 安装依赖..."
npm install --production

# 构建后端
echo "🔨 构建后端..."
cd backend
npm run build
cd ..

# 构建前端
echo "🎨 构建前端..."
cd frontend
npm run build
cd ..

# 数据库迁移
echo "🗄️ 运行数据库迁移..."
cd backend
npx prisma migrate deploy
npx prisma generate
cd ..

# 创建必要的目录
echo "📁 创建目录..."
mkdir -p backend/uploads
mkdir -p backend/logs

# 设置权限
echo "🔐 设置权限..."
chmod -R 755 backend/uploads
chmod -R 755 backend/logs

# 启动服务
echo "🎯 启动服务..."
if [ "$NODE_ENV" = "production" ]; then
    # 生产环境使用PM2
    if command -v pm2 &> /dev/null; then
        pm2 start ecosystem.config.js
    else
        echo "⚠️ PM2未安装，使用node直接启动"
        cd backend && node dist/index.js
    fi
else
    # 开发环境
    npm run dev
fi

echo "✅ 部署完成！"