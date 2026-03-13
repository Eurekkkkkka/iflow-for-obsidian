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
