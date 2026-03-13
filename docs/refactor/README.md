# iFlow for Obsidian 重构开发文档

## 1. 文档目的

本目录用于支撑仓库的模块化重构实施，目标不是直接替换现有实现，而是在保持插件可运行的前提下，分阶段把职责过重的文件拆分为稳定、可维护、可测试的模块。

当前重构聚焦三个问题：

1. `src/chatView.ts` 同时承担 UI 装配、消息渲染、输入编排、图片处理、会话面板和工具调用展示。
2. `src/iflowService.ts` 同时承担 ACP 协议、连接管理、权限处理、文件桥接、提示词策略和事件分发。
3. `src/conversationStore.ts` 同时承担持久化、业务操作、配额治理和导入导出。

## 2. 目标目录结构

重构完成后的推荐源码结构如下：

```text
src/
  main.ts
  app/
    pluginBootstrap.ts
    settingsService.ts
    sdkProcessManager.ts
  infra/
    acp/
      jsonRpcProtocol.ts
      acpClient.ts
    obsidian/
      vaultPathResolver.ts
      vaultFileBridge.ts
      canvasFileAdapter.ts
  features/
    chat/
      promptComposer.ts
      toolCallMapper.ts
      chatContextBuilder.ts
      chatController.ts
  ui/
    chat/
      messageRenderer.ts
      messageListView.ts
      toolCallView.ts
      imageAttachmentView.ts
      conversationSelectorView.ts
  domain/
    conversation/
      conversationRepository.ts
      conversationService.ts
      conversationExportService.ts
      storageQuotaPolicy.ts
  i18n/
    index.ts
    zh-CN.ts
    en-US.ts
```

## 3. 重构原则

1. 每一轮重构都必须保证插件可编译、可加载、主聊天流程可运行。
2. 先拆低耦合的纯逻辑，再拆高耦合的 UI 和服务编排。
3. 每个模块只对一种变化来源负责。
4. 新模块优先输出清晰接口，不先追求完全泛化。
5. 模块之间只通过显式接口通信，不跨层直接访问内部状态。

## 4. 文档结构

### 4.1 任务文档

任务文档位于 `docs/refactor/tasks/`，用于指导分阶段落地。

1. `task-a-low-risk-extraction.md`
2. `task-b-chat-ui-split.md`
3. `task-c-acp-client-split.md`
4. `task-d-tool-bridge-and-update-parser.md`
5. `task-e-chat-controller-and-view-assembly.md`
6. `task-f-conversation-domain-refactor.md`

### 4.2 模块联通文档

联通文档位于 `docs/refactor/module-integration.md`，用于说明模块间调用关系、数据边界、事件流和依赖方向。

### 4.3 模块文档

模块文档位于 `docs/refactor/modules/`，每个模块一份独立开发说明，覆盖：

1. 模块职责
2. 输入输出
3. 对外接口
4. 依赖关系
5. 与现有文件的映射关系
6. 开发约束
7. 验收标准

## 5. 实施顺序

建议严格按以下顺序实施：

1. 任务 A：抽离纯逻辑和低风险模块
2. 任务 B：拆分聊天视图中的 UI 子系统
3. 任务 C：拆分 ACP 协议和连接客户端
4. 任务 D：拆分工具桥接和更新解释器
5. 任务 E：建立聊天控制器并重组 View
6. 任务 F：重构会话领域与持久化职责

## 6. 阶段验收标准

每完成一个任务，都至少要验证以下行为不回归：

1. 插件可以加载。
2. 聊天消息可以发送并接收流式响应。
3. 工具调用可视化正常。
4. 当前文件上下文、选中文本、排除标签逻辑正常。
5. 会话切换和历史加载正常。
6. SDK 自动启动和连接状态正常。
7. Canvas 文件写入逻辑正常。
