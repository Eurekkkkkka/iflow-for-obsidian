# 模块开发文档：messageListView

## 1. 模块定位

`messageListView` 负责消息区域的渲染、更新、历史加载和滚动控制。

## 2. 核心职责

1. 添加 user 和 assistant 消息。
2. 更新流式中的 assistant 消息。
3. 显示和移除 loading 状态。
4. 加载历史会话消息。
5. 控制自动滚动。

## 3. 对外接口

1. `appendMessage(role, content, id?): string`
2. `updateMessage(id, content): void`
3. `showLoading(id): void`
4. `hideLoading(id): void`
5. `loadConversation(messages): void`
6. `scrollToBottom(): void`

## 4. 依赖关系

1. 依赖 `messageRenderer`。
2. 不依赖协议层。

## 5. 联通说明

1. `ChatController` 驱动本模块更新流式内容。
2. `ConversationService` 提供历史消息，本模块负责显示。

## 6. 开发约束

1. 不直接写入会话存储。
2. 不解析 ACP 原始消息。

## 7. 验收标准

1. 流式显示和历史加载不回归。
2. 自动滚动行为不回归。
