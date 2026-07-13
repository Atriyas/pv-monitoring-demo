# PV Monitoring System - Standalone Demo

光伏发电异常监测系统 前端展示项目

> 基于 Vue 3 + Element Plus + ECharts 构建，无需后端，开箱即用。

## 快速开始

### 本地运行

```bash
npm install
npm run dev
# 打开 http://localhost:5173
```

### 登录账号

| 角色 | 账号 | 密码 |
|-----------|-----------|-----------|
| 超级管理员 | admin | a123456 |
| 电站站长 | manager | m123456 |
| 运维工程师 | engineer | e123456 |
| 运维工程师 | wang_gc | 123456 |

## 部署到 GitHub Pages

### 第一步：创建 GitHub 仓库

1. 打开 https://github.com 并登录
2. 点击右上角 "+" → "New repository"
3. 仓库名称随便起，例如 `pv-monitoring-demo`
4. 选择 Public，不要勾选初始化任何文件
5. 点击 "Create repository"

### 第二步：推送代码

在本地终端执行：

```bash
# 进入项目
cd D:\AI\Codex-workspace\Try\pv-monitoring-standalone

# 初始化 git
git init
git add .
git commit -m "first commit"

# 链接远程仓库 （替换为你的仓库地址）
git branch -M main
git remote add origin https://github.com/你的用户名/pv-monitoring-demo.git
git push -u origin main
```

### 第三步：开启 GitHub Pages

1. 在 GitHub 仓库页面点 "Settings"
2. 左侧菜单找 "Pages"
3. "Source" 选择 "GitHub Actions"
4. 系统会自动识别已有的 .github/workflows/deploy.yml 文件
5. 等待绿色刊登完成
6. 完成后会显示一个链接，例如：
   `https://你的用户名.github.io/pv-monitoring-demo/`

> 第一次推送后，Actions 会自动构建并部署。之后每次推送都会自动更新。

## 技术栈

- 前端框架: Vue 3 (Composition API)
- UI 库: Element Plus
- 图表: ECharts 5
- 路由: Vue Router 4 (Hash 模式)
- 构建: Vite 5
- 数据: Mock 数据（无需后端）
