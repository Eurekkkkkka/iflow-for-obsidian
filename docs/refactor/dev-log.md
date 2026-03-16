# 模块化开发 TDD 日志

## 记录规范

- 每个模块任务按 TDD 三阶段记录：Red -> Green -> Refactor。
- 每次记录至少包含：目标、测试、实现、结果、风险与后续。

---

## 2026-03-12 任务记录

### 模块任务 1：messageRenderer 抽离与接入

- 目标：将聊天消息格式化逻辑从 `src/chatView.ts` 抽离到 `src/ui/chat/messageRenderer.ts`。
- Red：新增 `tests/messageRenderer.test.ts`，验证 HTML 转义、代码块渲染、行内代码和粗体渲染。初次执行测试失败（模块不存在）。
- Green：实现 `escapeHtml`、`renderMessage`，并在 `src/chatView.ts` 用新模块替换原方法调用。
- Refactor：删除 `ChatView` 中重复的 `formatMessage` 和 `escapeHtml` 私有实现。
- 结果：对应测试通过，消息渲染行为保持一致。
- 风险与后续：后续若调整 markdown 规则，应优先在模块测试中新增案例再改实现。

### 模块任务 2：canvasFileAdapter 抽离与接入

- 目标：将 Canvas 文件检测与规范化逻辑从 `src/iflowService.ts` 抽离到 `src/infra/obsidian/canvasFileAdapter.ts`。
- Red：新增 `tests/canvasFileAdapter.test.ts`，验证扩展名判断、合法 JSON 保持、非法 JSON 兜底。初次执行测试失败（模块不存在）。
- Green：实现 `isCanvasFile`、`normalizeCanvasContent`、`generateBasicCanvas` 并在 `src/iflowService.ts` 接入。
- Refactor：保留 `IFlowService` 兼容方法，内部委托至新模块，避免一次性改动过大。
- 结果：对应测试通过，构建通过，Canvas 写入路径不变。
- 风险与后续：后续可继续提取 node/edge schema 校验为独立函数并增强测试覆盖。

### 模块任务 3：vaultPathResolver 抽离与接入

- 目标：把路径转换逻辑从 `src/iflowService.ts` 抽离到 `src/infra/obsidian/vaultPathResolver.ts`。
- Red：新增 `tests/vaultPathResolver.test.ts`，覆盖绝对路径、相对路径、前导斜杠处理。初次执行测试失败（模块不存在）。
- Green：实现 `toVaultRelativePath` 并在 `IFlowService.getAbsolutePath` 中委托调用。
- Refactor：保留旧方法签名，减少对调用点的影响。
- 结果：对应测试通过，文件工具路径转换行为保持一致。
- 风险与后续：Windows 盘符路径场景建议补充专门测试。

### 模块任务 4：storageQuotaPolicy 抽离与接入

- 目标：把会话存储配额常量和清理策略从 `src/conversationStore.ts` 抽离到 `src/domain/conversation/storageQuotaPolicy.ts`。
- Red：新增 `tests/storageQuotaPolicy.test.ts`，覆盖配额计算、阈值判定、会话清理逻辑。初次执行测试失败（模块不存在）。
- Green：实现 `calculateStorageQuotaInfo`、`cleanupOldConversations`，并在 `conversationStore` 中接入。
- Refactor：删除重复常量与本地清理实现，保留 `ConversationStore` 原有对外 API。
- 结果：对应测试通过，会话存储行为保持一致。
- 风险与后续：后续导入导出重构时需要补充与清理策略联动测试。

### 模块任务 5：conversationSelectorView 抽离与接入

- 目标：将会话列表中的筛选、排序、按日期分组、相对时间格式化逻辑从 `src/chatView.ts` 抽离到 `src/ui/chat/conversationSelectorView.ts`。
- Red：新增 `tests/conversationSelectorView.test.ts`，覆盖筛选排序、日期分组、时间标签格式化。初次执行测试失败（模块不存在）。
- Green：实现 `filterAndSortConversations`、`groupConversationsByDate`、`formatConversationTimeLabel` 并在 `src/chatView.ts` 中接入。
- Refactor：保持原 UI 渲染流程不变，仅替换纯逻辑来源，降低 `ChatView` 复杂度。
- 结果：对应测试通过，会话面板行为保持一致。
- 风险与后续：后续拆分 `conversationSelectorView` 的 DOM 渲染层时，需要补充交互测试（切换/删除/搜索联动）。

### 模块任务 6：imageAttachmentView 抽离与接入

- 目标：将图片附件类型判定、ID生成、名称截断、尺寸格式化等逻辑从 `src/chatView.ts` 抽离到 `src/ui/chat/imageAttachmentView.ts`。
- Red：新增 `tests/imageAttachmentView.test.ts`，覆盖扩展名识别、支持类型判断、尺寸格式化、ID生成。初次执行测试失败（模块不存在）。
- Green：实现 `getImageMediaType`、`isSupportedImageFile`、`generateImageAttachmentId`、`truncateImageName`、`formatImageSize` 并在 `src/chatView.ts` 接入。
- Refactor：删除 `ChatView` 中重复的图片辅助方法，保留文件读取与 DOM 交互逻辑在原位置，控制变更风险。
- 结果：对应测试通过，图片粘贴/拖拽附加行为保持一致。
- 风险与后续：后续可继续抽离 `setupImageDropAndPaste` 与预览渲染，形成完整 `imageAttachmentView` 组件。

### 模块任务 7：jsonRpcProtocol 抽离与接入

- 目标：将 ACP JSON-RPC 协议路由从 `iflowService` 内聚实现抽离到 `src/infra/acp/jsonRpcProtocol.ts`。
- Red：新增 `tests/jsonRpcProtocol.test.ts`，覆盖 request/response、server method 回调、pending 清理。初次执行失败（模块不存在）。
- Green：实现 `JsonRpcProtocol` 并在 `iflowService` 连接阶段替换原协议实例。
- Refactor：保留现有 `IFlowService` 外部 API，不改变调用方。
- 结果：测试通过，协议行为稳定。
- 风险与后续：后续可把连接生命周期进一步迁移到 `acpClient`。

### 模块任务 8：toolCallMapper 与 vaultFileBridge 拆分

- 目标：将 `session/update` 解释和文件工具桥接从 `iflowService` 中拆分。
- Red：新增 `tests/toolCallMapper.test.ts`，覆盖文本流、tool_use/tool_result、结束事件。初次执行失败（模块不存在）。
- Green：实现 `mapSessionUpdateToEvents` 与 `VaultFileBridge`，并将 `iflowService` 的通知解析与 `fs/read_text_file`/`fs/write_text_file` 委托至新模块。
- Refactor：保持工具协议返回结构与原行为兼容。
- 结果：测试通过，工具桥接链路构建通过。
- 风险与后续：后续可补充 bridge 层异常场景单测（路径异常、编码异常）。

### 模块任务 9：chatController / chatContextBuilder / promptComposer 接入

- 目标：把聊天发送链路的上下文构建与 prompt 组装模块化，并由控制器编排。
- Red：新增 `tests/promptComposer.test.ts`、`tests/chatController.test.ts`。初次执行失败（模块不存在）。
- Green：实现 `buildChatContext`、`composePrompt`、`ChatController`，在 `chatView` 的发送流程中接入控制器。
- Refactor：`iflowService.sendMessage` 支持 `promptOverride`，以兼容控制器侧策略组装。
- 结果：测试通过，发送主链路保持可用，构建通过。
- 风险与后续：后续可继续把消息列表与工具视图 DOM 逻辑完全迁移到 `messageListView/toolCallView`。

### 模块任务 10：conversationRepository / conversationService / conversationExportService 落地

- 目标：补齐会话领域分层模块，并将导出逻辑从 store 中委托到导出服务。
- Red：新增 `tests/conversationDomain.test.ts`，覆盖创建/切换/消息追加/Markdown 导出。初次执行失败（模块不存在）。
- Green：实现 `InMemoryConversationRepository`、`ConversationService`、`conversationExportService`，并在 `conversationStore` 中改为委托导出服务。
- Refactor：保持 `ConversationStore` 原有对外接口不变，避免现有调用点回归。
- 结果：测试通过，导出行为与原实现一致。
- 风险与后续：下一步可将 `chatView` 对 `ConversationStore` 的直接依赖收敛到 `ConversationService`。

---

## 本轮阶段结论

- TDD 状态：已完成一轮 Red -> Green -> Refactor。
- 新增测试：11 个测试文件，31 个测试全部通过。
- 工程校验：`npm run build` 通过。
- 当前已完成模块任务：10（按文档顺序完成任务A~F的核心模块落地与关键链路接入）。

---

## 2026-03-13 任务记录

### 任务 C 补齐：iflowService 死代码清理

- 目标：删除 `src/iflowService.ts` 中 ~230 行已被模块化替代的死代码。
- 清理内容：移除 `AcpProtocol` 类（108-232行）、重复接口定义（CanvasNode/CanvasEdge/CanvasData/JsonRpcRequest/JsonRpcResponse/JsonRpcNotification）、死代码私有方法（getAbsolutePath/isCanvasFile/generateBasicCanvas/generateId/normalizeCanvasContent）、无用 import（canvasFileAdapter 函数、toVaultRelativePath）。
- 修复：添加 `import { type JsonRpcNotification }` 从 jsonRpcProtocol；将 `notification.params` 转型为 `Record<string, any>` 以修复 TS2339。
- 结果：34 测试通过，构建通过。

### 任务 E 补齐：messageListView.loadConversation

- 目标：为 `MessageListView` 添加 `loadConversation(messages)` 方法，按规格文档要求支持批量加载。
- Red：在 `tests/messageListView.test.ts` 添加测试，调用 `loadConversation` 并断言先清空再重建 DOM 节点。初次执行失败（方法不存在）。
- Green：在 `messageListView.ts` 实现 `loadConversation`：先 `container.empty()`，再遍历调用 `appendMessage`。
- Refactor：在 `chatView.ts` 的 `loadMessagesFromConversation` 中使用 `messageListView.loadConversation()` 替代手动循环。
- 结果：3/3 messageListView 测试通过，构建通过。

### 任务 F-1：LocalStorageConversationRepository

- 目标：实现持久化 Repository，替代 InMemoryConversationRepository 在生产环境中使用。
- Red：在 `tests/conversationDomain.test.ts` 添加 localStorage 持久化和 vault 路径隔离测试。初次执行失败。
- Green：实现 `StorageAdapter` 接口（可注入 mock）和 `LocalStorageConversationRepository` 类，支持 vault 路径哈希隔离、版本化存储、load/save 生命周期。
- 结果：7/7 conversationDomain 测试通过。

### 任务 F-2：ConversationService 方法补齐

- 目标：补齐 `deleteConversation`、`updateConversationSettings`、`getConversationMessages`、`subscribe` 方法。
- Red：在 `tests/conversationDomain.test.ts` 添加 delete/updateSettings/getMessages 测试。初次执行失败。
- Green：在 `conversationService.ts` 实现所有缺失方法。
- 结果：7/7 conversationDomain 测试通过。

### 任务 F-3 + B 集成 + E 集成：chatView.ts 综合重构

- 目标：将 `chatView.ts` 从全能类瘦身为装配层，完成三大集成。
- 变更内容：
  1. **imports 替换**：移除 `ConversationStore` 直接导入，改为 `ConversationService` + `LocalStorageConversationRepository`；新增 `MessageListView`、`ToolCallView`、imageAttachmentView 辅助函数导入。
  2. **类字段替换**：`conversationStore: ConversationStore` → `conversationService: ConversationService` + `messageListView: MessageListView` + `toolCallView: ToolCallView`。
  3. **构造函数**：改为创建 `LocalStorageConversationRepository` → `ConversationService`，订阅 `conversationService`。
  4. **onOpen**：初始化 `MessageListView`（注入 RoleLabels）和 `ToolCallView`（注入 ToolCallLabels）。
  5. **消息渲染委托**：`addMessage` / `updateMessage` 委托给 `messageListView`；`showLoadingAnimation` / `hideLoadingAnimation` 委托给 `messageListView.showLoading/hideLoading`；`showOrUpdateToolCall` 委托给 `toolCallView.showOrUpdate`；`scrollToBottom` 委托给 `messageListView.scrollToBottom`。
  6. **死代码删除**：移除 `formatMessage`（~65行）、`escapeHtml`（6行）、`addMessageToUI`（10行）——共 ~80 行内联渲染代码。
  7. **图片方法委托**：`isImageFile` → `isSupportedImageFile`；`getMediaType` → `getImageMediaType`；`generateImageId` → `generateImageAttachmentId`；`truncateName` → `truncateImageName`；`formatSize` → `formatImageSize`。移除内联 `IMAGE_EXTENSIONS` 常量和类型定义（改为 re-export from imageAttachmentView）。
  8. **会话方法迁移**：所有 10+ 处 `this.conversationStore.xxx` 调用替换为 `this.conversationService.xxx`（含方法名映射 `addUserMessage` → `appendUserMessage`、`addAssistantMessage` → `appendAssistantMessage`）。
  9. **loadMessagesFromConversation**：使用 `messageListView.loadConversation()` 替代手动 `addMessageToUI` 循环。
- 结果：14个测试文件、43个测试全部通过（含新增 `chatContextBuilder.test.ts` 3个测试），构建通过。
- 文件瘦身：从 1507 行减至 ~1290 行（净减 ~217 行）。

### 任务 E 补齐：chatContextBuilder 测试

- 目标：为 `buildChatContext` 添加单元测试，覆盖无文件、正常文件和排除标签三种场景。
- Red：创建 `tests/chatContextBuilder.test.ts`，使用依赖注入 mock 全部外部依赖。
- Green：3/3 测试通过。
- 结果：chatContextBuilder 模块测试覆盖完整。

---

## 2026-03-13 Bug 修复记录

### Bug 1：侧边栏按钮无法收起（toggle 缺失）

- **问题**：点击 Ribbon 按钮只会一直调用 `workspace.revealLeaf()`，无法通过再次点击收起侧边栏。
- **根因**：`activateView()` 在 leaf 已存在时直接跳到 `revealLeaf(leaf)`，没有任何收起逻辑。
- **Red**：新增 `tests/viewUtils.test.ts`，测试 `shouldCollapseView(hasLeaf, sidebarCollapsed, forceOpen)` 的 4 种场景。初次执行失败（模块不存在）。
- **Green**：创建 `src/app/viewUtils.ts`，实现 `shouldCollapseView`(当 `hasLeaf && !sidebarCollapsed && !forceOpen` 时返回 true)。4/4 测试通过。
- **Refactor**：
  1. 修改 `activateView(forceOpen = false)` 接受可选参数；leaf 存在时通过 `shouldCollapseView` 判断 collapse 或 reveal。
  2. Ribbon 按钮调用 `activateView()`（默认 `forceOpen=false`，实现 toggle）。
  3. `onLayoutReady` 和命令调用 `activateView(true)`（强制展开，不触发收起）。
- **结果**：50/50 测试通过，构建通过。

### Bug 2：Windows 下弹出 CLI 黑框

- **问题**：插件启动时调用 `startSdk()`，会弹出可见的 Windows 命令提示符窗口。
- **根因**：
  1. 旧代码通过 `cmd.exe /c "iflow ..."` 间接启动；`windowsHide:true` 仅作用于 cmd.exe 本身，iflow 作为其子进程会自行 `AllocConsole()` 创建新控制台窗口。
  2. `detached:true` 下未调用 `unref()`，导致进程未真正后台化。
- **Red**：新增 `tests/sdkSpawnOptions.test.ts`，测试 `buildSdkSpawnOptions(platform)` 在 Win32/Linux 下的 shell/windowsHide/detached 三个字段。初次执行失败（模块不存在）。
- **Green**：创建 `src/app/sdkSpawnOptions.ts`，实现 `buildSdkSpawnOptions`：Windows 返回 `{detached:true, shell:true, windowsHide:true}`；其他平台返回 `{detached:true, shell:false, windowsHide:false}`。3/3 测试通过。
- **Refactor**：
  1. `startSdk()` 改为直接 spawn `iflow`（不再经过 cmd.exe 包装）；`windowsHide:true` 直接作用于 iflow 进程本身，彻底抑制控制台窗口。
  2. 添加 `stdio: 'ignore'`，防止控制台继承。
  3. 调用 `this.sdkProcess.unref()`，允许 Obsidian 关闭而 SDK 继续后台运行。
- **结果**：50/50 测试通过，构建通过。

---

## 本轮阶段结论（第三轮·Bug 修复）

- TDD 状态：Red → Green → Refactor 完整执行。
- 新增测试：2 个测试文件（viewUtils: 4 tests，sdkSpawnOptions: 3 tests），共 +7 tests。
- 累计：16 个测试文件，50 个测试全部通过。
- 工程校验：`npm run build` 通过。
- 新增模块：
  - `src/app/viewUtils.ts` — 侧边栏 toggle 逻辑纯函数
  - `src/app/sdkSpawnOptions.ts` — 跨平台 SDK 启动参数构建


- TDD 状态：已完成第二轮 Red -> Green -> Refactor。
- 新增测试：14 个测试文件，43 个测试全部通过。
- 工程校验：`npm run build` 通过。
- 当前已完成：
  - 任务 A ✅ 完成
  - 任务 B ✅ 完成（模块落地 + chatView 集成）
  - 任务 C ✅ 完成（iflowService 死代码清理）
  - 任务 D ✅ 完成
  - 任务 E ✅ 完成（chatController/chatContextBuilder/promptComposer + loadConversation + 测试）
  - 任务 F ✅ 完成（LocalStorageConversationRepository + ConversationService 补齐 + chatView 迁移）
- chatView.ts 已从"全能类"瘦身为装配层，所有 UI 渲染、协议交互、会话领域逻辑均委托至专职模块。

---

## 2026-03-13 任务记录（第四轮·Windows 隐式启动落地）

### 任务：按改进文档落地 Windows 下“必定不弹 node/cmd 窗口”方案

- 目标：不改变 ACP 协议与业务链路，仅替换 Windows 启动路径，确保后台隐式启动 iFlow ACP Server。
- 背景：此前 `spawn('iflow', ...)` 在 Windows 上仍可能经由 npm shim（`iflow.ps1/iflow.cmd`）拉起 `node.exe`，造成可见窗口。

### Red

- 新增 `tests/windowsIflowLauncher.test.ts`（4个用例）：
  1. 存在 sibling `node.exe` 时优先使用。
  2. 无 sibling `node.exe` 时回退系统 `node`。
  3. 缺失 `APPDATA` 时抛出明确错误。
  4. 缺失 CLI `entry.js` 时抛出明确错误。
- 首次执行失败：模块 `src/app/windowsIflowLauncher.ts` 不存在（符合 Red 预期）。

### Green

- 新增 `src/app/windowsIflowLauncher.ts`：
  - 实现 `resolveWindowsIflowLaunch(port)`。
  - 通过 `APPDATA\\npm` 推导 `entry.js` 路径：
    `node_modules/@iflow-ai/iflow-cli/bundle/entry.js`。
  - 若存在 `APPDATA\\npm\\node.exe`，优先使用该可执行；否则回退 `node`。
  - 统一生成 ACP 参数：`--experimental-acp --port <port> --stream`。
- 修复 TS 兼容：Node 内置模块导入改为 `import * as path/fs`。
- `tests/windowsIflowLauncher.test.ts`：4/4 通过。

---

## 2026-03-14 Phase 4 — 思考流与工具展示优化

### 任务范围

按 `开发文档00.md §4 任务4.2–4.7` 完整执行 TDD：将 `agent_thought_chunk` 与 `agent_message_chunk` 分离渲染，并将完成态工具调用自动折叠。

### 任务 4.2 — ToolCallMapper 思考流分离（TDD Red→Green）

**问题根因：** `mapSessionUpdateToEvents()` 中 `agent_thought_chunk` 与 `agent_message_chunk` 均映射到 `{ type: 'stream' }`，导致 AI 的"思考内容"混入最终回答流。

**Red（测试先行）：** 在 `tests/toolCallMapper.test.ts` 新增 5 个用例：
1. `agent_thought_chunk` 映射到 `{ type: 'thought' }`，而非 `stream`。
2. `agent_message_chunk` 仍映射到 `{ type: 'stream' }`。
3. `thought` 与 `stream` 事件类型不能相同。
4. `agent_turn_end` 只发出 `end`，不污染 thought/stream。
5. `tool_result` 错误状态正确映射。

确认 2 条失败（Red 验证通过）。

**Green（最小实现）：**
- `src/iflowService.ts`：`IFlowMessage.type` 联合类型新增 `'thought'`；`SendMessageOptions` 新增 `onThought?: (chunk: string) => void`；`sendMessage()` 注册 `thought` 事件监听。
- `src/features/chat/toolCallMapper.ts`：提取 `extractText()` 私有辅助函数；`agent_thought_chunk` 分支提前返回 `[{ type: 'thought', content }]`，不再触及 stream/end/tool 逻辑。

结果：**70 个测试全部通过**（新增 5 条）。

### 任务 4.3+4.4 — MessageListView 思考块展示（TDD Red→Green）

**Red（测试先行）：** 扩展 `tests/messageListView.test.ts`，新增 6 个用例（同时重写 mock 为支持嵌套 `querySelector` 的功能性 mock）：
1. `showThought(id, content)` 在消息内创建 `.iflow-thought-block`。
2. `showThought` 正确设置初始 `innerHTML`。
3. `updateThought(id, content)` 更新 `.iflow-thought-content`。
4. 思考内容不出现在 `.iflow-message-content` 主体区域。
5. `finalizeThought(id)` 为 `.iflow-thought-block` 添加 `iflow-thought-collapsed` class。
6. 消息 ID 不存在时 `showThought` 不抛出异常。

确认 6 条失败（Red 验证通过）。

**Green（实现）：** `src/ui/chat/messageListView.ts` 新增三个方法：
- `showThought(messageId, content)`：若无思考块则创建（包含 toggle 按钮 + content div），并设置初始内容。
- `updateThought(messageId, content)`：更新 `.iflow-thought-content` 的 `innerHTML`。
- `finalizeThought(messageId)`：为思考块添加 `iflow-thought-collapsed` class，使其流结束后自动折叠。

**chatView 集成（`src/chatView.ts`）：**
- 新增 `private currentThought = ''` 状态字段。
- `cleanup()` 函数中增加 `this.currentThought = ''` 重置。
- `sendMessage()` 的 `iflowService.sendMessage()` 调用中增加 `onThought` 回调：累积 chunk → 调用 `messageListView.showThought()`（幂等）。
- `onEnd` 中增加 `messageListView.finalizeThought(assistantMsgId)` 调用，流结束后自动折叠思考块。

**CSS（`src/styles.css`）：** 新增思考块样式：
- `.iflow-thought-block`：紫色左边框，半透明背景，圆角。
- `.iflow-thought-toggle`：可点击标题行，`▼/▶` 状态指示。
- `.iflow-thought-content`：灰色文字，最大高度 400px，可滚动。
- `.iflow-thought-collapsed .iflow-thought-content { display: none }` 折叠逻辑。

结果：**76 个测试全部通过**（新增 6 条）。

### 任务 4.5 — ToolCallView 完成态自动折叠

**实现（`src/ui/chat/toolCallView.ts`）：** 在 `showOrUpdate()` 中，当 `tool.status === 'completed'` 时为工具容器添加 `iflow-tool-completed` class。

**CSS：** `.iflow-tool-call.iflow-tool-completed .iflow-tool-details { display: none }` 自动隐藏详情区；`.iflow-tool-header { cursor: pointer }` 保留视觉可点击提示。

### 任务 4.7 — 最终验证

- `npm run test:run`：**17 文件 / 76 测试** 全部通过 ✅
- `npm run build`：TypeScript 无错误，esbuild 构建干净 ✅


### Refactor

- 修改 `src/main.ts` 的 `startSdk()`：
  - Windows 分支不再使用 `spawn('iflow', ...)`。
  - 改为 `resolveWindowsIflowLaunch(port)` 后直接 `spawn(command, args, { shell:false, detached:true, windowsHide:true, stdio:'ignore' })`。
  - 保留 `unref()`、`checkConnection()`、Notice 提示、自动启动/重启命令等上层流程不变。
  - 非 Windows 分支保持现有 `iflow` 启动逻辑不变。

### 结果

- 构建：`npm run build` 通过。
- 全量测试：17 个测试文件，54 个测试全部通过。
- 功能影响面：仅 Windows 启动器路径解析与进程拉起方式，ACP WebSocket、聊天链路、会话链路无改动。

### 风险与后续

- 风险：极少数环境若 npm 全局目录非 `APPDATA\\npm`，可能导致 `entry.js` 解析失败。
- 后续建议：可增加“自定义 CLI 路径”设置项，作为企业环境/便携环境兜底。
---

## 2026-03-13 阶段优化任务记录（Phase 2 & Phase 3 并行）

根据 `docs/开发文档00.md` §4 实施顺序，阶段二（运行时反馈与上下文可见性）与阶段三（消息内容渲染与阅读质量）并行推进。

### 阶段三 Task 3.1：修复代码块语言标签

- 目标：代码块的语言标签改为 `data-lang` attribute 驱动，覆盖任意语言，移除原来仅支持少数语言的硬编码 CSS class selector。
- 实现：`messageRenderer.ts` 中为 `<pre>` 添加 `data-lang="${lang}"`；CSS 改为 `.iflow-code-block[data-lang]::before { content: attr(data-lang) }`。
- 测试：新增 `data-lang` 存在/不存在两个用例通过。
- 结果：测试通过，构建通过。

### 阶段三 Task 3.2：补 Markdown 表格支持

- 目标：解析模型输出的 Markdown 表格，生成可读的 `<table>` HTML，支持深浅主题。
- 实现：`messageRenderer.ts` 新增 `renderMarkdownTables()` 用多行正则匹配 header/separator/body，生成带 `iflow-table/iflow-th/iflow-td` 的语义化 HTML；`styles.css` 补充表格样式含奇偶行及主题适配。
- 测试：表格渲染、HTML 转义两个用例通过。
- 结果：测试通过，构建通过。
- 风险与后续：极端复杂表格（合并单元格）不在支持范围，后续按需扩展。

### 阶段三 Task 3.3：统一列表容器渲染

- 目标：消除孤立的 `<li>` 元素，将连续列表项包装进 `<ul>/<ol>` 容器，修复有序编号依赖 CSS counter 但无 `<ol>` 包裹的问题。
- 实现：`messageRenderer.ts` 新增 `wrapListItems()` 按行扫描列表项，自动插入 `<ul class="iflow-ul">/<ol class="iflow-ol">` 开关；CSS 补充容器规则。
- 测试：无序列表、有序列表、混合列表三个用例通过。
- 结果：测试通过，构建通过。

### 阶段三 Task 3.4：改进 Thinking 文本匹配

- 目标：支持标准 Markdown blockquote（`> text`）作为思考块，降低对特定文案格式的脆弱依赖；保留 `* Thinking...` 兼容模式。
- 实现：`renderMessage()` Pass 3 中新增 `^>\s+(.+)$` 正则，原 `\*\s*(Thinking.+)` 保留。
- 测试：blockquote 匹配、Legacy 模式、普通段落不误匹配三个用例通过。
- 结果：测试通过，构建通过。

### 阶段三 Task 3.5：深浅主题可读性 CSS

- 目标：确保代码块、行内代码、表格在深浅主题下均清晰可辨，优先使用 Obsidian CSS 变量。
- 实现：`styles.css` 补充 `.theme-light/.theme-dark` 分支：行内代码颜色、代码块背景/代码颜色、语言标签颜色、表格样式差异。
- 结果：主要渲染元素深浅主题可读性有保障，无硬编码主题色（使用 Obsidian 变量 + CSS `color-mix`）。

### 阶段三 Task 3.6：补 messageRenderer 测试覆盖

- 目标：为阶段三所有渲染优化建立测试护栏。
- 实现：`tests/messageRenderer.test.ts` 从 3 个扩充到 **14 个**用例，覆盖代码块标签、表格、列表容器、思考块、代码块内容保护。
- 结果：17 个测试文件、**65 个**测试全部通过。

### 阶段二 Task 2.1：建立运行时状态文案体系

- 目标：统一插件所有运行时状态文案，消除多处分散的描述差异，为后续 UI 接入提供 i18n 来源。
- 实现：`i18n/zh-CN.ts` 和 `i18n/en-US.ts` 新增 `status` 键组（detecting/connected/starting/startFailed/authFailed/sending/completed/timedOut/reconnecting/disconnected）；扩展 `errors` 键组（sendFailed/sdkNotInstalled/sdkAuthFailed/sdkPortBusy/sdkStartTimeout/genericHint）；`context` 键组补充 autoLabel/manualLabel/removeContext/selectionLabel。
- 结果：构建通过，无 TS 错误。

### 阶段二 Task 2.3：聊天视图连接状态展示

- 目标：把链接状态从一次性 Notice 扩展为聊天视图内可持续感知的轻量状态条。
- 实现：`chatView.ts` topBar 下方新增 `iflow-connection-status` 状态条；`renderConnectionStatus()` 负责切换 4 种状态（detecting/connected/disconnected/reconnecting）与视觉样式；`startConnectionStatusPolling()` 每 10 s 轮询一次；`onClose()` 中清理定时器，防止内存泄漏。CSS 补充状态条样式，断连时浅红背景提示，重连时脉冲动画。
- 结果：构建通过，无 TS 错误。

### 阶段二 Task 2.7：空状态与搜索无结果引导

- 目标：区分"无历史对话"和"搜索无结果"两种空态，提供可操作的下一步引导按钮。
- 实现：`renderConversationList()` 中搜索无结果时显示"清空搜索"按钮，无历史时显示"新建对话"按钮；i18n 补充 `clearSearch`/`startNewConversation` 键；CSS 为 `.iflow-conversation-empty-action` 补充交互样式。
- 结果：构建通过，无 TS 错误。

### 阶段二 Task 2.8 & 2.9：统一发送状态与用户可见错误规范

- 目标：发送过程状态条实时反映当前状态；错误不再暴露原始 JS 异常，改为统一可读文案。
- 实现：`sendMessage()` 发送前调 `renderConnectionStatus('detecting')`，`onEnd` 时恢复 `'connected'`，`onError`/catch 时切换 `'disconnected'` 并显示 `t().errors.sendFailed` 替代原来的 `Error: ${raw}`。
- 结果：构建通过，全量 **65 个测试全部通过**。

---

## 2026-03-14 Phase 5 — 顶部信息架构重组

### 任务范围

按 `开发文档00.md §3 阶段五` 执行：将低频配置控件（模型/模式/思考开关）从顶部常驻区降级为二级配置面板（popover），释放主区空间；同时在顶部保留可感知的状态摘要（当前模型 + 思考状态）。

### Task 5.1（分析）— 顶部控件频率审计

梳理现有顶部栏结构（共 3 层）：
1. **`iflow-top-bar`**：会话选择器标题按钮 + 历史面板 + 新建按钮
2. **`iflow-connection-status`**：Phase 2 连接状态条
3. **`iflow-control-bar`**：模型选择 + 模式选择 + 思考开关（每次对话偶尔调整，**低频**）

决策：`iflow-control-bar` 整行占位但使用率低，降级为 `iflow-top-bar` 右侧的 ⚙️ 配置按钮，原有控件迁入 popover 面板。

### Task 5.2+5.3 — 二级入口与会话层级重构（TDD Red→Green）

**Red（测试先行）：** 新建 `tests/topBarConfigView.test.ts`，测试两个纯函数：
- `abbreviateModelLabel(modelId)` — 将完整模型 ID 映射为短标签（如 `'glm-4.7'` → `'GLM-4.7'`，`'deepseek-v3.2-chat'` → `'DS-V3'`，未知 ID 原样返回）
- `buildTopBarSummary(modelId, modeId, thinkingEnabled)` — 生成摘要文本（带 🧠 指示器）

8 个测试用例，确认全部失败（模块不存在，Red 验证通过）。

**Green（最小实现）：** 新建 `src/ui/chat/topBarConfigView.ts`：
- `MODEL_ABBREV` 查找表映射全部 10 个已知模型 ID
- `abbreviateModelLabel()` 利用查找表，未知 ID fallback 原样返回
- `buildTopBarSummary()` 返回 `"${label} 🧠"` 或纯 `"${label}"`

结果：**84 个测试全部通过**（新增 8 条）。

**chatView.ts 重构：**
- `import { buildTopBarSummary }` 从 `topBarConfigView`
- 新增 `private configSummaryEl: HTMLElement | null = null;`
- `onOpen()` 中删除 `iflow-control-bar` 整行；改为在 `iflow-top-bar` 右侧创建 `iflow-topbar-actions`：
  - `iflow-topbar-summary`（span，展示摘要文本）
  - `iflow-config-btn`（⚙️ 按钮）
  - `iflow-config-panel`（popover，内含 model + mode + thinking 控件，默认隐藏，点击 ⚙️ 切换 `.open` class 显示）
  - 点击外部自动关闭面板
- `createModelSelector`/`createModeSelector`/`createThinkingToggle` 各自的选中处理末尾追加 `this.updateConfigSummary()` 调用
- 新增 `updateConfigSummary()` 方法：`this.configSummaryEl.textContent = buildTopBarSummary(...)`

### Task 5.4 — 顶部状态摘要

状态摘要已通过 `iflow-topbar-summary` 实现：显示当前模型的短标签，思考模式开启时追加 🧠。摘要在每次切换模型/模式/思考开关后实时更新（`updateConfigSummary()`）。连接状态摘要复用 Phase 2 的 `iflow-connection-status` 条，不重复。

### Task 5.5 — 窄侧栏验证

CSS 添加 `@media (max-width: 320px)` 响应规则：配置面板在窄侧栏下右对齐改为左对齐，防止溢出视窗。`iflow-topbar-summary` 设 `max-width: 80px` + `text-overflow: ellipsis` 防止撑宽顶部栏。

### Task 5.6 — 最终验证

- `npm run test:run`：**18 文件 / 84 测试** 全部通过 ✅
- `npm run build`：TypeScript 无错误，esbuild 构建干净 ✅

---

## 2026-03-15 Phase 6 — 高频交互效率优化

### 任务范围

按 `开发文档00.md §3 阶段六` 执行：提升发送区域、会话切换和图片管理的交互品质。本轮覆盖 Task 6.2（输入区禁用状态）、Task 6.3（滚动位置恢复）、Task 6.4（会话切换过渡动画）、Task 6.5（批量清除图片）。

### Task 6.2 — 发送区禁用状态（TDD）

**Red（测试先行）：** 新建 `tests/inputState.test.ts`，针对纯函数 `resolveInputState({isStreaming, isEmpty})` 编写 6 条用例：
- 未流式 + 非空 → `sendDisabled: false`，按钮文案 `'发送'`
- 未流式 + 空内容 → `sendDisabled: true`
- 任意情况下流式 → `sendDisabled: true`，按钮文案 `'生成中…'`
- placeholder 随状态变化

确认 6 条用例全部失败（模块不存在），Red 阶段验证通过。

**Green（最小实现）：** 新建 `src/ui/chat/inputState.ts`：
```typescript
export function resolveInputState({ isStreaming, isEmpty }: InputStateInput): InputStateResult {
    if (isStreaming) {
        return { sendDisabled: true, buttonLabel: '生成中…', placeholder: '正在生成回答，请稍候…' };
    }
    return { sendDisabled: isEmpty, buttonLabel: '发送', placeholder: '输入消息… (Enter 发送，Shift+Enter 换行)' };
}
```

**chatView 集成：**
- `import { resolveInputState }` + `private sendButton: HTMLButtonElement | null`
- `onOpen()` 存储 `sendButton` 引用，`textarea` 绑定 `input` 事件
- 新增 `updateInputState()` 方法：调用 `resolveInputState`，设置 `disabled`、`textContent`、toggleClass `iflow-send-disabled`
- `sendMessage()` 在 `isStreaming = true` 后立即调用 `updateInputState()`
- `cleanup()` 在重置流式状态后调用 `updateInputState()`

**CSS：** 在 `:disabled` 规则基础上补充 `.iflow-send-button.iflow-send-disabled` 联合选择器，确保类名方式也触发禁用样式；添加 `pointer-events: none`。

### Task 6.3 — 滚动位置恢复（TDD）

**Red（测试先行）：** 新建 `tests/scrollPositionStore.test.ts`，针对 `ScrollPositionStore` 编写 5 条用例：
- 未知 ID 返回 0
- save/get 往返一致
- 覆盖写入
- 多会话独立存储
- clear 后恢复为 0

**Green（最小实现）：** 新建 `src/ui/chat/scrollPositionStore.ts`：
```typescript
export class ScrollPositionStore {
    private readonly positions = new Map<string, number>();
    get(conversationId: string): number { return this.positions.get(conversationId) ?? 0; }
    save(conversationId: string, scrollTop: number): void { this.positions.set(conversationId, scrollTop); }
    clear(conversationId: string): void { this.positions.delete(conversationId); }
}
```

**chatView 集成：**
- `switchConversation()` 切换前调用 `scrollPositionStore.save(currentId, messagesContainer.scrollTop)`
- `loadMessagesFromConversation()` 渲染完成后用 `requestAnimationFrame` 恢复已保存的 `scrollTop`；新会话 fallback 到 `scrollToBottom()`

### Task 6.4 — 会话切换过渡动画

在 `.iflow-messages` 规则中追加 `animation: iflow-messages-fadein 0.15s ease`，并定义对应 `@keyframes`（from `opacity: 0.55` → to `opacity: 1`）。切换会话时消息区域以轻微淡入呈现，减少内容跳变的视觉冲击。

### Task 6.5 — 批量清除图片

`updateImagePreview()` 在附件数量 > 1 时在预览区末尾渲染 `iflow-image-clear-all` 按钮（显示"清空全部 (N)"），点击后调用 `attachedImages.clear()` + `updateImagePreview()`。

**CSS：** 新增 `.iflow-image-clear-all` 规则（小字号、边框、悬停变红）。

### Task 6.6 — 最终验证

- `npm run test:run`：**20 文件 / 95 测试** 全部通过 ✅（新增 11 条：inputState × 6 + scrollPositionStore × 5）
- `npm run build`：TypeScript 无错误，esbuild 构建干净 ✅

---

## 2026-03-15 Phase 7 — 设置页与诊断闭环

### 任务范围

按 `开发文档00.md §3 阶段七` 执行：将分散在日志和 Notice 中的恢复能力产品化，重组设置页结构，新增运行时诊断入口，将存储配额警告推送给用户。

### Task 7.2 + TDD — 诊断报告纯函数（TDD）

**Red（测试先行）：** 新建 `tests/diagnosticsReport.test.ts`，针对 `buildDiagnosticsReport({connectionState, lastError, usedBytes, totalBytes, port})` 编写 8 条用例：
- 各连接状态（connected/disconnected/detecting/reconnecting）产生对应关键词
- 包含端口号
- lastError 非空时出现在报告中
- lastError 为 null 时无"最近错误"行
- 存储占用百分比显示在报告中

确认 8 条用例全部失败（模块不存在），Red 阶段验证通过。

**Green（最小实现）：** 新建 `src/ui/chat/diagnosticsReport.ts`：
```typescript
export function buildDiagnosticsReport(input: DiagnosticsInput): string {
    const lines = [
        `连接状态：${STATE_LABEL[connectionState]}`,
        `服务端口：${port}`,
        `存储占用：${pct}%（${formatBytes(usedBytes)} / ${formatBytes(totalBytes)}）`,
    ];
    if (lastError !== null) lines.push(`最近错误：${lastError}`);
    return lines.join('\n');
}
```

### Task 7.5 + TDD — 存储配额警告文本（TDD）

**Red（测试先行）：** 扩充 `tests/storageQuotaPolicy.test.ts`，在 `buildQuotaWarningMessage` describe 块中新增 4 条用例：
- 低于警告阈值 → 返回 null
- 接近上限 → 返回包含"接近上限"的字符串
- 已达上限 → 返回包含"已达上限"的字符串
- 已达上限时消息包含"请清理"建议

**Green（最小实现）：** 在 `src/domain/conversation/storageQuotaPolicy.ts` 末尾追加 `buildQuotaWarningMessage(info: StorageQuotaInfo): string | null`。

### Task 7.1 — 设置页分组重构

将原来扁平的设置列表按用途分为三个 `<h3>` 区块：
- **界面与语言**：语言切换
- **连接与服务**：自动启动 SDK、SDK 操作、端口、超时
- **上下文与附件**：自动滚动、自动附件、排除标签
- **诊断与状态**（Task 7.2 落点）：诊断报告区

### Task 7.3 — SDK 重启与重新检测

原来的"重启 SDK"按钮扩充为并列两个按钮：
- **重启 SDK**：终止并重新启动 SDK 进程，成功/失败均有 Notice 反馈
- **重新检测**：仅调用 `iflowService.checkConnection()`，不重启进程，以 Notice 形式返回检测结果；按钮文案在检测期间变为"检测中…"，防重复点击

### Task 7.4 — 附件相关设置描述优化

- `autoAttachFile`：原描述"自动附加当前文件"→ 改为行为化表述"发送消息时自动将当前编辑器中打开的笔记作为上下文附件，让模型了解你正在查看的内容"
- `excludedTags`：原描述补充"用英文逗号分隔"示例，并说明手动添加文件不受此规则影响

### Task 7.2 — 运行时诊断入口（集成）

设置页"诊断与状态"区域异步展示 `buildDiagnosticsReport()` 的输出：
- 初始显示"正在检测连接状态…"占位
- `checkConnection()` 返回后读取 localStorage 中所有 `iflow-conversations-*` key 计算存储用量，与端口信息一起传入 `buildDiagnosticsReport()` 输出完整报告
- 每行独立渲染为 `<p class="iflow-diagnostics-line">` 单声道字体，背景色与正文区分

### Task 7.5 — chatView 配额警告集成

- `LocalStorageConversationRepository` 新增 `getStorageQuota()` 方法
- `ConversationService` 通过鸭子类型检测暴露 `getStorageQuota()`
- `chatView.ts` 中 `cleanup()` 末尾调用 `checkAndWarnQuota()`：首次配额接近时通过 `new Notice(msg, 6000)` 展示警告，同会话内仅展示一次（`quotaWarningShown` 标志）

### Task 7.7 — 最终验证

- `npm run test:run`：**21 文件 / 107 测试** 全部通过 ✅（新增 12 条：diagnosticsReport × 8 + buildQuotaWarningMessage × 4）
- `npm run build`：TypeScript 无错误，esbuild 构建干净 ✅

---

## Phase 8 — 视觉精修与可访问性

### 概述

本阶段聚焦 UI 可访问性补全（Task 8.4）与视觉一致性提升（Tasks 8.1/8.2/8.3/8.5/8.6）。

### Task 8.4 — aria-label 可访问性（TDD）

**Red**：新增 `tests/ariaButtonLabels.test.ts`（8 个测试），测试 `getButtonAriaLabel(ButtonId)` 纯函数，验证每个按钮 ID 返回对应中文无障碍标签。

**Green**：新增 `src/ui/chat/ariaButtonLabels.ts`：

```typescript
export type ButtonId =
    | 'config' | 'newConversation' | 'imageRemove' | 'contextRemove'
    | 'modalClose' | 'deleteConversation' | 'thinkingToggle';

export function getButtonAriaLabel(id: ButtonId): string { ... }
```

映射表：`config` → `打开配置面板`，`newConversation` → `新建会话`，`imageRemove` → `移除图片`，`contextRemove` → `移除上下文文件`，`modalClose` → `关闭预览`，`deleteConversation` → `删除会话`，`thinkingToggle` → `切换深度思考模式`。

**集成**：在 `src/chatView.ts` 中为全部 7 个图标控件补充 `aria-label`：

| 控件 | 改动 |
|------|------|
| `iflow-config-btn` | 替换英文 aria-label 为 `getButtonAriaLabel('config')` |
| `iflow-context-remove` | 新增 `role="button"`、aria-label、`tabindex="0"` |
| `iflow-image-remove` | 新增 `role="button"`、aria-label、`tabindex="0"` |
| `iflow-image-modal-close` | 新增 `role="button"`、aria-label、`tabindex="0"` |
| `iflow-new-conversation-btn` | 新增 aria-label |
| `iflow-conversation-item-delete` | 新增 aria-label |
| `iflow-thinking-toggle` | 新增 aria-label |

### Task 8.3 — 窄边栏 touch target 补全

`.iflow-context-remove`、`.iflow-image-remove` 补充 `min-width: 20px; min-height: 20px; display: inline-flex`，保证可点击区域符合最低触控标准。

### Task 8.5 — 统一 focus-visible 焦点环

在 `src/styles.css` 末尾追加全局规则，为以下控件统一焦点环（2px solid var(--iflow-brand)，offset 2px）：

`iflow-config-btn`、`iflow-new-conversation-btn`、`iflow-thinking-toggle`、`iflow-model-btn`、`iflow-mode-btn`、`iflow-conversation-trigger`、`iflow-conversation-item-delete`、`iflow-image-clear-all`、`iflow-context-remove`、`iflow-image-remove`、`iflow-image-modal-close`

原来仅 `.iflow-message` 和 `.iflow-send-button` 有 focus-visible，本次全面补全。

### Task 8.6 — 动画/过渡一致性

修正三处宽泛的 `transition: all` 导致的噪音动画：

- `.iflow-thinking-toggle`：`all 0.2s` → `background 0.15s ease, border-color 0.15s ease, color 0.15s ease`
- `.iflow-conversation-item-delete`：`all 0.2s` → `opacity 0.15s ease, background 0.15s ease, color 0.15s ease`
- `.iflow-new-conversation-btn`：`0.2s` → `0.15s`，统一时长

### Task 8.7 — 最终验证

- `npm run test:run`：**22 文件 / 115 测试** 全部通过 ✅（新增 8 条：ariaButtonLabels × 8）
- `npm run build`：TypeScript 无错误，esbuild 构建干净 ✅

---

## Phase 9 — 测试、文档与发布准备

### 概述

本阶段目标是为整个阶段优化收尾：补全自动化测试护栏（Task 9.2）、建立人工回归清单（Task 9.3）、同步用户和开发文档（Task 9.4）、准备发布说明（Task 9.5）、建立发布前三类环境验收模板（Task 9.6）。

### Task 9.2 — 思考流拆分边界测试（TDD）

**Red**：向 `tests/toolCallMapper.test.ts` 和 `tests/messageListView.test.ts` 追加边界场景测试。`messageListView` 中的 `collectChildren` 辅助函数未定义导致 1 个测试失败，确认 Red 状态。

**Green**：修正测试用例，改用 mock 已有的 `querySelector` API 替代辅助函数，所有测试通过。

**新增 `toolCallMapper` 边界测试（4条）：**

| 测试场景 | 覆盖目的 |
|----------|----------|
| `agent_thought_chunk` 空文本 → 返回 `[]` | 防止空事件注入流 |
| `agent_thought_chunk` null content → 不抛出，返回 `[]` | 防御性：协议异常场景 |
| `agent_thought_chunk` 非 text 类型 content → 返回 `[]` | 防止工具类型误路由为 thought |
| 交错的 thought/stream 块各自路由到正确类型 | 混合流回归护栏 |

**新增 `messageListView` 边界测试（4条）：**

| 测试场景 | 覆盖目的 |
|----------|----------|
| `updateThought` 在 `showThought` 之前调用 → 不抛出，无 block 创建 | 防止空指针异常 |
| `finalizeThought` 无 thought block → 不抛出 | 防御性：无思考轮次 |
| `showThought` 多次调用 → 单一 block，内容更新为最新 | 防止 DOM 节点膨胀 |
| stream 内容 (`updateMessage`) 不污染 thought block | 关键分离回归护栏 |

### Task 9.3 — 人工回归清单

新建 `docs/refactor/manual-regression-checklist.md`，涵盖：

- 10 大场景类别：首次启动、基础对话、思考流、工具调用、文件上下文、图片附件、会话管理、失败恢复、可访问性与键盘、主题验证
- 共 36 条可执行检查项，每条包含步骤与预期结果
- 附 Task 9.6 发布前三类环境（深色/浅色/窄侧栏）验收表格

### Task 9.4 — 文档同步

**README.md**：在更新日志最前部添加 v0.8.0 条目，涵盖体验改进、视觉精修、诊断与恢复、代码质量四个方面。

**CHEATSHEET.md**：文件结构速查从 4 个文件扁平列表扩展为完整模块树，包括 `features/`、`ui/chat/`、`domain/`、`infra/` 各层新模块，标注各模块职责。

### Task 9.5 — 发布说明

更新 `release/release-notes.md`，前置 v0.8.0 发布说明，聚焦用户可感知变化：

- 体验改进（状态可见、上下文透明、思考/回答分离、工具卡片）
- 视觉精修（焦点环、无障碍标签、动画去噪）
- 诊断与恢复（设置页诊断、重新检测按钮、配额警告）
- 行为说明（思考块独立展示、工具卡片自动折叠、配额警告去重）

### Task 9.6 — 发布前三类环境验收框架

已集成在 `docs/refactor/manual-regression-checklist.md` 末尾，包含深色/浅色/窄侧栏三类环境的标准化检查点和最终结论复选框。

### Task 9.7 — 最终验证

- `npm run test:run`：**22 文件 / 123 测试** 全部通过 ✅（新增 8 条：toolCallMapper 边界 × 4 + messageListView 边界 × 4）
- `npm run build`：TypeScript 无错误，esbuild 构建干净 ✅
- 新增文档：manual-regression-checklist.md（36 条场景 + 三类环境验收）
- 更新文档：README.md（v0.8.0 变更日志）、CHEATSHEET.md（模块结构）、release/release-notes.md（v0.8.0）

### 发布前版本号修正

全量检查发现版本号不一致（`package.json` 停留在 v0.7.3，未随历次发布同步），统一修正：

| 文件 | 修正前 | 修正后 |
|------|--------|--------|
| `manifest.json` | 0.7.9 | **0.8.0** |
| `package.json` | 0.7.3 | **0.8.0** |
| `release/manifest.json` | 0.7.8 | **0.8.0** |
| `versions.json` | 最高 0.7.9 | 追加 0.8.0 条目 |

修正后构建验证：`iflow-for-obsidian@0.8.0 build` 干净通过，22 文件 / 123 测试全部通过 ✅

