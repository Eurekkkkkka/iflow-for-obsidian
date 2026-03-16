import type { IFlowToolCall, SendMessageOptions } from '../../iflowService';

export interface ChatControllerContext {
	filePath?: string;
	fileContent?: string;
	selection?: string;
}

export interface ChatControllerSendInput {
	content: string;
	onChunk?: (chunk: string) => void;
	onTool?: (tool: IFlowToolCall) => void;
	onEnd?: () => void;
	onError?: (error: string) => void;
}

export interface ChatControllerDeps {
	buildContext: () => Promise<ChatControllerContext>;
	compose: (input: { userMessage: string; filePath?: string; selection?: string }) => string;
	sendMessage: (options: SendMessageOptions & { promptOverride?: string }) => Promise<void>;
}

export class ChatController {
	constructor(private readonly deps: ChatControllerDeps) {}

	async send(input: ChatControllerSendInput): Promise<void> {
		const context = await this.deps.buildContext();
		const promptOverride = this.deps.compose({
			userMessage: input.content,
			filePath: context.filePath,
			selection: context.selection,
		});

		await this.deps.sendMessage({
			content: input.content,
			filePath: context.filePath,
			fileContent: context.fileContent,
			selection: context.selection,
			onChunk: input.onChunk,
			onTool: input.onTool,
			onEnd: input.onEnd,
			onError: input.onError,
			promptOverride,
		});
	}
}
