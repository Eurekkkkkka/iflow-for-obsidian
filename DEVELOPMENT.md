# iFlow for Obsidian - 开发文档

## 📚 目录

- [项目概述](#项目概述)
- [项目结构](#项目结构)
- [核心文件说明](#核心文件说明)
- [开发流程](#开发流程)
- [发布流程](#发布流程)
- [常见问题](#常见问题)
- [代码规范](#代码规范)
- [调试技巧](#调试技巧)
- [参考资源](#参考资源)

---

## 项目概述

iFlow for Obsidian 是一个将 iFlow CLI 嵌入到 Obsidian 中的插件，提供完整的 AI 协作能力：文件读写、搜索、bash 命令和多步骤工作流。

**技术栈：**
- TypeScript
- Obsidian API
- WebSocket (ACP 协议)
- iFlow CLI

**关键特性：**
- 🔀 实时流式响应
- 💬 会话历史管理
- 📁 文件上下文支持
- 🎨 优美的 UI 设计
- 🔄 自动滚动到底部

---

## 项目结构

```
iflow-for-obsidian/
├── src/
│   ├── main.ts                 # 插件入口，设置管理
│   ├── chatView.ts             # 聊天视图 UI，核心交互逻辑
│   ├── iflowService.ts         # iFlow CLI 服务，WebSocket 通信
│   ├── conversationStore.ts    # 会话存储，localStorage 管理
│   └── styles.css              # 样式文件
├── main.js                     # 编译后的主文件（发布用）
├── manifest.json               # 插件清单
├── package.json                # 依赖管理
├── esbuild.config.mjs          # 构建配置
├── tsconfig.json               # TypeScript 配置
└── DEVELOPMENT.md              # 本文档
```

---

## 核心文件说明

### 1. `src/main.ts` - 插件入口

**功能：**
- 插件生命周期管理
- 设置界面定义
- Ribbon 图标注册
- 聊天视图注册

**关键方法：**
```typescript
async onload()           // 插件加载时调用
async onunload()         // 插件卸载时调用
loadSettings()           // 加载设置
saveSettings()           // 保存设置
getActiveFile()          // 获取当前活动文件
```

**设置项：**
```typescript
interface IFlowSettings {
    port: number;              // iFlow CLI 端口（默认 8080）
    timeout: number;           // 连接超时（默认 5000ms）
    excludedTags: string[];    // 排除的标签
    enableAutoScroll: boolean; // 自动滚动（默认 true）
}
```

### 2. `src/chatView.ts` - 聊天视图

**功能：**
- 聊天 UI 渲染
- 消息发送和接收
- 流式响应处理
- 会话管理 UI
- 自动滚动控制

**核心变量：**
```typescript
private messages: { role: string; content: string; id: string }[];  // 消息列表
private currentMessage = '';           // 当前流式消息内容
private isStreaming = false;           // 流式传输状态
private currentConversationId: string; // 当前会话 ID
private streamingTimeout: NodeJS.Timeout; // 超时保护
```

**关键方法：**
```typescript
sendMessage()              // 发送消息（处理流式响应）
addMessage()              // 添加消息到 UI
updateMessage()           // 更新流式消息
scrollToBottom()          // 滚动到底部
loadMessagesFromConversation()  // 从会话加载消息
createNewConversation()   // 创建新会话
onConversationChange()    // 会话变化回调
```

**流式响应处理流程：**
```
sendMessage()
  → 检查 isStreaming 状态（强制重置）
  → 添加用户消息到 UI
  → 设置超时保护（60秒）
  → 调用 iflowService.sendMessage()
    → onChunk: 更新当前消息 + 滚动
    → onEnd: 保存消息到会话 + 重置状态
    → onError: 显示错误
```

### 3. `src/iflowService.ts` - iFlow CLI 服务

**功能：**
- WebSocket 连接管理
- ACP 协议处理（JSON-RPC 2.0）
- 消息发送和接收
- 模型/模式/思考设置

**核心类：**
```typescript
class AcpProtocol          // ACP 协议封装
class IFlowService         // iFlow 服务主类
```

**ACP 协议流程：**
```
1. WebSocket 连接
2. initialize (初始化)
3. authenticate (认证，如果需要)
4. session/new (创建会话)
5. session/prompt (发送提示)
6. session/update (接收流式更新)
```

**关键方法：**
```typescript
connect()                 // 连接到 iFlow CLI
checkConnection()         // 检查连接状态
sendMessage()             // 发送消息（支持流式）
on() / off()              // 事件监听器管理
```

**事件类型：**
```typescript
type: 'stream'  // 流式内容
type: 'tool'    // 工具调用
type: 'error'   // 错误
type: 'end'     // 完成
```

**重要修复（v0.5.2）：**
```typescript
// 当 stopReason 为 'end_turn' 时触发 onEnd
if (result?.stopReason === 'end_turn' || result?.stopReason === 'max_turns') {
    this.messageHandlers.forEach(handler => handler({
        type: 'end',
    }));
}
```

### 4. `src/conversationStore.ts` - 会话存储

**功能：**
- localStorage 持久化
- 会话 CRUD 操作
- 订阅/通知机制

**数据结构：**
```typescript
interface Conversation {
    id: string;
    title: string;
    createdAt: number;
    updatedAt: number;
    messages: Message[];
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}
```

**关键方法：**
```typescript
createConversation()      // 创建新会话
deleteConversation()      // 删除会话
switchConversation()      // 切换会话
addUserMessage()          // 添加用户消息
addAssistantMessage()     // 添加助手消息
subscribe()               // 订阅变化
notify()                  // 通知订阅者
```

**存储格式：**
```json
{
  "currentConversationId": "conv-123",
  "conversations": [
    {
      "id": "conv-123",
      "title": "My Chat",
      "createdAt": 1234567890,
      "updatedAt": 1234567890,
      "messages": [...]
    }
  ]
}
```

### 5. `src/styles.css` - 样式文件

**样式组织：**
```css
/* 变量定义 */
:root { --iflow-brand: #7c4dff; ... }

/* 顶部栏 */
.iflow-top-bar { ... }

/* 消息区域 */
.iflow-messages { ... }

/* 单个消息 */
.iflow-message { ... }

/* 输入区域 */
.iflow-input-container { ... }
```

**关键样式：**
```css
.iflow-messages {
    flex: 1;
    overflow-y: auto;
    scroll-behavior: smooth;  /* 平滑滚动 */
    display: flex;
    flex-direction: column;
    gap: 12px;
}
```

---

## 开发流程

### 1. 环境准备

```bash
# 安装依赖
npm install

# 开发模式（自动编译）
npm run dev
```

### 2. 修改代码

**开发流程：**
1. 修改 `src/` 目录下的源码
2. 使用 `npm run dev` 自动编译
3. 在 Obsidian 中重新加载插件
4. 测试功能

**文件监控：**
- `esbuild.config.mjs` 配置了文件监控
- 修改后自动重新编译 `main.js`

### 3. 调试技巧

**Obsidian 控制台：**
```
Ctrl/Cmd + Shift + I → 打开开发者工具
Console → 查看日志
```

**关键日志点：**
```typescript
// 聊天视图
console.log('[iFlow Chat] sendMessage called', { content, isStreaming });
console.log('[iFlow Chat] onEnd called');

// iFlow 服务
console.log('[iFlow] Received message:', data);
console.log('[iFlow] Stream complete (end_turn)');

// 会话存储
console.log('[Conversation Store] State updated');
```

**常见调试场景：**

1. **消息未保存：**
   - 检查 `onEnd` 是否被调用
   - 检查 `isStreaming` 状态
   - 查看 `conversationStore.addAssistantMessage()`

2. **流式响应中断：**
   - 检查 WebSocket 连接状态
   - 查看 `onChunk` 回调
   - 检查 `stopReason` 处理

3. **UI 不更新：**
   - 检查 `messagesContainer` 引用
   - 确认 DOM 更新时机
   - 使用 `requestAnimationFrame` 处理异步

---

## 发布流程

### 方法一：通过 BRAT 发布（推荐）

```bash
# 1. 更新版本号
# 编辑 manifest.json 和 package.json

# 2. 构建插件
npm run build

# 3. 提交到 Git
git add -A
git commit -m "feat: your message"
git push origin main

# 4. 创建 GitHub Release
gh release create v0.x.x main.js manifest.json styles.css \
  --title "v0.x.x" \
  --notes "Release notes here"

# 5. 用户通过 BRAT 更新
```

### 方法二：手动发布

```bash
# 1. 构建插件
npm run build

# 2. 复制文件到 Obsidian 插件目录
cp main.js ~/.obsidian/plugins/iflow-for-obsidian/
cp manifest.json ~/.obsidian/plugins/iflow-for-obsidian/
cp styles.css ~/.obsidian/plugins/iflow-for-obsidian/

# 3. 在 Obsidian 中重新加载插件
```

### 版本号规范

遵循语义化版本（Semver）：
- **MAJOR.MINOR.PATCH**
  - MAJOR: 不兼容的 API 变更
  - MINOR: 向后兼容的功能新增
  - PATCH: 向后兼容的问题修复

示例：
```json
{
  "version": "0.5.3"  // MAJOR.MINOR.PATCH
}
```

---

## 常见问题

### Q1: BRAT 提示 "no manifest.json file"

**原因：** Release 中缺少 manifest.json 文件

**解决：**
```bash
# 确保创建 release 时包含所有文件
gh release create v0.x.x main.js manifest.json styles.css
```

### Q2: 消息发送后丢失

**原因：** `onEnd` 回调未触发，`isStreaming` 状态未重置

**解决：** 确保 `iflowService.ts` 中正确处理 `stopReason`
```typescript
if (result?.stopReason === 'end_turn' || result?.stopReason === 'max_turns') {
    this.messageHandlers.forEach(handler => handler({ type: 'end' }));
}
```

### Q3: 自动滚动不工作

**原因：** DOM 更新是异步的，滚动时机不对

**解决：** 使用 `requestAnimationFrame` 和 `setTimeout`
```typescript
private scrollToBottom(): void {
    requestAnimationFrame(() => {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    });
    setTimeout(() => {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }, 10);
}
```

### Q4: WebSocket 连接失败

**原因：** iFlow CLI 未启动或端口不正确

**解决：**
1. 确认 iFlow CLI 正在运行
2. 检查端口设置（默认 8080）
3. 查看防火墙设置

### Q5: 第二次消息无法发送

**原因：** `isStreaming` 状态未重置

**解决：** 添加强制重置机制
```typescript
if (this.isStreaming) {
    console.warn('[iFlow Chat] Force reset');
    this.isStreaming = false;
}
```

### Q6: 消息在流式传输期间消失

**原因：** `onConversationChange` 在流式传输时清空了消息容器

**解决：** 添加流式传输检查
```typescript
private onConversationChange(): void {
    if (this.isStreaming) {
        console.log('[iFlow Chat] Skipping reload during streaming');
        this.updateConversationUI();  // 只更新元数据
        return;
    }
    // 正常重新加载...
}
```

---

## 代码规范

### TypeScript 规范

```typescript
// 1. 使用明确的类型
interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

// 2. 使用可选链
const title = conversation?.title ?? 'New Chat';

// 3. 使用 nullish coalescing
const timeout = settings.timeout ?? 5000;

// 4. 私有方法使用 private
private sendMessage(): void { ... }

// 5. 异步方法使用 async/await
async connect(): Promise<void> { ... }
```

### 命名规范

```typescript
// 类名：PascalCase
class IFlowService { ... }

// 方法名：camelCase
sendMessage() { ... }
loadMessages() { ... }

// 常量：UPPER_SNAKE_CASE
const VIEW_TYPE_IFLOW_CHAT = 'iflow-chat-view';

// 私有变量：camelCase
private currentMessage = '';
```

### 注释规范

```typescript
/**
 * 发送消息到 iFlow CLI
 * @param content - 消息内容
 * @param options - 可选参数（模型、模式等）
 */
async sendMessage(options: SendMessageOptions): Promise<void> {
    // 实现代码
}

// 单行注释说明关键逻辑
// 强制重置流式状态，防止卡死
if (this.isStreaming) {
    this.isStreaming = false;
}
```

---

## 调试技巧

### 1. 使用 Source Map

在 `tsconfig.json` 中启用：
```json
{
  "compilerOptions": {
    "sourceMap": true
  }
}
```

在 `esbuild.config.mjs` 中启用：
```javascript
await context.rebuild();
```

### 2. 条件断点

在 Chrome DevTools 中：
```javascript
// 条件断点
content === 'test'  // 只有当 content 为 'test' 时才停止

// 日志断点
console.log('Current message:', this.currentMessage)
```

### 3. 性能分析

```typescript
console.time('sendMessage');
// ... 代码
console.timeEnd('sendMessage');
```

### 4. 网络监控

在 Network 标签页中：
- 筛选 WS (WebSocket)
- 查看 WebSocket frames
- 检查消息格式

### 5. 状态检查

```typescript
// 在关键位置添加状态检查
console.log('[DEBUG] State:', {
    isStreaming: this.isStreaming,
    currentConversationId: this.currentConversationId,
    messagesCount: this.messages.length
});
```

---

## 参考资源

### 官方文档

- [Obsidian Plugin API](https://github.com/obsidianmd/obsidian-api)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [iFlow CLI Documentation](https://iflow.cli.com)

### 参考项目

- [Claudian](https://github.com/YishenTu/claudian) - Obsidian Claude 插件
- [Obsidian Sample Plugin](https://github.com/obsidianmd/obsidian-sample-plugin)

### 工具

- [esbuild](https://esbuild.github.io/) - 快速打包工具
- [BRAT](https://github.com/TfTHacker/obsidian42-brat) - Beta 插件自动更新
- [GitHub CLI](https://cli.github.com/) - 命令行 GitHub 工具

---

## 贡献指南

欢迎贡献代码！

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: add some amazing feature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### Commit Message 规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

```
feat: 新功能
fix: 问题修复
docs: 文档更新
style: 代码格式（不影响功能）
refactor: 代码重构
perf: 性能优化
test: 测试相关
chore: 构建/工具相关
```

---

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

**最后更新：** 2026-03-06
**版本：** v0.5.3
