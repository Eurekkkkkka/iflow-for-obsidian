# 模块开发文档：settingsService

## 1. 模块定位

`settingsService` 负责管理插件级配置的读取、保存、默认值合并和变更派发。

## 2. 核心职责

1. 加载默认设置和用户持久化设置。
2. 保存设置并向依赖模块广播变化。
3. 提供只读设置访问能力。

## 3. 对外接口

1. `load(): Promise<IFlowSettings>`
2. `get(): IFlowSettings`
3. `update(partial: Partial<IFlowSettings>): Promise<IFlowSettings>`
4. `subscribe(listener): Unsubscribe`

## 4. 依赖关系

1. 依赖 Obsidian `loadData` / `saveData`。
2. 不依赖 UI 组件。

## 5. 联通说明

1. `pluginBootstrap` 初始化时读取设置。
2. `SdkProcessManager`、`ChatController`、`ChatView` 都通过订阅或读取接口获取最新配置。

## 6. 开发约束

1. 不直接操作 Notice。
2. 不直接更新连接状态。
3. 默认值定义保持唯一来源。

## 7. 验收标准

1. 设置读写与当前行为一致。
2. 设置变更后依赖模块收到最新值。
