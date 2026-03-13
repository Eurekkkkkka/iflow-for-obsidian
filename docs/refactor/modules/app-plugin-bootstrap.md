# 模块开发文档：pluginBootstrap

## 1. 模块定位

`pluginBootstrap` 是插件装配层，负责在 Obsidian 宿主环境中创建并连接所有核心模块。

## 2. 核心职责

1. 创建 SettingsService、SdkProcessManager、AcpClient、ConversationService、ChatController。
2. 注册 View、Command、SettingTab。
3. 向 `main.ts` 暴露最小化入口。

## 3. 对外接口

1. `bootstrap(plugin: Plugin): PluginRuntime`
2. `dispose(): void`

## 4. 依赖关系

1. 依赖 Obsidian Plugin API。
2. 依赖 app、infra、domain、features、ui 各层模块。
3. 不依赖具体页面内容或消息渲染规则。

## 5. 联通说明

1. `main.ts` 调用 `pluginBootstrap.bootstrap()`。
2. `pluginBootstrap` 返回运行时对象给 `main.ts` 用于后续命令和生命周期操作。

## 6. 开发约束

1. 不在本模块实现复杂业务逻辑。
2. 不在本模块直接拼装 prompt。
3. 任何新增依赖都必须通过构造参数显式传递。

## 7. 验收标准

1. 插件加载成功。
2. 各模块实例只创建一次。
3. 卸载时资源能正确释放。
