# 模块开发文档：vaultFileBridge

## 1. 模块定位

`vaultFileBridge` 是 ACP 工具请求与 Obsidian Vault API 之间的桥接层。

## 2. 核心职责

1. 读取 Vault 文件。
2. 写入或覆盖 Vault 文件。
3. 为写入过程接入路径解析和 Canvas 适配。
4. 统一输出工具执行结果。

## 3. 对外接口

1. `readTextFile(path): Promise<{ content?: string; error?: string }>`
2. `writeTextFile(path, content): Promise<{ error?: string } | null>`

## 4. 依赖关系

1. 依赖 Obsidian `app.vault.adapter`。
2. 依赖 `vaultPathResolver`。
3. 依赖 `canvasFileAdapter`。

## 5. 联通说明

1. `AcpClient` 收到 `fs/read_text_file` / `fs/write_text_file` 后转发到本模块。
2. 写入 `.canvas` 时交给 `canvasFileAdapter` 规范化内容。

## 6. 开发约束

1. 不拼装 UI 提示内容。
2. 不感知 prompt 或会话概念。

## 7. 验收标准

1. 普通文件读写不回归。
2. 出错时错误消息结构稳定。
3. 与当前 Obsidian 集成行为一致。
