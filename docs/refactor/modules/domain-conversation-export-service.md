# 模块开发文档：conversationExportService

## 1. 模块定位

`conversationExportService` 负责会话导入导出格式的生成与解析。

## 2. 核心职责

1. 导出 JSON。
2. 导出 Markdown。
3. 解析导入 JSON。
4. 返回结构化导入结果。

## 3. 对外接口

1. `exportToJson(state): string`
2. `exportToMarkdown(conversation): string`
3. `importFromJson(raw): ImportResult`

## 4. 依赖关系

1. 依赖 `conversationRepository` 或其返回数据。
2. 不依赖 UI。

## 5. 联通说明

1. 设置页、会话面板或后续导出入口通过 `ConversationService` 间接调用本模块。
2. 导入成功后由 `ConversationService` 决定如何写回仓储。

## 6. 开发约束

1. 不直接写 localStorage。
2. 不直接弹出用户提示。

## 7. 验收标准

1. JSON 与 Markdown 导出内容不回归。
2. 导入结果有明确成功、失败和数量信息。
