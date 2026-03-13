# 模块开发文档：conversationRepository

## 1. 模块定位

`conversationRepository` 是会话状态的持久化仓储层，负责状态读取、保存、迁移和订阅。

## 2. 核心职责

1. 从 localStorage 读取状态。
2. 保存状态。
3. 处理数据版本迁移。
4. 提供订阅机制。

## 3. 对外接口

1. `load(): ConversationState`
2. `save(state): void`
3. `getState(): ConversationState`
4. `subscribe(listener): Unsubscribe`

## 4. 依赖关系

1. 依赖浏览器 localStorage。
2. 不依赖 UI。

## 5. 联通说明

1. `ConversationService` 通过本模块读写状态。
2. `ConversationExportService` 通过本模块读取原始数据。

## 6. 开发约束

1. 不做标题生成。
2. 不做 Markdown 导出格式化。
3. 不做配额策略判定。

## 7. 验收标准

1. 状态持久化和恢复不回归。
2. Vault 隔离 key 规则不回归。
