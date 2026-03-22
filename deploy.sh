#!/bin/bash
# 一键部署脚本 (One-click deployment script)

echo "开始部署 Dwork..."

# 1. 检查 Node.js 和 Git 环境
if ! command -v git &> /dev/null
then
    echo "未找到 Git，请先安装 Git"
    exit 1
fi

if ! command -v node &> /dev/null
then
    echo "未找到 Node.js，请先安装 Node.js (v18+)"
    exit 1
fi

# 2. 拉取代码
if [ -d "Dwork" ]; then
  echo "目录已存在，正在更新代码..."
  cd Dwork
  git pull
else
  echo "正在克隆代码..."
  git clone https://github.com/AomoDa/Dwork.git
  cd Dwork
fi

# 3. 安装依赖
echo "正在安装依赖..."
npm install

# 4. 构建前端
echo "正在构建前端资源..."
npm run build

# 5. 构建后端 (如果需要编译 TS)
echo "正在构建后端..."
npx esbuild server.ts --bundle --platform=node --target=node18 --outfile=dist/server.cjs

# 6. 启动服务 (使用 PM2 保证后台运行)
if ! command -v pm2 &> /dev/null
then
    echo "正在安装 PM2..."
    npm install -g pm2
fi

echo "正在启动服务..."
pm2 start dist/server.cjs --name "dwork"

echo "部署完成！"
echo "服务已在后台运行，可以通过 http://localhost:3000 访问。"
echo "管理员面板访问地址: http://localhost:3000/admin?token=abcd"
echo "如果需要停止服务，请运行: pm2 stop dwork"
