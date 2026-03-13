# 模块开发文档：chatController

## 1. 模块定位

`chatController` 是聊天功能编排器，负责连接 UI、上下文、策略、协议和会话存储。

## 2. 核心职责

1. 接收发送请求。
2. 协调上下文构建与 prompt 组装。
3. 调用 ACP 客户端。
4. 处理标准事件并转发给 UI。
5. 在结束时写入会话。

## 3. 对外接口

1. `send(input): Promise<void>`
2. `cancelCurrentRun(): void`
3. `bindViewAdapters(adapters): void`

## 4. 依赖关系

1. 依赖 `chatContextBuilder`。
2. 依赖 `promptComposer`。
3. 依赖 `acpClient`。
4. 依赖 `toolCallMapper`。
5. 依赖 `conversationService`。

## 5. 联通说明

1. `ChatView` 只调用本模块。
2. 本模块把事件发送给 `messageListView`、`toolCallView`。
3. assistant 完成后调用 `conversationService.appendAssistantMessage()`。

## 6. 开发约束

1. 不直接创建 DOM。
2. 不直接持有 WebSocket。

## 7. 验收标准

1. 主发送链路不回归。
2. handler 清理和超时清理逻辑稳定。
