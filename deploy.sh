#!/bin/bash
# 一键部署脚本 (One-click deployment script)

echo "开始部署 团队行程助手 (Team Schedule Helper)..."

# 1. 检查 Node.js 环境
if ! command -v node &> /dev/null
then
    echo "未找到 Node.js，请先安装 Node.js (v18+)"
    exit 1
fi

# 2. 安装依赖
echo "正在安装依赖..."
npm install

# 3. 构建前端
echo "正在构建前端资源..."
npm run build

# 4. 构建后端 (如果需要编译 TS)
echo "正在构建后端..."
npx esbuild server.ts --bundle --platform=node --target=node18 --outfile=dist/server.cjs

# 5. 启动服务 (使用 PM2 保证后台运行)
if ! command -v pm2 &> /dev/null
then
    echo "正在安装 PM2..."
    npm install -g pm2
fi

echo "正在启动服务..."
pm2 start dist/server.cjs --name "team-schedule-helper"

echo "部署完成！"
echo "服务已在后台运行，可以通过 http://localhost:3000 访问。"
echo "管理员面板访问地址: http://localhost:3000/admin?token=abcd"
echo "如果需要停止服务，请运行: pm2 stop team-schedule-helper"
