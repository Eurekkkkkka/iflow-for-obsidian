# 模块开发文档：storageQuotaPolicy

## 1. 模块定位

`storageQuotaPolicy` 负责评估当前会话数据占用和清理策略，是领域策略模块。

## 2. 核心职责

1. 估算当前存储占用。
2. 判断是否接近上限。
3. 给出清理旧会话建议。
4. 统一阈值定义。

## 3. 对外接口

1. `evaluate(rawData): StorageQuotaInfo`
2. `cleanup(conversations, currentConversationId): CleanupResult`

## 4. 依赖关系

1. 无 UI 依赖。
2. 可依赖 `Blob` 或字符串长度估算。

## 5. 联通说明

1. `ConversationService` 在保存前调用本模块。
2. `conversationRepository` 不直接包含清理策略。

## 6. 开发约束

1. 不直接执行通知。
2. 不直接访问 localStorage。

## 7. 验收标准

1. 阈值和清理行为与当前一致。
2. 当前会话被清理时仍能正确回退。
