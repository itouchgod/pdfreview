# Vercel 部署配置 - 香港东部区域

## 部署区域信息
- **Vercel 区域**: hkg1 (Hong Kong East)
- **AWS 区域**: ap-east-1 (Asia Pacific - Hong Kong)
- **位置**: Hong Kong (East)

## Vercel 部署方式

### 1. 通过 Vercel CLI 部署
```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录 Vercel
vercel login

# 部署到生产环境
npm run deploy

# 部署预览版本
npm run deploy:preview
```

### 2. 通过 Vercel Dashboard 部署
1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 导入 GitHub 仓库
3. 在项目设置中配置区域为 `hkg1`
4. 设置环境变量
5. 部署项目

## Vercel 项目配置

### 1. 在 Vercel Dashboard 中设置
1. 进入项目设置 → General
2. 在 "Region" 部分选择 `Hong Kong (hkg1)`
3. 保存设置

### 2. 环境变量设置
在 Vercel Dashboard → Settings → Environment Variables 中添加：
```
NEXT_PUBLIC_REGION=ap-east-1
NEXT_PUBLIC_ZONE=hkg1
NEXT_PUBLIC_LOCATION=Hong Kong (East)
```

## 配置文件说明

### vercel.json
- ✅ 配置了香港东部区域 (hkg1)
- ✅ 所有函数都部署到香港东部
- ✅ 添加了安全头配置
- ✅ 配置了 Service Worker 重写规则

### next.config.ts
- ✅ 启用了 standalone 输出模式
- ✅ 优化了构建配置
- ✅ 配置了 PDF.js 优化

## 部署步骤

### 首次部署
1. 确保代码已推送到 GitHub
2. 在 Vercel Dashboard 中导入项目
3. 设置区域为 `hkg1`
4. 配置环境变量
5. 点击 "Deploy"

### 后续部署
```bash
# 推送代码到 GitHub
git add .
git commit -m "Update deployment config"
git push origin main

# Vercel 会自动部署
```

## 性能优化
- 启用了压缩
- 配置了代码分割
- 优化了 PDF.js 加载
- 设置了缓存策略

## 注意事项
1. 确保所有静态资源都能正确加载
2. PDF 文件较大，注意 CDN 配置
3. 香港东部区域延迟较低，适合亚洲用户访问
