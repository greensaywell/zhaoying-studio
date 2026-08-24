# 照影工坊

纯前端的可视化小说（Galgame）创作工具：在浏览器里编排角色、立绘、背景、音乐与剧情节拍，一键导出数据或可直接分享的 HTML5 播放器。

## 功能

- 🎬 幕 / 剧情卡编排：对白、旁白、抉择、入场、位移、特效、音乐、背景
- 🎭 角色与立绘管理：AI 生成、本地上传、网络 URL，支持本地封面代理
- 🖼️ 舞台实时预览：五站位、景深缩放、表情切换、特效演出
- 📤 一键导出：项目数据（.json）与单文件 HTML5 播放器
- 📥 存档 / 读档：支持导入项目数据，或直接读取导出的 HTML5 播放器恢复工程
- 💾 自动保存至浏览器本地（无需服务器）

## 本地开发

```bash
npm install
npm run dev        # http://localhost:3000
```

## 构建

```bash
npm run build      # 输出到 dist/
```

## 部署

本仓库通过 GitHub Actions 自动部署到 GitHub Pages：推送到 `main` 分支即触发构建与发布。
首次使用需在仓库 **Settings → Pages** 中将 Source 设为 **GitHub Actions**。

## 技术栈

React 19 · TypeScript · Vite · Tailwind CSS · Radix UI
