# 模块开发文档：conversationSelectorView

## 1. 模块定位

`conversationSelectorView` 负责会话下拉面板、搜索、分组展示、切换和删除交互。

## 2. 核心职责

1. 展示当前会话标题和消息数量。
2. 按日期分组展示会话列表。
3. 提供搜索过滤。
4. 提供新建、切换、删除入口。

## 3. 对外接口

1. `mount(container): void`
2. `render(state): void`
3. `setCurrentMeta(meta): void`
4. `close(): void`

## 4. 依赖关系

1. 依赖 `ConversationService` 输出的会话数据。
2. 依赖 i18n。

## 5. 联通说明

1. `ChatView` 挂载本模块。
2. 本模块通过回调触发 `onCreate`、`onSwitch`、`onDelete`。
3. `ConversationService` 状态变化后重新渲染本模块。

## 6. 开发约束

1. 不直接修改仓储状态。
2. 不直接操作消息列表数据。

## 7. 验收标准

1. 搜索、分组、切换、删除不回归。
2. 打开和关闭面板行为不回归。
