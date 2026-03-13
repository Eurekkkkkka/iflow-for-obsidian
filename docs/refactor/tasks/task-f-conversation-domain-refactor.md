# 任务 F：会话领域与持久化职责重组

## 1. 目标

把 `conversationStore` 从全能类重构为仓储层和领域服务层，顺手补齐导入导出能力的开发入口定义。

## 2. 本任务覆盖范围

1. 会话状态读写
2. 会话标题生成
3. 消息追加
4. 会话设置更新
5. 导入导出
6. 配额治理协调

## 3. 目标模块

1. `conversationRepository`
2. `conversationService`
3. `conversationExportService`
4. `storageQuotaPolicy`

## 4. 开发步骤

1. 先让 `conversationRepository` 仅负责 load、save、subscribe。
2. 再把标题生成、消息操作、切换逻辑迁移到 `conversationService`。
3. 再把导入导出逻辑迁移到 `conversationExportService`。
4. 最后让 `conversationService` 协调 `storageQuotaPolicy`。

## 5. 模块联通说明

1. `conversationSelectorView` 和 `chatController` 只依赖 `conversationService`。
2. `conversationService` 依赖 `conversationRepository` 读取和保存状态。
3. `conversationExportService` 依赖 `conversationRepository` 提供当前会话数据。
4. `storageQuotaPolicy` 只返回策略结果，不直接执行 UI 提示。

## 6. 验收标准

1. 会话新建、切换、删除不回归。
2. assistant 和 user 消息写入不回归。
3. 标题生成规则不回归。
4. JSON 和 Markdown 导出逻辑仍然可用。

## 7. 风险点

1. 仓储与服务拆分时容易出现重复保存。
2. 导入导出移动后，调用点可能暂时缺失。
3. 订阅通知粒度变化会影响 UI 刷新时机。
