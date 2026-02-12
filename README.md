# SynapseMind - 智汇圆桌

一个具有沉浸感的多LLM头脑风暴平台，让多个AI助手围绕话题进行讨论、辩论，最终达成共识。

## 功能特性

### 管理员功能
- 配置多个LLM的API-Key（支持Claude、GPT-4、Gemini、DeepSeek、Kimi、千问、智谱等）
- 实时监测各LLM的使用情况（在线状态、剩余额度、响应时间、成功率）
- 测试LLM连接状态
- 管理LLM配置

### 用户功能
- 创建新的头脑风暴会话
- 选择多个在线LLM参与讨论
- 实时观看AI助手之间的讨论
- 参与讨论，与AI互动
- 查看共识进度和讨论统计

### 技术特点
- **沉浸式UI设计**: 深色科幻风格，玻璃态效果，粒子背景动画
- **实时通信**: WebSocket实现消息实时推送
- **多LLM支持**: 集成7种主流LLM API
- **响应式设计**: 支持桌面和移动设备

## 技术栈

### 前端
- React 18 + TypeScript
- Tailwind CSS 3.4
- shadcn/ui 组件库
- Vite 构建工具

### 后端
- Python FastAPI
- SQLAlchemy + aiosqlite
- WebSocket (原生 websockets)
- 多LLM API集成

## 快速开始

### 1. 安装依赖

```bash
# 后端依赖
cd backend
pip install -r requirements.txt

# 前端依赖（已构建）
cd ../app
npm install
```

### 2. 启动后端服务

```bash
cd backend
python main.py
```

后端服务将在 http://localhost:8000 启动

### 3. 启动前端开发服务器（可选）

```bash
cd app
npm run dev
```

前端开发服务器将在 http://localhost:5173 启动

### 4. 构建前端

```bash
cd app
npm run build
```

构建产物将在 `dist/` 目录中

## 使用指南

### 配置LLM

1. 打开控制台页面
2. 点击"配置LLM"或进入"LLM管理"页面
3. 点击"添加LLM"按钮
4. 选择LLM类型，填写名称、API Key等信息
5. 点击"测试"按钮验证连接
6. 重复以上步骤添加多个LLM

### 发起讨论

1. 进入"讨论室"页面
2. 点击"发起讨论"按钮
3. 填写讨论标题和话题
4. 选择要参与的AI助手（至少选择一个在线的LLM）
5. 可选：调整高级设置（轮数、温度、token数）
6. 点击"开始讨论"

### 参与讨论

1. 在讨论室中点击"进入讨论"
2. 点击"开始讨论"按钮启动AI讨论
3. 观看AI助手之间的对话
4. 可以在输入框中发送消息参与讨论
5. 右侧面板显示共识进度和讨论统计

## API文档

启动后端后，访问 http://localhost:8000/docs 查看完整的API文档（Swagger UI）。

## 项目结构

```
.
├── app/                    # 前端React应用
│   ├── src/
│   │   ├── components/     # 组件
│   │   ├── pages/          # 页面
│   │   ├── hooks/          # 自定义Hooks
│   │   ├── services/       # API服务
│   │   └── types/          # TypeScript类型
│   └── dist/               # 构建产物
├── backend/                # 后端Python应用
│   ├── main.py             # FastAPI入口
│   ├── models.py           # 数据库模型
│   ├── schemas.py          # Pydantic模型
│   ├── llm_providers.py    # LLM提供商实现
│   ├── websocket_manager.py # WebSocket管理
│   └── brainstorm_engine.py # 头脑风暴引擎
└── Design.md               # 设计文档
```

## 支持的LLM

- **Claude** (Anthropic) - claude-3-5-sonnet
- **GPT-4** (OpenAI) - gpt-4-turbo
- **Gemini** (Google) - gemini-pro
- **DeepSeek** - deepseek-chat
- **Kimi** (Moonshot) - moonshot-v1
- **通义千问** (阿里云) - qwen-turbo
- **智谱GLM** - glm-4

## 环境变量

```bash
# 可选：配置数据库URL
DATABASE_URL=sqlite+aiosqlite:///./synapsemind.db
```

## 许可证

MIT License
