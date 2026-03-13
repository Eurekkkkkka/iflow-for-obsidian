# 任务 D：工具桥接与更新解释器拆分

## 1. 目标

把 ACP 服务器请求处理、Obsidian 文件桥接和 session/update 解释逻辑拆开，形成清晰边界。

## 2. 本任务覆盖范围

1. `session/request_permission`
2. `fs/read_text_file`
3. `fs/write_text_file`
4. `session/update` 文本与工具事件解释

## 3. 目标模块

1. `vaultFileBridge`
2. `canvasFileAdapter`
3. `toolCallMapper`

## 4. 开发步骤

1. 抽出 `vaultFileBridge`，处理普通读写文件逻辑。
2. 将 Canvas 特殊分支委托给 `canvasFileAdapter`。
3. 将原始 update 解释逻辑抽成 `toolCallMapper` 或 `sessionUpdateMapper`。
4. 通过 `acpClient.registerServerHandlers()` 绑定桥接层。

## 5. 模块联通说明

1. `acpClient` 接收 server request，转发给 `vaultFileBridge`。
2. `vaultFileBridge` 依赖 `vaultPathResolver` 和 `canvasFileAdapter`。
3. `toolCallMapper` 将原始 update 转成 stream、tool、end、error 等标准事件。
4. `ChatController` 消费这些标准事件，而不是直接消费 ACP 原文。

## 6. 验收标准

1. 文件读写工具保持正常。
2. Canvas 文件创建和非法 JSON 兜底正常。
3. 工具调用 UI 仍能收到开始、完成、失败事件。
4. 文本 chunk 与结束事件不回归。

## 7. 风险点

1. 工具事件和文本事件混合时，顺序可能被破坏。
2. 成功返回 `null` 的工具不能被误判为失败。
3. 服务器主动请求与普通通知不能混淆。
