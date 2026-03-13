# 模块开发文档：canvasFileAdapter

## 1. 模块定位

`canvasFileAdapter` 负责处理 Obsidian Canvas 文件的识别、规范化和兜底生成。

## 2. 核心职责

1. 判断文件是否为 `.canvas`。
2. 校验和格式化 Canvas JSON。
3. 非法 JSON 时生成最小可用 Canvas。

## 3. 对外接口

1. `isCanvasFile(path): boolean`
2. `normalize(content): string`
3. `generateBasicCanvas(seedText?): string`

## 4. 依赖关系

1. 无宿主依赖。
2. 只依赖 JSON 处理和内部 ID 生成规则。

## 5. 联通说明

1. `VaultFileBridge` 在写 Canvas 文件前调用本模块。
2. `PromptComposer` 负责引导模型写 Canvas，但不负责格式化。

## 6. 开发约束

1. 保持纯数据转换属性。
2. 不能直接写文件。

## 7. 验收标准

1. 非法 JSON 仍可生成基础 Canvas。
2. 合法 JSON 输出格式稳定。
