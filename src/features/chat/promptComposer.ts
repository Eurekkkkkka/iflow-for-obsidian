export interface PromptComposerInput {
	userMessage: string;
	filePath?: string;
	selection?: string;
}

const BASE_PROMPT_HEADER = `【重要】请始终使用中文（简体）回复用户。所有输出、解释、代码注释都应使用中文。

【格式规范】
- 编号列表：每个独立的问题列表或建议列表应从 1 开始编号，不要延续之前的编号
- 示例：如果之前有"问题1-5"，新的一组问题应从"1."开始，而不是"6."`;

const CANVAS_GUIDANCE = `## 🚨 CRITICAL: 必须调用工具创建文件！

用户想要创建 Canvas 文件。你必须：
1. 立即调用 fs/write_text_file 工具
2. 为 .canvas 文件写入合法 JSON
3. 不要输出大段 JSON 让用户手动复制

请优先直接创建 Canvas 文件并给出简短结果说明。`;

export function shouldUseCanvasGuidance(text: string): boolean {
	return /canvas|思维导图|流程图|导图|可视化|graph|map|flowchart/i.test(text);
}

export function composePrompt(input: PromptComposerInput): string {
	let prompt = `${BASE_PROMPT_HEADER}\n\n用户消息：${input.userMessage}`;

	if (input.filePath) {
		prompt = `User is working on: ${input.filePath}\n\n`;
		if (input.selection) {
			prompt += `Selected text:\n${input.selection}\n\n`;
		}
		prompt += `User message: ${input.userMessage}`;
	}

	if (shouldUseCanvasGuidance(prompt)) {
		prompt = `${CANVAS_GUIDANCE}\n\n${prompt}`;
	}

	return prompt;
}
