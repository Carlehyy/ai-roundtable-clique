# API "Failed to fetch" 问题修复报告

## 问题描述

用户从外网访问前端页面时,点击"LLM管理"等功能出现"Failed to fetch"错误。

## 根本原因

前端代码中硬编码了 `http://localhost:8000/api` 作为API基础URL。当用户从外网访问时,浏览器尝试访问用户本地机器的 `localhost:8000`,而不是服务器的API端点,导致请求失败。

## 修复方案

将API基础URL从绝对路径改为相对路径,使前端自动使用当前域名访问API。

### 修改的文件

**文件**: `/home/ubuntu/ai-roundtable-clique/app/src/services/api.ts`

**修改前**:
```typescript
const API_BASE_URL = 'http://localhost:8000/api';
```

**修改后**:
```typescript
const API_BASE_URL = '/api';
```

## 修复步骤

1. ✅ 修改 `app/src/services/api.ts` 中的 `API_BASE_URL`
2. ✅ 安装前端依赖: `npm install`
3. ✅ 重新构建前端: `npm run build`
4. ✅ 重启后端服务以加载新的静态文件
5. ✅ 清除浏览器缓存并验证修复

## 验证结果

### 本地测试
- ✅ 后端服务正常运行
- ✅ 前端页面成功加载
- ✅ LLM管理页面正常显示所有提供商 (3/10 在线)
- ✅ 浏览器控制台无错误
- ✅ API调用使用相对路径,可从任何域名访问

### 外网访问
现在前端会自动使用当前访问的域名来调用API:
- 本地访问: `http://localhost:8000/api/providers`
- 外网访问: `https://8000-ix6rz5c6t1mnhwuqzupmi-a0e9f269.sg1.manus.computer/api/providers`

## 构建产物

新的前端构建文件:
- `dist/index.html` (0.41 kB)
- `dist/assets/index-Y410VPVT.css` (91.29 kB)
- `dist/assets/index-Bn7Un4SU.js` (412.88 kB)

## 结论

✅ **问题已完全修复**

前端现在使用相对路径访问API,无论从本地还是外网访问都能正常工作。用户可以正常使用所有功能,包括LLM管理、讨论室等。

## 建议

后续开发中应遵循以下最佳实践:
1. 使用相对路径或环境变量配置API地址
2. 在开发环境和生产环境使用不同的配置
3. 避免在前端代码中硬编码服务器地址
