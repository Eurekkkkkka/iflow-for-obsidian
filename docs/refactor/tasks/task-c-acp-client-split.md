# 任务 C：ACP 协议与连接客户端拆分

## 1. 目标

把 `src/iflowService.ts` 中的协议处理和连接管理抽离为稳定的基础设施模块。

## 2. 本任务覆盖范围

1. JSON-RPC request/response 管理
2. server method 注册与回调
3. WebSocket 连接、初始化、认证、session 创建
4. 重连与 pending request 清理

## 3. 目标模块

1. `jsonRpcProtocol`
2. `acpClient`

## 4. 开发步骤

1. 先完整抽离 `AcpProtocol`。
2. 再将 `connect`、`checkConnection`、`initializeConnection` 等逻辑抽到 `acpClient`。
3. 最后用 facade 兼容旧的 `IFlowService` 外部调用方式。

## 5. 模块联通说明

1. `ChatController` 只依赖 `acpClient` 提供的高层接口。
2. `acpClient` 内部持有 `jsonRpcProtocol` 实例。
3. `jsonRpcProtocol` 不感知 Obsidian，不感知 UI。
4. server method handler 的注册入口由 `acpClient` 暴露给工具桥接层。

## 6. 验收标准

1. initialize、authenticate、session/new 流程不回归。
2. 断线重连逻辑不回归。
3. pending request 在断链时仍能被清理。
4. 主聊天请求仍可正常发送和结束。

## 7. 风险点

1. 协议层和连接层拆分后，生命周期顺序容易出错。
2. server request 与 response 的路由边界必须保持准确。
3. 重连期间 session 状态丢失要有清晰策略。
