# 任务 A：低风险模块抽离

## 1. 目标

在不改变主链路行为的前提下，把纯逻辑和低耦合逻辑从大文件中抽离出来，降低后续重构风险。

## 2. 本任务覆盖范围

1. `src/chatView.ts` 中的消息格式化逻辑
2. `src/iflowService.ts` 中的 Canvas 适配逻辑
3. `src/iflowService.ts` 中的 Vault 路径解析逻辑
4. `src/conversationStore.ts` 中的配额治理策略

## 3. 目标模块

1. `messageRenderer`
2. `canvasFileAdapter`
3. `vaultPathResolver`
4. `storageQuotaPolicy`

## 4. 开发步骤

1. 先抽离消息格式化逻辑，确保 `formatMessage` 和 `escapeHtml` 行为不变。
2. 再抽离 Canvas 文件判断、规范化和兜底生成功能。
3. 再抽离路径转换逻辑，统一输入输出规范。
4. 最后抽离存储配额策略和清理规则。

## 5. 模块联通说明

1. `ChatView` 调用 `messageRenderer.render(content)` 返回 HTML 字符串。
2. `VaultFileBridge` 调用 `vaultPathResolver.toRelativePath(path, vaultPath)` 统一路径。
3. `VaultFileBridge` 在写 `.canvas` 文件时调用 `canvasFileAdapter.normalize(content)`。
4. `ConversationService` 或 `ConversationRepository` 调用 `storageQuotaPolicy.evaluate(state)` 获取配额结果和清理建议。

## 6. 验收标准

1. 不允许修改用户可见行为。
2. 不允许改变现有接口命名之外的主流程。
3. 现有聊天、Canvas 写入、会话保存行为必须和改造前一致。

## 7. 风险点

1. 消息格式化中的正则处理顺序不能变化过大。
2. Canvas 兜底逻辑若变化，会影响用户生成文件结果。
3. 路径解析错误会直接影响文件读写工具。
