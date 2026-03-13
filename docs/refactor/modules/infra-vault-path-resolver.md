# 模块开发文档：vaultPathResolver

## 1. 模块定位

`vaultPathResolver` 负责把 ACP 侧路径与 Obsidian Vault 相对路径互相转换。

## 2. 核心职责

1. 接收绝对路径或相对路径。
2. 输出 Vault 相对路径。
3. 统一去除前导斜杠和 Vault 前缀。

## 3. 对外接口

1. `toRelativePath(inputPath, vaultPath): string`

## 4. 依赖关系

1. 不依赖 Obsidian API。
2. 只依赖字符串处理。

## 5. 联通说明

1. `VaultFileBridge` 在读写前调用本模块。
2. `CanvasFileAdapter` 不直接处理路径。

## 6. 开发约束

1. 保持纯函数。
2. 不隐藏非法输入，必要时抛出明确错误。

## 7. 验收标准

1. 绝对路径转换正确。
2. 相对路径原样返回。
3. 当前文件工具读写不回归。
