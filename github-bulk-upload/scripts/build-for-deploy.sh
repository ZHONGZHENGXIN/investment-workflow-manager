#!/bin/bash

# 部署构建脚本
set -e

echo "🔨 开始构建部署版本..."

# 构建后端
echo "📦 构建后端..."
cd backend

# 确保依赖已安装
npm install --production=false

# 尝试简化构建
echo "🔧 尝试简化构建..."
if npm run build; then
    echo "✅ 后端构建成功"
else
    echo "⚠️ 标准构建失败，尝试简化构建..."
    if npm run build:simple; then
        echo "✅ 后端简化构建成功"
    else
        echo "❌ 后端构建失败"
        exit 1
    fi
fi

cd ..

# 构建前端
echo "🎨 构建前端..."
cd frontend

# 确保依赖已安装
npm install

# 构建前端
if npm run build; then
    echo "✅ 前端构建成功"
else
    echo "❌ 前端构建失败"
    exit 1
fi

cd ..

echo "🎉 构建完成！"
echo "📁 后端构建文件: backend/dist/"
echo "📁 前端构建文件: frontend/dist/"