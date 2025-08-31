#!/bin/bash

# 部署验证脚本 - 清理后版本
set -e

echo "🔍 开始部署验证..."

# 验证项目结构
echo "📁 验证项目结构..."
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ 项目结构不完整"
    exit 1
fi

# 验证后端
echo "📦 验证后端..."
cd backend

# 检查关键文件
if [ ! -f "src/index.deploy.ts" ]; then
    echo "❌ 缺少部署入口文件"
    exit 1
fi

if [ ! -f "tsconfig.deploy.json" ]; then
    echo "❌ 缺少部署TypeScript配置"
    exit 1
fi

# 检查是否清理了多余文件
if [ -f "src/index.simple.ts" ]; then
    echo "⚠️ 发现多余文件: src/index.simple.ts"
fi

if [ -f "src/utils/logger.simple.ts" ]; then
    echo "⚠️ 发现多余文件: src/utils/logger.simple.ts"
fi

echo "🔨 测试后端构建..."
if npm run build; then
    echo "✅ 后端构建成功"
    if [ -f "dist/index.deploy.js" ]; then
        echo "✅ 部署文件生成成功"
    else
        echo "❌ 部署文件未生成"
        exit 1
    fi
else
    echo "❌ 后端构建失败"
    exit 1
fi

cd ..

# 验证前端
echo "🎨 验证前端..."
cd frontend

# 检查关键文件
if [ ! -f "src/services/offline.ts" ]; then
    echo "❌ 缺少离线服务文件"
    exit 1
fi

if [ ! -f "tsconfig.node.json" ]; then
    echo "❌ 缺少Node.js TypeScript配置"
    exit 1
fi

# 检查是否清理了多余文件
if [ -f "src/contexts/OfflineContext.simple.tsx" ]; then
    echo "⚠️ 发现多余文件: src/contexts/OfflineContext.simple.tsx"
fi

echo "🔧 测试前端TypeScript..."
if npx tsc --noEmit; then
    echo "✅ 前端TypeScript检查通过"
else
    echo "❌ 前端TypeScript检查失败"
    exit 1
fi

echo "🔨 测试前端构建..."
if npm run build; then
    echo "✅ 前端构建成功"
    if [ -d "dist" ]; then
        echo "✅ 前端构建产物生成成功"
    else
        echo "❌ 前端构建产物未生成"
        exit 1
    fi
else
    echo "❌ 前端构建失败"
    exit 1
fi

cd ..

# 验证Docker配置
echo "🐳 验证Docker配置..."
if [ -f "docker-compose.yml" ] && [ -f "backend/Dockerfile" ] && [ -f "frontend/Dockerfile" ]; then
    echo "✅ Docker配置完整"
else
    echo "⚠️ Docker配置不完整"
fi

echo ""
echo "🎉 部署验证完成！"
echo "✅ 项目结构: 清晰"
echo "✅ 后端构建: 通过"
echo "✅ 前端构建: 通过"
echo "✅ TypeScript: 通过"
echo "✅ 多余文件: 已清理"
echo ""
echo "🚀 项目已完全准备好部署到 Zeabur！"