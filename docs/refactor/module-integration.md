# 模块联通开发文档

## 1. 目的

本文档用于说明模块化重构后的联通方式，重点回答三个问题：

1. 模块之间如何调用。
2. 数据和事件如何流动。
3. 哪些边界禁止跨越。

## 2. 总体依赖方向

统一依赖方向如下：

```text
app -> features -> domain
app -> ui
features -> infra
features -> domain
ui -> features
infra 不依赖 ui
domain 不依赖 ui 和 infra 实现细节
```

约束如下：

1. UI 不直接访问 ACP 协议对象。
2. Domain 不直接访问 Obsidian API。
3. Infra 不直接修改 UI 状态。
4. App 只负责装配，不实现复杂业务规则。

## 3. 聊天主链路

聊天主链路的标准流向如下：

```text
ChatView
  -> ChatController.send()
  -> ChatContextBuilder.build()
  -> PromptComposer.compose()
  -> AcpClient.sendPrompt()
  -> ToolCallMapper.map(update)
  -> MessageListView / ToolCallView render
  -> ConversationService.appendMessage()
  -> ConversationRepository.save()
```

### 3.1 说明

1. `ChatView` 负责接收用户输入和触发控制器。
2. `ChatContextBuilder` 负责整理当前文件内容、选区和图片附件。
3. `PromptComposer` 负责拼接运行时 prompt 和策略指令。
4. `AcpClient` 负责与 iFlow CLI 建立和维护 ACP 会话。
5. `ToolCallMapper` 负责把协议层 update 转换为 UI 可消费事件。
6. `ConversationService` 负责对话标题、消息落库、会话切换等领域规则。

## 4. 启动与连接链路

```text
main.ts
  -> PluginBootstrap
  -> SettingsService.load()
  -> SdkProcessManager.ensureRunning()
  -> AcpClient.checkConnection()
  -> ChatView mount
```

### 4.1 说明

1. `main.ts` 只做 Obsidian 插件入口。
2. `PluginBootstrap` 负责创建并注入依赖对象。
3. `SettingsService` 负责读写插件设置。
4. `SdkProcessManager` 负责 SDK 进程启动、重启和状态判断。
5. `AcpClient` 只负责连接检查，不负责启动 SDK。

## 5. 工具桥接链路

```text
AcpClient receives server request
  -> VaultFileBridge / CanvasFileAdapter
  -> return tool result
  -> ToolCallMapper emits view event
```

### 5.1 说明

1. `AcpClient` 或其内部 request dispatcher 接收 `session/request_permission`、`fs/read_text_file`、`fs/write_text_file`。
2. `VaultFileBridge` 处理普通文件读写。
3. `CanvasFileAdapter` 处理 `.canvas` 文件合法化和兜底生成。
4. 工具结果返回给协议层后，再通过映射器转成 UI 状态更新。

## 6. 会话与存储链路

```text
ConversationSelectorView
  -> ConversationService.switchConversation()
  -> ConversationRepository.save()
  -> MessageListView.reload()
```

```text
ChatController.onAssistantEnd()
  -> ConversationService.appendAssistantMessage()
  -> ConversationRepository.save()
```

### 6.1 说明

1. `ConversationRepository` 只管持久化和读取状态。
2. `ConversationService` 负责标题生成、消息追加、导入导出调用、配额策略协调。
3. `StorageQuotaPolicy` 只处理容量评估和清理建议，不直接操作 UI。

## 7. 模块间公共数据对象

建议统一维护以下公共类型：

1. `Conversation`
2. `Message`
3. `ChatRuntimeOptions`
4. `ChatContextPayload`
5. `PromptPayload`
6. `ToolCallViewModel`
7. `AcpSessionUpdate`

这些类型建议集中放在领域层或 features 层的 types 文件中，避免 UI、infra、domain 各自定义相似结构。

## 8. 边界禁止项

以下行为在重构后禁止出现：

1. `ChatView` 直接解析 ACP 原始消息。
2. `PromptComposer` 直接访问 `app.vault`。
3. `ConversationRepository` 直接处理 Markdown 导出模板。
4. `VaultFileBridge` 直接拼装系统提示词。
5. `SdkProcessManager` 直接操作消息列表 UI。

## 9. 联通验收标准

模块联通完成后，应满足：

1. 任一 UI 组件都不需要知道 WebSocket 或 JSON-RPC 细节。
2. 任一 infra 模块都不需要知道 DOM 或 HTMLElement。
3. 会话切换、发送消息、工具调用展示三条主链路的依赖方向稳定。
4. 未来增加一个新工具桥接时，不需要修改 `ChatView` 主类。
5. 未来替换会话持久化实现时，不需要修改聊天控制器。
