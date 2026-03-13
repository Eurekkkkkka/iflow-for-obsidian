# 模块开发文档：conversationService

## 1. 模块定位

`conversationService` 是会话领域服务，负责会话业务规则和对仓储的协调。

## 2. 核心职责

1. 创建、切换、删除会话。
2. 追加 user / assistant 消息。
3. 生成首条消息标题。
4. 更新模型、模式、思考等会话设置。
5. 协调配额治理。

## 3. 对外接口

1. `newConversation()`
2. `switchConversation(id)`
3. `deleteConversation(id)`
4. `appendUserMessage(id, content)`
5. `appendAssistantMessage(id, content)`
6. `updateConversationSettings(id, settings)`
7. `getCurrentConversation()`

## 4. 依赖关系

1. 依赖 `conversationRepository`。
2. 依赖 `storageQuotaPolicy`。

## 5. 联通说明

1. `ChatController` 和 `conversationSelectorView` 都依赖本模块。
2. 本模块保存成功后通知 UI 刷新。

## 6. 开发约束

1. 不直接渲染界面。
2. 不直接访问 localStorage。

## 7. 验收标准

1. 新建、切换、删除和消息追加不回归。
2. 标题生成规则不回归。
