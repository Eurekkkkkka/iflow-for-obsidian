# 模块开发文档：imageAttachmentView

## 1. 模块定位

`imageAttachmentView` 负责图片粘贴、拖拽、预览、删除和大图查看。

## 2. 核心职责

1. 监听拖拽和粘贴事件。
2. 校验图片类型和大小。
3. 生成 base64 附件数据。
4. 展示缩略图和移除按钮。
5. 弹出大图预览。

## 3. 对外接口

1. `mount(container): void`
2. `getAttachments(): ImageAttachment[]`
3. `clear(): void`
4. `subscribe(listener): Unsubscribe`

## 4. 依赖关系

1. 依赖 DOM API 和 FileReader。
2. 可依赖 i18n 文案。

## 5. 联通说明

1. `ChatView` 挂载本模块。
2. `ChatController` 在发送时读取附件列表。

## 6. 开发约束

1. 不直接发消息。
2. 不直接保存附件到会话存储。

## 7. 验收标准

1. 拖拽、粘贴、预览、大图查看不回归。
2. 大小和格式限制不回归。
