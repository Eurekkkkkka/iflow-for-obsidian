# 模块开发文档：jsonRpcProtocol

## 1. 模块定位

`jsonRpcProtocol` 封装 ACP 使用的 JSON-RPC 2.0 读写协议，是最底层的消息路由器。

## 2. 核心职责

1. 维护 request id。
2. 保存 pending request。
3. 处理 response、server request、notification。
4. 提供 server method 注册能力。

## 3. 对外接口

1. `sendRequest(method, params): Promise<any>`
2. `handleMessage(raw): ParsedMessage | null`
3. `onServerMethod(method, handler): void`
4. `clearPendingRequests(): void`

## 4. 依赖关系

1. 只依赖底层 `send(message: string)` 回调。
2. 不依赖 WebSocket、Obsidian、DOM。

## 5. 联通说明

1. `AcpClient` 持有 `jsonRpcProtocol` 实例。
2. 工具桥接层通过 `AcpClient` 间接注册 server method handler。

## 6. 开发约束

1. 纯协议层，不加入业务分支。
2. 不处理 prompt 和工具 UI。

## 7. 验收标准

1. pending request 生命周期正确。
2. response 和 notification 不混淆。
3. 连接关闭时 pending request 能全部 reject。
