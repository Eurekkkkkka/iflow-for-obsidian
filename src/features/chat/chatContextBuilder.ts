import type { MarkdownView, TFile } from 'obsidian';

export interface ChatContext {
	filePath?: string;
	fileContent?: string;
	selection?: string;
}

export interface BuildChatContextDeps {
	getActiveFile: () => TFile | null;
	readFile: (file: TFile) => Promise<string>;
	getFileTags: (file: TFile) => string[];
	getSelection: () => string;
	excludedTags: string[];
}

export async function buildChatContext(deps: BuildChatContextDeps): Promise<ChatContext> {
	const activeFile = deps.getActiveFile();
	if (!activeFile) {
		return {};
	}

	const tags = deps.getFileTags(activeFile);
	const hasExcludedTag = deps.excludedTags.some((tag) => tags.includes(tag));
	if (hasExcludedTag) {
		return { filePath: activeFile.path };
	}

	const fileContent = await deps.readFile(activeFile);
	const selection = deps.getSelection();
	return {
		filePath: activeFile.path,
		fileContent,
		selection,
	};
}
