import { ItemView, WorkspaceLeaf, TFile, MarkdownView } from 'obsidian';
import IFlowPlugin from './main';
import { IFlowService } from './iflowService';
import type { IFlowSettings } from './main';

export const VIEW_TYPE_IFLOW_CHAT = 'iflow-chat-view';

export class IFlowChatView extends ItemView {
	plugin: IFlowPlugin;
	iflowService: IFlowService;
	private messages: { role: string; content: string; id: string }[] = [];
	private currentMessage = '';
	private isStreaming = false;

	constructor(leaf: WorkspaceLeaf, plugin: IFlowPlugin, iflowService: IFlowService) {
		super(leaf);
		this.plugin = plugin;
		this.iflowService = iflowService;
	}

	getViewType(): string {
		return VIEW_TYPE_IFLOW_CHAT;
	}

	getDisplayText(): string {
		return 'iFlow Chat';
	}

	getIcon(): string {
		return 'message-square';
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass('iflow-chat-container');

		// Create chat UI
		const chatContainer = container.createDiv({ cls: 'iflow-chat' });

		// Messages container
		const messagesContainer = chatContainer.createDiv({ cls: 'iflow-messages' });
		this.messagesContainer = messagesContainer;

		// Input container
		const inputContainer = chatContainer.createDiv({ cls: 'iflow-input-container' });

		// Textarea for input
		const textarea = inputContainer.createEl('textarea', {
			cls: 'iflow-input',
			attr: { placeholder: 'Ask iFlow anything... (Use @ to reference files, Shift+Enter for new line)' },
		});
		this.textarea = textarea;

		// Send button
		const sendButton = inputContainer.createEl('button', {
			cls: 'iflow-send-button',
			text: 'Send',
		});
		sendButton.onclick = () => this.sendMessage();

		// Handle enter key
		textarea.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				this.sendMessage();
			}
		});

		// Add context indicator
		const contextIndicator = chatContainer.createDiv({ cls: 'iflow-context-indicator' });
		this.contextIndicator = contextIndicator;

		// Update context when active file changes
		this.updateContext();
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', () => this.updateContext())
		);

		// Add welcome message
		this.addMessage('assistant', 'Hello! I\'m iFlow, your AI assistant. I can help you with:\n\n• Reading and editing your notes\n• Searching your vault\n• Running commands\n• Answering questions\n\nHow can I help you today?');
	}

	async onClose() {
		// Cleanup
	}

	private updateContext() {
		const activeFile = this.plugin.getActiveFile();
		if (activeFile) {
			this.currentFile = activeFile;
			this.contextIndicator.textContent = `📄 ${activeFile.path}`;
		} else {
			this.currentFile = null;
			this.contextIndicator.textContent = '';
		}
	}

	private async sendMessage() {
		const content = this.textarea.value.trim();
		if (!content || this.isStreaming) {
			return;
		}

		// Get context
		const activeFile = this.plugin.getActiveFile();
		let fileContent = '';
		let selection = '';

		if (activeFile) {
			// Check if file has excluded tags
			const metadata = this.app.metadataCache.getFileCache(activeFile);
			const tags = metadata?.tags?.map(t => t.tag) || [];
			const hasExcludedTag = this.plugin.settings.excludedTags.some(tag =>
				tags.includes(tag)
			);

			if (!hasExcludedTag) {
				fileContent = await this.app.vault.read(activeFile);

				// Get selection if available
				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (activeView?.editor) {
					selection = activeView.editor.getSelection();
				}
			}
		}

		// Add user message
		this.addMessage('user', content);
		this.textarea.value = '';

		// Add assistant message placeholder
		const assistantMsgId = this.addMessage('assistant', '');
		this.currentMessage = '';
		this.isStreaming = true;

		// Scroll to bottom
		if (this.plugin.settings.enableAutoScroll) {
			this.scrollToBottom();
		}

		// Send to iFlow
		try {
			await this.iflowService.sendMessage({
				content,
				filePath: activeFile?.path,
				fileContent,
				selection,
				onChunk: (chunk: string) => {
					this.currentMessage += chunk;
					this.updateMessage(assistantMsgId, this.currentMessage);

					if (this.plugin.settings.enableAutoScroll) {
						this.scrollToBottom();
					}
				},
				onEnd: () => {
					this.isStreaming = false;
				},
				onError: (error: string) => {
					this.isStreaming = false;
					this.updateMessage(assistantMsgId, `Error: ${error}`);
				},
			});
		} catch (error) {
			this.isStreaming = false;
			this.updateMessage(assistantMsgId, `Error: ${error.message}`);
		}
	}

	private addMessage(role: string, content: string): string {
		const id = Date.now().toString();
		this.messages.push({ role, content, id });

		const messageEl = this.messagesContainer.createDiv({
			cls: `iflow-message iflow-message-${role}`,
		});
		messageEl.dataset.id = id;

		const roleEl = messageEl.createDiv({ cls: 'iflow-message-role' });
		roleEl.textContent = role === 'user' ? 'You' : 'iFlow';

		const contentEl = messageEl.createDiv({ cls: 'iflow-message-content' });
		contentEl.innerHTML = this.formatMessage(content);

		return id;
	}

	private updateMessage(id: string, content: string): void {
		const messageEl = this.messagesContainer.querySelector(`[data-id="${id}"]`);
		if (messageEl) {
			const contentEl = messageEl.querySelector('.iflow-message-content');
			if (contentEl) {
				contentEl.innerHTML = this.formatMessage(content);
			}
		}
	}

	private formatMessage(content: string): string {
		// Simple markdown formatting
		return content
			.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
			.replace(/`([^`]+)`/g, '<code>$1</code>')
			.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
			.replace(/\n/g, '<br>');
	}

	private scrollToBottom(): void {
		this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
	}

	// Properties for type safety
	private messagesContainer: HTMLElement;
	private textarea: HTMLTextAreaElement;
	private contextIndicator: HTMLElement;
	private currentFile: TFile | null = null;
}
