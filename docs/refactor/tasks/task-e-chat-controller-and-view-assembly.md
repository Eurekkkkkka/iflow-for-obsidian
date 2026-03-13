# 任务 E：聊天控制器与视图装配重组

## 1. 目标

建立 `chatController`，把发送消息、上下文整理、prompt 组装、事件绑定和会话落库从 `ChatView` 中迁出。

## 2. 本任务覆盖范围

1. 用户点击发送后的主编排逻辑
2. 当前文件、选区、排除标签的上下文整理
3. 流式事件绑定和清理
4. assistant 结果落库与 UI 刷新

## 3. 目标模块

1. `chatContextBuilder`
2. `promptComposer`
3. `chatController`

## 4. 开发步骤

1. 先抽 `chatContextBuilder`。
2. 再抽 `promptComposer`，保留现有中文回复、Canvas 指导和结构化内容规则。
3. 最后由 `chatController` 接管 `sendMessage` 主流程。

## 5. 模块联通说明

1. `ChatView` 只负责收集输入并调用 `chatController.send(input)`。
2. `chatController` 调用 `chatContextBuilder` 获取上下文。
3. `chatController` 调用 `promptComposer` 获取 prompt。
4. `chatController` 调用 `acpClient` 发送消息。
5. `chatController` 把标准事件转发给 `messageListView`、`toolCallView` 和 `conversationService`。

## 6. 验收标准

1. `ChatView` 主类明显瘦身。
2. 发送消息功能不回归。
3. 选区、上下文文件、图片附件处理不回归。
4. 流式完成后的 assistant 消息仍能正确入库。

## 7. 风险点

1. 控制器接管后，UI 状态同步顺序容易变化。
2. 清理回调和 handler 生命周期需要重新梳理。
3. 会话切换与发送中断场景需要特别验证。
