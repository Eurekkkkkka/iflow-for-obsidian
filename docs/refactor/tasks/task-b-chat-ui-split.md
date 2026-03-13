# 任务 B：聊天 UI 子系统拆分

## 1. 目标

拆分 `src/chatView.ts` 中的高耦合 UI 逻辑，使主视图只负责装配、状态协调和事件转发。

## 2. 本任务覆盖范围

1. 会话选择面板
2. 图片附件处理
3. 工具调用展示
4. 消息列表与加载动画

## 3. 目标模块

1. `messageListView`
2. `toolCallView`
3. `imageAttachmentView`
4. `conversationSelectorView`

## 4. 开发步骤

1. 先拆会话面板，因为它与主消息流耦合较低。
2. 再拆图片附件子系统，因为它主要依赖 DOM 和浏览器 API。
3. 再拆工具调用视图，因为它依赖消息展示区但职责单一。
4. 最后拆消息列表，保留 `ChatView` 作为装配层。

## 5. 模块联通说明

1. `ChatView` 创建各个 UI 子组件实例，并注册事件回调。
2. `conversationSelectorView` 只触发 `onSwitchConversation`、`onDeleteConversation`、`onCreateConversation`。
3. `imageAttachmentView` 只输出附件列表变化，不直接发消息。
4. `messageListView` 负责渲染消息和滚动，不直接管理会话存储。
5. `toolCallView` 只接收 `ToolCallViewModel` 并更新指定消息节点下的工具区域。

## 6. 验收标准

1. UI 样式和行为不回归。
2. 会话搜索、切换、删除功能正常。
3. 图片拖拽、粘贴、删除和大图预览正常。
4. 流式消息、加载动画、工具状态展示正常。

## 7. 风险点

1. DOM 节点引用拆分后容易出现失效引用。
2. 消息列表和工具调用的挂载关系必须保持稳定。
3. 会话切换期间的流式状态处理不能回归。
