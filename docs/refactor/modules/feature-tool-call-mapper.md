# 模块开发文档：toolCallMapper

## 1. 模块定位

`toolCallMapper` 负责把 ACP 的 `session/update` 原始结构映射为 UI 可消费的标准事件。

## 2. 核心职责

1. 识别文本 chunk。
2. 识别 `tool_use` 和 `tool_result`。
3. 识别 `task_finish`、`agent_turn_end` 等结束信号。
4. 输出统一事件模型。

## 3. 对外接口

1. `map(update): ChatRuntimeEvent[]`

## 4. 依赖关系

1. 依赖 ACP update 类型定义。
2. 不依赖 DOM。

## 5. 联通说明

1. `AcpClient` 收到 notification 后调用本模块。
2. `ChatController` 消费映射后的标准事件并转发给 UI 和会话服务。

## 6. 开发约束

1. 不直接更新界面。
2. 不直接保存会话。

## 7. 验收标准

1. 文本事件与工具事件顺序不回归。
2. `null` 工具结果不误判为错误。
