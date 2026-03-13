# 模块开发文档：toolCallView

## 1. 模块定位

`toolCallView` 负责在 assistant 消息下显示工具调用状态、参数、结果和错误信息。

## 2. 核心职责

1. 展示运行中工具。
2. 展示成功结果。
3. 展示失败信息。
4. 管理工具节点的增量更新。

## 3. 对外接口

1. `showOrUpdate(messageId, toolViewModel): void`

## 4. 依赖关系

1. 依赖消息区域容器。
2. 不依赖 ACP 原始结构，输入必须是标准 view model。

## 5. 联通说明

1. `ChatController` 或 `messageListView` 调用本模块。
2. `toolCallMapper` 负责把原始工具事件映射为标准结构。

## 6. 开发约束

1. 不解析工具协议字段。
2. 不负责保存工具历史。

## 7. 验收标准

1. tool_use 和 tool_result 展示不回归。
2. 成功、失败、运行中三种状态正确。
