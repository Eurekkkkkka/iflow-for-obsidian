# 模块开发文档：sdkProcessManager

## 1. 模块定位

`sdkProcessManager` 负责 iFlow CLI SDK 进程的启动、重启、存活检查和错误状态包装。

## 2. 核心职责

1. 根据平台生成启动命令。
2. 启动或重启 SDK 进程。
3. 检查 SDK 是否已经可连通。
4. 输出结构化状态给上层。

## 3. 对外接口

1. `ensureRunning(forceRestart?: boolean): Promise<StartResult>`
2. `start(): Promise<StartResult>`
3. `stopIfNeeded(): Promise<void>`
4. `getStatus(): SdkProcessStatus`

## 4. 依赖关系

1. 依赖 Node `child_process`。
2. 依赖 `AcpClient.checkConnection()` 进行连通性验证。

## 5. 联通说明

1. `main.ts` 在 `onLayoutReady` 前后调用 `ensureRunning()`。
2. 设置页和命令面板通过该模块触发重启。

## 6. 开发约束

1. 不直接创建聊天会话。
2. 不直接弹 UI 提示。

## 7. 验收标准

1. 自动启动行为不回归。
2. 手动重启命令不回归。
3. Windows 和非 Windows 分支都可工作。
