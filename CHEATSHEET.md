# iFlow for Obsidian - 快速参考指南

## 🚀 常用命令

### 开发命令
```bash
# 安装依赖
npm install

# 开发模式（自动编译）
npm run dev

# 生产构建
npm run build

# 类型检查
npx tsc --noEmit
```

### Git 命令
```bash
# 查看状态
git status

# 提交更改
git add -A
git commit -m "feat: your message"

# 推送到远程
git push origin main

# 创建 Release
gh release create v0.x.x main.js manifest.json styles.css \
  --title "v0.x.x" \
  --notes "Release notes"
```

### 发布流程
```bash
# 1. 更新版本号
vim manifest.json  # 修改 version
vim package.json   # 修改 version

# 2. 构建
npm run build

# 3. 提交
git add -A
git commit -m "feat: your changes"
git push

# 4. 发布
gh release create v0.x.x main.js manifest.json styles.css \
  --title "v0.x.x" \
  --notes "描述你的更新"
```

---

## 📂 文件结构速查

```
src/
├── main.ts              # 插件入口、设置管理
├── chatView.ts          # 聊天 UI、消息处理 ⭐核心
├── iflowService.ts      # WebSocket 通信 ⭐核心
├── conversationStore.ts # 会话存储
└── styles.css           # 样式文件
```

---

## 🔧 常用代码片段

### 1. 添加新设置项

**src/main.ts:**
```typescript
interface IFlowSettings {
    existingSetting: string;
    newSetting: boolean;  // 添加新设置
}

const DEFAULT_SETTINGS: IFlowSettings = {
    existingSetting: 'default',
    newSetting: true,  // 默认值
};
```

**设置界面中添加：**
```typescript
new Setting(containerEl)
    .setName('新设置名称')
    .setDesc('设置描述')
    .addToggle(toggle => toggle
        .setValue(this.plugin.settings.newSetting)
        .onChange(async (value) => {
            this.plugin.settings.newSetting = value;
            await this.plugin.saveSettings();
        }));
```

### 2. 添加新消息类型

**src/chatView.ts:**
```typescript
private addSystemMessage(content: string): void {
    const id = Date.now().toString();
    const messageEl = this.messagesContainer.createDiv({
        cls: 'iflow-message iflow-message-system',
    });
    messageEl.dataset.id = id;

    const contentEl = messageEl.createDiv({ cls: 'iflow-message-content' });
    contentEl.innerHTML = this.formatMessage(content);
}
```

**src/styles.css:**
```css
.iflow-message-system {
    background: var(--background-secondary);
    border-left: 3px solid var(--iflow-brand);
}
```

### 3. 修改消息渲染

**src/chatView.ts - formatMessage():**
```typescript
private formatMessage(content: string): string {
    return content
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        // 代码块
        .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
        // 行内代码
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // 粗体
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        // 斜体
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        // 链接
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
        // 换行
        .replace(/\n/g, '<br>');
}
```

### 4. 添加键盘快捷键

**src/chatView.ts - onOpen():**
```typescript
this.registerEvent(
    this.app.scope.register(['Mod'], 'Key', () => {
        // Cmd/Ctrl + K 处理
        console.log('Shortcut triggered');
    })
);
```

### 5. 添加右键菜单

**src/chatView.ts:**
```typescript
private addContextMenu(messageEl: HTMLElement, messageId: string): void {
    messageEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const menu = new Menu();

        menu.addItem((item) => {
            item.setTitle('复制')
                .setIcon('copy')
                .onClick(() => {
                    navigator.clipboard.writeText(content);
                });
        });

        menu.addItem((item) => {
            item.setTitle('删除')
                .setIcon('trash')
                .onClick(() => {
                    this.deleteMessage(messageId);
                });
        });

        menu.showAtPosition({ x: e.clientX, y: e.clientY });
    });
}
```

---

## 🐛 快速修复

### 问题：消息未保存

**检查清单：**
1. ✅ `onEnd` 回调被调用？
2. ✅ `isStreaming` 被重置为 `false`？
3. ✅ `conversationStore.addAssistantMessage()` 被调用？

**快速修复：**
```typescript
// src/iflowService.ts - line ~450
if (result?.stopReason === 'end_turn' || result?.stopReason === 'max_turns') {
    console.log('[iFlow] Prompt completed with stopReason:', result.stopReason);
    this.messageHandlers.forEach(handler => handler({ type: 'end' }));
}
```

### 问题：无法发送第二条消息

**症状：** 点击发送按钮无反应

**快速修复：**
```typescript
// src/chatView.ts - sendMessage()
// 添加强制重置
if (this.isStreaming) {
    console.warn('[iFlow Chat] Force reset');
    this.isStreaming = false;
}
```

### 问题：滚动不工作

**快速修复：**
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

### 问题：消息在流式传输时消失

**快速修复：**
```typescript
private onConversationChange(): void {
    if (this.isStreaming) {
        console.log('Skipping reload during streaming');
        return;  // 不重新加载
    }
    // 正常加载...
}
```

---

## 📊 调试日志

### 启用详细日志

**src/chatView.ts:**
```typescript
// 在关键位置添加日志
console.log('[iFlow Chat] Debug info:', {
    isStreaming: this.isStreaming,
    currentConversationId: this.currentConversationId,
    messagesCount: this.messages.length,
    currentMessageLength: this.currentMessage.length
});
```

**src/iflowService.ts:**
```typescript
// 日志所有 WebSocket 消息
console.log('[iFlow] Received:', trimmed.substring(0, 200));

// 日志流式完成
console.log('[iFlow] Stream complete, stopReason:', result.stopReason);
```

### 过滤日志

```javascript
// 在浏览器控制台中
// 只显示 iFlow 相关日志
// 在 Filter 中输入: iFlow

// 只显示错误
// 在 Filter 中输入: Error

// 只显示特定类型
// 在 Filter 中输入: "iFlow Chat"
```

---

## 🎨 样式修改

### 修改主题色

**src/styles.css:**
```css
:root {
    --iflow-brand: #7c4dff;         /* 主色 */
    --iflow-brand-rgb: 124, 77, 255; /* RGB 值 */
}
```

### 修改消息样式

```css
/* 用户消息 */
.iflow-message-user {
    background: var(--background-primary-alt);
    align-items: flex-end;
}

/* 助手消息 */
.iflow-message-assistant {
    background: transparent;
}
```

### 修改滚动条样式

```css
.iflow-messages::-webkit-scrollbar {
    width: 8px;  /* 宽度 */
}

.iflow-messages::-webkit-scrollbar-thumb {
    background: var(--background-modifier-border);
    border-radius: 4px;
}
```

---

## 🔍 常用查找命令

### Grep 搜索
```bash
# 在源码中搜索
grep -r "sendMessage" src/

# 搜索特定函数
grep -n "scrollToBottom" src/chatView.ts

# 搜索样式定义
grep -n "\.iflow-" src/styles.css | head -20
```

### 查看 Git 历史
```bash
# 查看最近 5 次提交
git log --oneline -5

# 查看特定文件的更改
git log --oneline src/chatView.ts

# 查看某次提交的详情
git show <commit-hash>
```

---

## 📝 Commit Message 模板

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type（类型）
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试
- `chore`: 构建/工具

### 示例

```
feat(chat): add message copy functionality

- Add copy button to each message
- Support markdown format copying
- Add toast notification on copy

Closes #123
```

---

## 🚨 紧急修复流程

当发现严重 bug 需要快速修复时：

```bash
# 1. 创建修复分支
git checkout -b fix/hotfix-branch

# 2. 快速修复
vim src/chatView.ts

# 3. 测试
npm run build
# 在 Obsidian 中测试

# 4. 提交
git add -A
git commit -m "fix: urgent bug fix"
git push origin fix/hotfix-branch

# 5. 合并到 main
git checkout main
git merge fix/hotfix-branch

# 6. 立即发布
npm run build
gh release create v0.x.y main.js manifest.json styles.css \
  --title "v0.x.y" \
  --notes "紧急修复：..."
```

---

## 💡 性能优化建议

### 1. 减少不必要的重新渲染

```typescript
// ❌ 不好：每次都清空重建
this.messagesContainer.empty();
messages.forEach(msg => this.addMessageToUI(msg));

// ✅ 好：只更新变化的部分
const existingEl = this.messagesContainer.querySelector(`[data-id="${id}"]`);
if (existingEl) {
    this.updateMessageElement(existingEl, content);
} else {
    this.addMessageToUI(role, content, id);
}
```

### 2. 使用防抖

```typescript
import { debounce } from 'obsidian';

private debouncedScroll = debounce(() => {
    this.scrollToBottom();
}, 100);
```

### 3. 懒加载会话

```typescript
// 只在需要时加载消息
async loadMessages(conversationId: string): Promise<void> {
    if (this.loadedConversations.has(conversationId)) {
        return; // 已加载
    }
    // 加载消息...
    this.loadedConversations.add(conversationId);
}
```

---

## 📚 外部资源

- [Obsidian API 文档](https://github.com/obsidianmd/obsidian-api)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)
- [Claudian 参考](https://github.com/YishenTu/claudian)
- [BRAT 文档](https://github.com/TfTHacker/obsidian42-brat)

---

**提示：** 将此文件添加到浏览器书签，方便快速查阅！
