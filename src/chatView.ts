import { ItemView, WorkspaceLeaf, TFile, MarkdownView, Notice } from 'obsidian';
import IFlowPlugin from './main';
import { IFlowService } from './iflowService';
import { ConversationStore, type Conversation, type Message } from './conversationStore';
import type { IFlowSettings } from './main';
import { initI18n, t, format } from './i18n';

export const VIEW_TYPE_IFLOW_CHAT = 'iflow-chat-view';

// Image attachment types
export type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

export interface ImageAttachment {
	id: string;
	name: string;
	mediaType: ImageMediaType;
	data: string;  // base64
	size: number;
	source: 'paste' | 'drop';
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_EXTENSIONS: Record<string, ImageMediaType> = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
};

export class IFlowChatView extends ItemView {
	plugin: IFlowPlugin;
	iflowService: IFlowService;
	private conversationStore: ConversationStore;
	private messages: { role: string; content: string; id: string }[] = [];
	private currentMessage = '';
	private isStreaming = false;

	// Settings - will be loaded from plugin settings
	private currentModel: string;
	private currentMode: string;
	private thinkingEnabled: boolean;

	// Available models and modes from iFlow CLI
	private availableModels: any[] = [];
	private availableModes: any[] = [];

	// Conversation management
	private currentConversationId: string | null = null;
	private conversationTitleEl: HTMLElement | null = null;
	private isLoadingMessages = false; // 防止在加载期间重复加载
	private showConversationPanel = false; // Panel visibility state

	// File attachment
	private currentFile: TFile | null = null;
	private attachedFile: TFile | null = null;  // Manually attached file

	// Image attachments
	private attachedImages: Map<string, ImageAttachment> = new Map();
	private imagePreviewEl: HTMLElement | null = null;
	private dropOverlay: HTMLElement | null = null;

	// UI Components
	private messagesContainer!: HTMLElement;
	private textarea!: HTMLTextAreaElement;
	private contextIndicator!: HTMLElement;

	constructor(leaf: WorkspaceLeaf, plugin: IFlowPlugin, iflowService: IFlowService) {
		super(leaf);
		this.plugin = plugin;
		this.iflowService = iflowService;

		// Load user preferences from settings
		this.currentModel = plugin.settings.lastUsedModel || 'glm-4.7';
		this.currentMode = plugin.settings.lastUsedMode || 'default';
		this.thinkingEnabled = plugin.settings.lastUsedThinking || false;

		// Initialize i18n
		initI18n();

		// 获取 vault 路径用于会话隔离存储
		const vaultPath = this.plugin.getVaultPath();
		this.conversationStore = new ConversationStore(vaultPath);

		// Subscribe to conversation changes
		this.conversationStore.subscribe(() => this.onConversationChange());
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

		// Top bar with conversation selector
		const topBar = chatContainer.createDiv({ cls: 'iflow-top-bar' });
		this.createConversationSelector(topBar);

		// Control bar (model + mode selectors) - moved to top
		const controlBar = chatContainer.createDiv({ cls: 'iflow-control-bar' });
		
		// Left side: Model selector
		const modelSelector = this.createModelSelector(controlBar);

		// Right side: Mode selector and thinking toggle
		const rightControls = controlBar.createDiv({ cls: 'iflow-control-right' });
		const modeSelector = this.createModeSelector(rightControls);
		const thinkingToggle = this.createThinkingToggle(rightControls);

		// Add context area (image preview + file indicator)
		const contextArea = chatContainer.createDiv({ cls: 'iflow-context-area' });
		
		// Image preview area
		this.imagePreviewEl = contextArea.createDiv({ cls: 'iflow-image-preview' });
		this.imagePreviewEl.style.display = 'none';
		
		// File context indicator with remove button
		const contextIndicator = contextArea.createDiv({ cls: 'iflow-context-indicator' });
		this.contextIndicator = contextIndicator;

		// Messages container - independent scrolling
		const messagesContainer = chatContainer.createDiv({ cls: 'iflow-messages' });
		this.messagesContainer = messagesContainer;

		// Input container - fixed at bottom
		const inputContainer = chatContainer.createDiv({ cls: 'iflow-input-container' });

		// Input wrapper
		const inputWrapper = inputContainer.createDiv({ cls: 'iflow-input-wrapper' });

		// Textarea for input
		const textarea = inputWrapper.createEl('textarea', {
			cls: 'iflow-input',
			attr: { placeholder: t().input.placeholder },
		});
		this.textarea = textarea;

		// Send button
		const sendButton = inputWrapper.createEl('button', {
			cls: 'iflow-send-button',
			text: t().ui.send,
		});
		sendButton.onclick = () => this.sendMessage();

		// Handle enter key
		textarea.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				this.sendMessage();
			}
		});

		// Setup drag/drop for images
		this.setupImageDropAndPaste(inputWrapper);

		// Update context when active file changes
		this.updateContext();
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', () => this.updateContext())
		);

		// Initialize conversation - load existing or create new
		this.initializeConversation();
	}

	private initializeConversation(): void {
		const state = this.conversationStore.getState();
		this.currentConversationId = state.currentConversationId;

		if (this.currentConversationId) {
			// Load existing conversation
			this.loadMessagesFromConversation();
		} else {
			// Create first conversation
			this.createNewConversation();
		}
	}

	async onClose() {
		// Cleanup
	}

	private updateContext() {
		const activeFile = this.plugin.getActiveFile();
		
		// Only auto-attach if setting is enabled
		if (this.plugin.settings.autoAttachFile) {
			this.currentFile = activeFile;
		} else {
			this.currentFile = null;
		}
		
		this.renderContextIndicator();
	}

	private renderContextIndicator() {
		this.contextIndicator.empty();
		
		const fileToShow = this.attachedFile || this.currentFile;
		
		if (fileToShow) {
			const fileSpan = this.contextIndicator.createSpan({ cls: 'iflow-context-file' });
			fileSpan.textContent = `${t().context.attached}${fileToShow.path}`;
			
			const removeBtn = this.contextIndicator.createSpan({ cls: 'iflow-context-remove', text: '×' });
			removeBtn.onclick = () => {
				this.attachedFile = null;
				this.currentFile = null;
				this.renderContextIndicator();
			};
		}
	}

	// ============================================
	// Image Handling
	// ============================================

	private setupImageDropAndPaste(inputWrapper: HTMLElement) {
		// Create drop overlay
		this.dropOverlay = inputWrapper.createDiv({ cls: 'iflow-drop-overlay' });
		const dropContent = this.dropOverlay.createDiv({ cls: 'iflow-drop-content' });
		
		// SVG icon
		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.setAttribute('viewBox', '0 0 24 24');
		svg.setAttribute('width', '32');
		svg.setAttribute('height', '32');
		svg.setAttribute('fill', 'none');
		svg.setAttribute('stroke', 'currentColor');
		svg.setAttribute('stroke-width', '2');
		svg.innerHTML = '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>';
		dropContent.appendChild(svg);
		dropContent.createSpan({ text: t().attachment.dropImageHere });

		// Drag and drop events
		inputWrapper.addEventListener('dragenter', (e) => this.handleDragEnter(e as DragEvent));
		inputWrapper.addEventListener('dragover', (e) => this.handleDragOver(e as DragEvent));
		inputWrapper.addEventListener('dragleave', (e) => this.handleDragLeave(e as DragEvent));
		inputWrapper.addEventListener('drop', (e) => this.handleDrop(e as DragEvent));

		// Paste handler
		this.textarea.addEventListener('paste', async (e) => {
			const items = e.clipboardData?.items;
			if (!items) return;

			for (let i = 0; i < items.length; i++) {
				const item = items[i];
				if (item.type.startsWith('image/')) {
					e.preventDefault();
					const file = item.getAsFile();
					if (file) {
						await this.addImageFromFile(file, 'paste');
					}
					return;
				}
			}
		});
	}

	private handleDragEnter(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (e.dataTransfer?.types.includes('Files')) {
			this.dropOverlay?.addClass('visible');
		}
	}

	private handleDragOver(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
	}

	private handleDragLeave(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		
		const inputWrapper = this.containerEl.querySelector('.iflow-input-wrapper');
		if (!inputWrapper) {
			this.dropOverlay?.removeClass('visible');
			return;
		}

		const rect = inputWrapper.getBoundingClientRect();
		if (
			e.clientX <= rect.left ||
			e.clientX >= rect.right ||
			e.clientY <= rect.top ||
			e.clientY >= rect.bottom
		) {
			this.dropOverlay?.removeClass('visible');
		}
	}

	private async handleDrop(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		this.dropOverlay?.removeClass('visible');

		const files = e.dataTransfer?.files;
		if (!files) return;

		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			if (this.isImageFile(file)) {
				await this.addImageFromFile(file, 'drop');
			}
		}
	}

	private isImageFile(file: File): boolean {
		return file.type.startsWith('image/') && this.getMediaType(file.name) !== null;
	}

	private getMediaType(filename: string): ImageMediaType | null {
		const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
		return IMAGE_EXTENSIONS[ext] || null;
	}

	private async addImageFromFile(file: File, source: 'paste' | 'drop'): Promise<boolean> {
		if (file.size > MAX_IMAGE_SIZE) {
			new Notice(t().attachment.imageTooLarge);
			return false;
		}

		const mediaType = this.getMediaType(file.name) || (file.type as ImageMediaType);
		if (!mediaType) {
			new Notice(t().attachment.unsupportedImageType);
			return false;
		}

		try {
			const base64 = await this.fileToBase64(file);

			const attachment: ImageAttachment = {
				id: this.generateImageId(),
				name: file.name || `image-${Date.now()}.${mediaType.split('/')[1]}`,
				mediaType,
				data: base64,
				size: file.size,
				source,
			};

			this.attachedImages.set(attachment.id, attachment);
			this.updateImagePreview();
			return true;
		} catch (error) {
			console.error('[iFlow] Failed to attach image:', error);
			return false;
		}
	}

	private async fileToBase64(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => {
				const result = reader.result as string;
				const base64 = result.split(',')[1];
				resolve(base64);
			};
			reader.onerror = reject;
			reader.readAsDataURL(file);
		});
	}

	private generateImageId(): string {
		return `img-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
	}

	private updateImagePreview() {
		if (!this.imagePreviewEl) return;
		
		this.imagePreviewEl.empty();

		if (this.attachedImages.size === 0) {
			this.imagePreviewEl.style.display = 'none';
			return;
		}

		this.imagePreviewEl.style.display = 'flex';

		for (const [id, image] of this.attachedImages) {
			this.renderImagePreview(id, image);
		}
	}

	private renderImagePreview(id: string, image: ImageAttachment) {
		const chip = this.imagePreviewEl!.createDiv({ cls: 'iflow-image-chip' });

		const thumb = chip.createDiv({ cls: 'iflow-image-thumb' });
		thumb.createEl('img', {
			attr: {
				src: `data:${image.mediaType};base64,${image.data}`,
				alt: image.name,
			},
		});

		const info = chip.createDiv({ cls: 'iflow-image-info' });
		info.createSpan({ cls: 'iflow-image-name', text: this.truncateName(image.name, 15) });
		info.createSpan({ cls: 'iflow-image-size', text: this.formatSize(image.size) });

		const remove = chip.createSpan({ cls: 'iflow-image-remove', text: '×' });
		remove.onclick = () => {
			this.attachedImages.delete(id);
			this.updateImagePreview();
		};

		thumb.onclick = () => this.showFullImage(image);
	}

	private showFullImage(image: ImageAttachment) {
		const overlay = document.body.createDiv({ cls: 'iflow-image-modal-overlay' });
		const modal = overlay.createDiv({ cls: 'iflow-image-modal' });

		modal.createEl('img', {
			attr: {
				src: `data:${image.mediaType};base64,${image.data}`,
				alt: image.name,
			},
		});

		const closeBtn = modal.createDiv({ cls: 'iflow-image-modal-close', text: '×' });

		const handleEsc = (e: KeyboardEvent) => {
			if (e.key === 'Escape') close();
		};

		const close = () => {
			document.removeEventListener('keydown', handleEsc);
			overlay.remove();
		};

		closeBtn.onclick = close;
		overlay.onclick = (e) => {
			if (e.target === overlay) close();
		};
		document.addEventListener('keydown', handleEsc);
	}

	private truncateName(name: string, maxLen: number): string {
		if (name.length <= maxLen) return name;
		const ext = name.substring(name.lastIndexOf('.'));
		const base = name.substring(0, name.length - ext.length);
		return `${base.substring(0, maxLen - ext.length - 3)}...${ext}`;
	}

	private formatSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	private streamingTimeout: NodeJS.Timeout | null = null;

	private async sendMessage() {
		const content = this.textarea.value.trim();

		// Debug logging
		console.log('[iFlow Chat] sendMessage called', {
			content,
			isStreaming: this.isStreaming,
			currentConversationId: this.currentConversationId
		});

		if (!content) {
			console.log('[iFlow Chat] Message blocked: empty content');
			return;
		}

		// Force reset if stuck in streaming state
		if (this.isStreaming) {
			console.warn('[iFlow Chat] Force reset: was stuck in streaming state');
			this.isStreaming = false;
			if (this.streamingTimeout) {
				clearTimeout(this.streamingTimeout);
				this.streamingTimeout = null;
			}
		}

		// Ensure we have a conversation
		if (!this.currentConversationId) {
			console.log('[iFlow Chat] Creating new conversation');
			this.createNewConversation();
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

		// Add user message to UI
		const userMsgId = this.addMessage('user', content);
		this.textarea.value = '';

		// Clear attached images after sending
		this.attachedImages.clear();
		this.updateImagePreview();

		// Add user message to conversation
		if (this.currentConversationId) {
			this.conversationStore.addUserMessage(this.currentConversationId, content);
		}

		// Add assistant message placeholder
		const assistantMsgId = this.addMessage('assistant', '');
		this.currentMessage = '';
		this.isStreaming = true;

		console.log('[iFlow Chat] Starting streaming', {
			userMsgId,
			assistantMsgId,
			isStreaming: this.isStreaming
		});

		// Set timeout to reset streaming state if onEnd is not called
		this.streamingTimeout = setTimeout(() => {
			console.warn('[iFlow Chat] Streaming timeout: forcing reset');
			this.isStreaming = false;
			this.streamingTimeout = null;
		}, 60000); // 60 second timeout

		// Scroll to bottom
		if (this.plugin.settings.enableAutoScroll) {
			this.scrollToBottom();
		}

		// Cleanup function
		const cleanup = () => {
			if (this.streamingTimeout) {
				clearTimeout(this.streamingTimeout);
				this.streamingTimeout = null;
			}
			this.isStreaming = false;
			console.log('[iFlow Chat] Cleanup: streaming state reset');
		};

		// Send to iFlow
		try {
			await this.iflowService.sendMessage({
				content,
				filePath: activeFile?.path,
				fileContent,
				selection,
				model: this.currentModel,
				mode: this.currentMode,
				thinkingEnabled: this.thinkingEnabled,
				onChunk: (chunk: string) => {
					this.currentMessage += chunk;
					this.updateMessage(assistantMsgId, this.currentMessage);

					if (this.plugin.settings.enableAutoScroll) {
						this.scrollToBottom();
					}
				},
				onTool: (tool: import('./iflowService').IFlowToolCall) => {
					console.log('[iFlow Chat] Tool call:', tool);
					this.showOrUpdateToolCall(assistantMsgId, tool);

					if (this.plugin.settings.enableAutoScroll) {
						this.scrollToBottom();
					}
				},
				onEnd: () => {
					console.log('[iFlow Chat] onEnd called, setting isStreaming = false');
					cleanup();

					// Save assistant message to conversation
					if (this.currentConversationId && this.currentMessage) {
						this.conversationStore.addAssistantMessage(
							this.currentConversationId,
							this.currentMessage
						);
					}

					// Update UI meta info (message count, etc) after streaming ends
					this.updateConversationUI();
				},
				onError: (error: string) => {
					console.log('[iFlow Chat] onError called', error);
					cleanup();
					this.updateMessage(assistantMsgId, `Error: ${error}`);
				},
			});
		} catch (error) {
			console.log('[iFlow Chat] Exception in sendMessage', error);
			cleanup();
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
		roleEl.textContent = role === 'user' ? t().roles.user : t().roles.assistant;

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

	private showOrUpdateToolCall(messageId: string, tool: import('./iflowService').IFlowToolCall): void {
		const messageEl = this.messagesContainer.querySelector(`[data-id="${messageId}"]`);
		if (!messageEl) return;

		const contentEl = messageEl.querySelector('.iflow-message-content');
		if (!contentEl) return;

		// Find or create tool call container
		let toolContainer = contentEl.querySelector(`.iflow-tool-call[data-tool-id="${tool.id}"]`);

		if (!toolContainer) {
			// Create new tool call element
			toolContainer = contentEl.createDiv({
				cls: `iflow-tool-call iflow-tool-status-${tool.status || 'running'}`,
			});
			(toolContainer as any).dataset.toolId = tool.id;

			// Tool header
			const header = toolContainer.createDiv({ cls: 'iflow-tool-header' });

			const statusIcon = tool.status === 'completed' ? '✅' :
			                   tool.status === 'error' ? '❌' : '🔄';

			header.createSpan({ cls: 'iflow-tool-icon', text: statusIcon });
			header.createSpan({ cls: 'iflow-tool-name', text: tool.name });

			// Tool details (collapsible)
			const details = toolContainer.createDiv({ cls: 'iflow-tool-details' });

			if (tool.input && Object.keys(tool.input).length > 0) {
				details.createDiv({ cls: 'iflow-tool-section-title', text: t().tools.params });
				const inputPre = details.createEl('pre', { cls: 'iflow-tool-input' });
				inputPre.createEl('code', { text: JSON.stringify(tool.input, null, 2) });
			}
		} else {
			// Update existing tool call
			toolContainer.className = `iflow-tool-call iflow-tool-status-${tool.status || 'running'}`;

			const iconEl = toolContainer.querySelector('.iflow-tool-icon');
			if (iconEl) {
				iconEl.textContent = tool.status === 'completed' ? '✅' :
				                    tool.status === 'error' ? '❌' : '🔄';
			}

			// Add result if completed
			if (tool.status === 'completed' && tool.result) {
				let resultEl = toolContainer.querySelector('.iflow-tool-result');
				if (!resultEl) {
					const details = toolContainer.querySelector('.iflow-tool-details');
					if (details) {
						details.createDiv({ cls: 'iflow-tool-section-title', text: t().tools.result });
						resultEl = details.createEl('pre', { cls: 'iflow-tool-result' });
						const resultText = typeof tool.result === 'string'
							? tool.result
							: JSON.stringify(tool.result, null, 2);
						resultEl.createEl('code', { text: resultText });
					}
				}
			}

			// Add error if failed
			if (tool.status === 'error' && tool.error) {
				let errorEl = toolContainer.querySelector('.iflow-tool-error');
				if (!errorEl) {
					const details = toolContainer.querySelector('.iflow-tool-details');
					if (details) {
						errorEl = details.createDiv({ cls: 'iflow-tool-error' });
						errorEl.createSpan({ text: `${t().tools.error}${tool.error}` });
					}
				}
			}
		}
	}

	private scrollToBottom(): void {
		// Use requestAnimationFrame to ensure DOM has updated
		requestAnimationFrame(() => {
			this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
		});

		// Double-check with a small delay to handle async updates
		setTimeout(() => {
			this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
		}, 10);
	}

	// ============================================
	// UI Component Creators
	// ============================================

	private addWelcomeMessage(): void {
		this.messagesContainer.createDiv({
			cls: 'iflow-welcome',
		}, (el) => {
			el.createEl('h2', { text: t().welcome.title });
			el.createEl('p', { text: t().welcome.subtitle });
			el.createEl('p', { text: t().welcome.helpTitle });
			t().welcome.helpItems.forEach(item => {
				el.createEl('p', { text: item });
			});
			el.createEl('p', { text: t().welcome.hint });
		});
	}

	private createModelSelector(container: HTMLElement): HTMLElement {
		const selector = container.createDiv({ cls: 'iflow-model-selector' });

		// Full models list (matching VS Code plugin) - use i18n for names
		const defaultModels = [
			{ id: 'glm-4.7', name: t().models['glm-4.7'] },
			{ id: 'glm-5', name: t().models['glm-5'] },
			{ id: 'deepseek-v3.2-chat', name: t().models['deepseek-v3.2-chat'] },
			{ id: 'iFlow-ROME-30BA3B', name: t().models['iFlow-ROME-30BA3B'] },
			{ id: 'qwen3-coder-plus', name: t().models['qwen3-coder-plus'] },
			{ id: 'kimi-k2-thinking', name: t().models['kimi-k2-thinking'] },
			{ id: 'minimax-m2.5', name: t().models['minimax-m2.5'] },
			{ id: 'minimax-m2.1', name: t().models['minimax-m2.1'] },
			{ id: 'kimi-k2-0905', name: t().models['kimi-k2-0905'] },
			{ id: 'kimi-k2.5', name: t().models['kimi-k2.5'] },
		];

		this.availableModels = defaultModels;

		// Button
		const btn = selector.createEl('button', {
			cls: 'iflow-model-btn ready',
		});

		const currentModelObj = defaultModels.find(m => m.id === this.currentModel) || defaultModels[0];
		const label = btn.createSpan({ cls: 'iflow-model-label', text: currentModelObj.name });
		const chevron = btn.createDiv({ cls: 'iflow-model-chevron' });
		chevron.innerHTML = `
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polyline points="6 9 12 15 18 9"></polyline>
			</svg>
		`;

		// Dropdown
		const dropdown = selector.createDiv({ cls: 'iflow-model-dropdown' });

		this.availableModels.forEach(model => {
			dropdown.createDiv({
				cls: `iflow-model-option ${model.id === this.currentModel ? 'selected' : ''}`,
				text: model.name,
			}, (el) => {
				el.onclick = async (e) => {
					e.stopPropagation();
					this.currentModel = model.id;
					label.textContent = model.name;
					dropdown.querySelectorAll('.iflow-model-option').forEach(opt => {
						opt.removeClass('selected');
					});
					el.addClass('selected');
					// Save user preference
					this.plugin.settings.lastUsedModel = model.id;
					await this.plugin.saveSettings();
					// Close dropdown after selection
					selector.removeClass('open');
				};
			});
		});

		// Click to toggle dropdown
		btn.onclick = (e) => {
			e.stopPropagation();
			// Close other dropdowns first
			document.querySelectorAll('.iflow-model-selector.open, .iflow-mode-selector.open').forEach(el => {
				el.removeClass('open');
			});
			selector.toggleClass('open', !selector.hasClass('open'));
		};

		// Close dropdown when clicking outside
		const closeHandler = (e: MouseEvent) => {
			if (!selector.contains(e.target as Node)) {
				selector.removeClass('open');
			}
		};
		document.addEventListener('click', closeHandler);

		return selector;
	}

	private createModeSelector(container: HTMLElement): HTMLElement {
		const selector = container.createDiv({ cls: 'iflow-mode-selector' });

		// Modes list (use i18n)
		const modes = [
			{ id: 'default', name: t().modes.default.name, icon: t().modes.default.icon },
			{ id: 'yolo', name: t().modes.yolo.name, icon: t().modes.yolo.icon },
			{ id: 'smart', name: t().modes.smart.name, icon: t().modes.smart.icon },
			{ id: 'plan', name: t().modes.plan.name, icon: t().modes.plan.icon },
		];

		this.availableModes = modes;

		// Trigger button (like model selector)
		const btn = selector.createEl('button', {
			cls: 'iflow-mode-btn',
		});

		const currentMode = modes.find(m => m.id === this.currentMode);
		const icon = btn.createSpan({ cls: 'iflow-mode-icon', text: currentMode?.icon || t().modes.default.icon });
		const label = btn.createSpan({ cls: 'iflow-mode-label', text: currentMode?.name || t().modes.default.name });
		const chevron = btn.createDiv({ cls: 'iflow-mode-chevron' });
		chevron.innerHTML = `
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polyline points="6 9 12 15 18 9"></polyline>
			</svg>
		`;

		// Dropdown
		const dropdown = selector.createDiv({ cls: 'iflow-mode-dropdown' });

		modes.forEach(mode => {
			dropdown.createDiv({
				cls: `iflow-mode-option ${mode.id === this.currentMode ? 'selected' : ''}`,
				attr: { 'data-mode': mode.id },
			}, (el) => {
				const optIcon = el.createSpan({ cls: 'iflow-mode-icon', text: mode.icon });
				const optLabel = el.createSpan({ text: mode.name });
				el.onclick = async (e) => {
					e.stopPropagation();
					this.currentMode = mode.id;
					icon.textContent = mode.icon;
					label.textContent = mode.name;
					dropdown.querySelectorAll('.iflow-mode-option').forEach(opt => {
						opt.removeClass('selected');
					});
					el.addClass('selected');
					// Save user preference
					this.plugin.settings.lastUsedMode = mode.id;
					await this.plugin.saveSettings();
					// Close dropdown after selection
					selector.removeClass('open');
				};
			});
		});

		// Click to toggle dropdown
		btn.onclick = (e) => {
			e.stopPropagation();
			// Close other dropdowns first
			document.querySelectorAll('.iflow-model-selector.open, .iflow-mode-selector.open').forEach(el => {
				el.removeClass('open');
			});
			selector.toggleClass('open', !selector.hasClass('open'));
		};

		// Close dropdown when clicking outside
		const closeHandler = (e: MouseEvent) => {
			if (!selector.contains(e.target as Node)) {
				selector.removeClass('open');
			}
		};
		document.addEventListener('click', closeHandler);

		return selector;
	}

	private createThinkingToggle(container: HTMLElement): HTMLElement {
		const toggle = container.createEl('button', {
			cls: 'iflow-thinking-toggle',
		});

		// Apply saved state
		if (this.thinkingEnabled) {
			toggle.addClass('active');
		}

		const icon = toggle.createSpan({ cls: 'iflow-thinking-icon', text: '🧠' });
		const label = toggle.createSpan({ text: t().ui.thinking });

		toggle.onclick = async () => {
			this.thinkingEnabled = !this.thinkingEnabled;
			toggle.toggleClass('active', this.thinkingEnabled);
			// Save user preference
			this.plugin.settings.lastUsedThinking = this.thinkingEnabled;
			await this.plugin.saveSettings();
		};

		return toggle;
	}

	// ============================================
	// Conversation Management
	// ============================================

	private createConversationSelector(container: HTMLElement): void {
		const selector = container.createDiv({ cls: 'iflow-conversation-selector' });

		// Current conversation trigger
		const trigger = selector.createEl('button', {
			cls: 'iflow-conversation-trigger',
			attr: {
				'aria-expanded': 'false',
				'aria-haspopup': 'listbox',
			},
		});

		this.conversationTitleEl = trigger.createSpan({
			cls: 'iflow-conversation-title',
			text: t().ui.newConversation,
		});

		const meta = trigger.createSpan({ cls: 'iflow-conversation-meta', text: t().ui.noMessages });

		const chevron = trigger.createDiv({ cls: 'iflow-conversation-chevron' });
		chevron.innerHTML = `
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polyline points="6 9 12 15 18 9"></polyline>
			</svg>
		`;

		// New conversation button
		const newBtn = selector.createEl('button', {
			cls: 'iflow-new-conversation-btn',
			text: '+',
		});
		newBtn.onclick = () => this.createNewConversation();

		// Conversation dropdown panel
		const panel = selector.createDiv({ cls: 'iflow-conversation-panel hidden' });

		// Search box
		const searchBox = panel.createDiv({ cls: 'iflow-conversation-search' });
		const searchInput = searchBox.createEl('input', {
			type: 'text',
			placeholder: t().ui.searchConversations,
		});

		// Conversation list
		const list = panel.createDiv({ cls: 'iflow-conversation-list' });
		this.renderConversationList(list);

		// Update trigger meta
		this.updateConversationMeta(meta);

		// Store references for later updates
		(this as any).conversationTrigger = trigger;
		(this as any).conversationPanel = panel;
		(this as any).conversationList = list;
		(this as any).conversationMeta = meta;

		// Trigger click handler - toggle panel visibility
		trigger.onclick = (e) => {
			e.stopPropagation();
			this.toggleConversationPanel();
		};

		// Search input handler
		searchInput.addEventListener('input', (e) => {
			const target = e.target as HTMLInputElement;
			this.renderConversationList(list, target.value);
		});

		// Close panel when clicking outside
		document.addEventListener('click', (e) => {
			if (this.showConversationPanel &&
			    !selector.contains(e.target as Node)) {
				this.closeConversationPanel();
			}
		});
	}

	private renderConversationList(listContainer: HTMLElement, searchQuery: string = ''): void {
		listContainer.empty();

		const state = this.conversationStore.getState();

		// Filter conversations by search query
		const filteredConversations = state.conversations.filter(c =>
			c.title.toLowerCase().includes(searchQuery.toLowerCase())
		);

		// Group conversations by date
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const todayConversations = filteredConversations.filter(c => {
			const date = new Date(c.updatedAt);
			return date >= today;
		});

		if (todayConversations.length > 0) {
			const groupLabel = listContainer.createDiv({
				cls: 'iflow-conversation-group-label',
				text: t().ui.today,
			});

			todayConversations.forEach(conv => {
				this.renderConversationItem(listContainer, conv);
			});
		}

		if (filteredConversations.length === 0) {
			listContainer.createDiv({
				cls: 'iflow-conversation-empty',
				text: searchQuery ? t().ui.noConversationsFound : t().ui.noConversations,
			});
		}
	}

	private renderConversationItem(container: HTMLElement, conversation: Conversation): void {
		const item = container.createDiv({
			cls: `iflow-conversation-item ${conversation.id === this.currentConversationId ? 'active' : ''}`,
		});

		const info = item.createDiv({ cls: 'iflow-conversation-item-info' });

		const title = info.createDiv({
			cls: 'iflow-conversation-item-title',
			text: conversation.title,
		});

		const meta = info.createDiv({ cls: 'iflow-conversation-item-meta' });
		meta.createSpan({ text: `${conversation.messages.length} ${t().ui.messages}` });

		const time = item.createDiv({
			cls: 'iflow-conversation-item-time',
			text: this.formatTime(conversation.updatedAt),
		});

		// Delete button
		const deleteBtn = item.createEl('button', {
			cls: 'iflow-conversation-item-delete',
			text: '×',
		});
		deleteBtn.onclick = (e) => {
			e.stopPropagation();
			this.deleteConversation(conversation.id);
		};

		item.onclick = () => {
			this.switchConversation(conversation.id);
		};
	}

	private formatTime(timestamp: number): string {
		const date = new Date(timestamp);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);

		if (diffMins < 1) return t().ui.now;
		if (diffMins < 60) return format(t().ui.minutesAgo, { n: diffMins });
		if (diffHours < 24) return format(t().ui.hoursAgo, { n: diffHours });
		return date.toLocaleDateString();
	}

	private updateConversationMeta(meta: HTMLElement): void {
		const current = this.conversationStore.getCurrentConversation();
		if (current) {
			meta.textContent = `${current.messages.length} ${t().ui.messages}`;
		} else {
			meta.textContent = t().ui.noMessages;
		}
	}

	private onConversationChange(): void {
		// 防止在流式传输期间重新加载（会清空正在显示的消息）
		if (this.isStreaming) {
			console.log('[iFlow Chat] Skipping reload during streaming');
			// 只更新元数据，不重新加载消息
			this.updateConversationUI();
			return;
		}

		// 防止重复加载
		if (this.isLoadingMessages) {
			console.log('[iFlow Chat] Already loading, skipping');
			return;
		}

		this.isLoadingMessages = true;

		const state = this.conversationStore.getState();
		this.currentConversationId = state.currentConversationId;

		// Update title
		const current = this.conversationStore.getCurrentConversation();
		if (this.conversationTitleEl && current) {
			this.conversationTitleEl.textContent = current.title;
		}

		// Reload messages
		this.loadMessagesFromConversation();

		// Re-render list
		const list = (this as any).conversationList as HTMLElement;
		if (list) {
			this.renderConversationList(list);
		}

		// Update meta
		const meta = (this as any).conversationMeta as HTMLElement;
		if (meta) {
			this.updateConversationMeta(meta);
		}

		this.isLoadingMessages = false;
	}

	private updateConversationUI(): void {
		// 只更新元数据（标题、消息数量等），不重新加载消息
		const current = this.conversationStore.getCurrentConversation();
		if (!current) return;

		// Update title
		if (this.conversationTitleEl) {
			this.conversationTitleEl.textContent = current.title;
		}

		// Update meta
		const meta = (this as any).conversationMeta as HTMLElement;
		if (meta) {
			this.updateConversationMeta(meta);
		}

		// Re-render list (to show updated message counts)
		const list = (this as any).conversationList as HTMLElement;
		if (list) {
			this.renderConversationList(list);
		}
	}

	private createNewConversation(): void {
		// Close panel when creating new conversation
		this.closeConversationPanel();

		// Create new conversation via store - this will trigger onConversationChange
		this.conversationStore.newConversation(
			this.currentModel as any,
			this.currentMode as any,
			this.thinkingEnabled
		);

		// Note: onConversationChange will handle the UI updates
	}

	private toggleConversationPanel(): void {
		this.showConversationPanel = !this.showConversationPanel;
		this.updateConversationPanelVisibility();
	}

	private closeConversationPanel(): void {
		this.showConversationPanel = false;
		this.updateConversationPanelVisibility();
	}

	private updateConversationPanelVisibility(): void {
		const trigger = (this as any).conversationTrigger as HTMLElement;
		const panel = (this as any).conversationPanel as HTMLElement;

		if (trigger) {
			trigger.setAttribute('aria-expanded', this.showConversationPanel ? 'true' : 'false');
		}

		if (panel) {
			if (this.showConversationPanel) {
				panel.removeClass('hidden');
				// Focus search input when opening
				const searchInput = panel.querySelector('.iflow-conversation-search input') as HTMLInputElement;
				searchInput?.focus();
			} else {
				panel.addClass('hidden');
			}
		}
	}

	private switchConversation(conversationId: string): void {
		this.conversationStore.switchConversation(conversationId);
		// Close panel after switching
		this.closeConversationPanel();
		// onConversationChange will be called automatically
	}

	private deleteConversation(conversationId: string): void {
		this.conversationStore.deleteConversation(conversationId);
		// onConversationChange will be called automatically
	}

	private loadMessagesFromConversation(): void {
		this.messagesContainer.empty();

		// Reset streaming state
		this.isStreaming = false;
		this.currentMessage = '';

		const current = this.conversationStore.getCurrentConversation();
		if (!current) {
			// Show welcome message if no conversation
			this.addWelcomeMessage();
			this.messages = [];
			return;
		}

		// Clear and reload messages array
		this.messages = [];

		// Load messages from conversation
		current.messages.forEach(msg => {
			this.addMessageToUI(msg.role, msg.content, msg.id);
			// Also add to messages array
			this.messages.push({ role: msg.role, content: msg.content, id: msg.id });
		});

		// Scroll to bottom
		this.scrollToBottom();
	}

	private addMessageToUI(role: string, content: string, id: string): void {
		const messageEl = this.messagesContainer.createDiv({
			cls: `iflow-message iflow-message-${role}`,
		});
		messageEl.dataset.id = id;

		const roleEl = messageEl.createDiv({ cls: 'iflow-message-role' });
		roleEl.textContent = role === 'user' ? t().roles.user : t().roles.assistant;

		const contentEl = messageEl.createDiv({ cls: 'iflow-message-content' });
		contentEl.innerHTML = this.formatMessage(content);
	}

	// ============================================
	// Update available options from iFlow CLI
	// ============================================

	updateAvailableModels(models: any[]): void {
		this.availableModels = models;
		// Rebuild model selector UI
		// TODO: Implement UI refresh
	}

	updateAvailableModes(modes: any[]): void {
		this.availableModes = modes;
		// Rebuild mode selector UI
		// TODO: Implement UI refresh
	}
}
