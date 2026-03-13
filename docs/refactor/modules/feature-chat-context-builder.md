# 模块开发文档：chatContextBuilder

## 1. 模块定位

`chatContextBuilder` 负责从 Obsidian 当前上下文中抽取聊天所需输入材料。

## 2. 核心职责

1. 读取当前活动文件内容。
2. 读取编辑器选区。
3. 应用排除标签规则。
4. 合并图片附件元数据。

## 3. 对外接口

1. `build(): Promise<ChatContextPayload>`

## 4. 依赖关系

1. 依赖 Obsidian `workspace`、`metadataCache`、`vault`。
2. 依赖 `SettingsService` 获取排除标签和自动附加规则。

## 5. 联通说明

1. `ChatController` 在发送前调用本模块。
2. `PromptComposer` 使用本模块产出的上下文数据。

## 6. 开发约束

1. 不直接发送消息。
2. 不拼装最终 prompt 文本。

## 7. 验收标准

1. 当前文件和选区逻辑不回归。
2. 排除标签规则不回归。
