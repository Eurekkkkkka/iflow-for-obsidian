# 模块开发文档：promptComposer

## 1. 模块定位

`promptComposer` 负责组装发送给 iFlow 的最终 prompt 和运行策略，是聊天运行时的策略层。

## 2. 核心职责

1. 组装中文回复要求。
2. 注入编号和输出格式规则。
3. 检测 Canvas 意图并注入额外指导。
4. 合并上下文文件、选区和图片描述。

## 3. 对外接口

1. `compose(input, context, runtimeOptions): PromptPayload`

## 4. 依赖关系

1. 依赖 `chatContextBuilder` 的输出结果。
2. 不依赖 Obsidian API。

## 5. 联通说明

1. `ChatController` 在发送前调用本模块。
2. `AcpClient` 只接收本模块拼装后的结果。

## 6. 开发约束

1. 不直接发送请求。
2. 不持久化消息。
3. Canvas 规则、中文规则等策略需要配置化扩展。

## 7. 验收标准

1. 与当前 prompt 行为等价。
2. Canvas 场景仍会触发正确指导。
