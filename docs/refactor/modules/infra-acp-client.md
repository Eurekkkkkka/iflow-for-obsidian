# 模块开发文档：acpClient

## 1. 模块定位

`acpClient` 是 ACP 连接级客户端，负责 WebSocket 生命周期、session 初始化和 prompt 发送。

## 2. 核心职责

1. 建立和关闭 WebSocket。
2. 初始化 ACP 协议。
3. 执行 authenticate 和 session/new。
4. 发送 prompt，请求模式、模型、think 配置。
5. 注册服务端请求处理器。

## 3. 对外接口

1. `checkConnection(): Promise<boolean>`
2. `connect(): Promise<void>`
3. `sendPrompt(options): Promise<void>`
4. `registerServerHandlers(handlers): void`
5. `subscribe(listener): Unsubscribe`

## 4. 依赖关系

1. 依赖 `jsonRpcProtocol`。
2. 依赖 WebSocket 运行环境。
3. 不依赖 Obsidian 文件系统实现。

## 5. 联通说明

1. `ChatController` 调用 `sendPrompt()`。
2. `SdkProcessManager` 调用 `checkConnection()`。
3. 工具桥接层通过注册接口接入。

## 6. 开发约束

1. 不直接解析文件路径。
2. 不直接生成 prompt 内容。
3. 不直接落库会话消息。

## 7. 验收标准

1. 初始化、认证、建会话不回归。
2. 重连与 session 重建逻辑稳定。
3. 主请求发送链路可用。
