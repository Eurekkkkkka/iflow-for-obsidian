import { ItemView, WorkspaceLeaf, TFile, MarkdownView, Notice } from 'obsidian';
import IFlowPlugin from './main';
import { IFlowService } from './iflowService';
import { type Conversation, type Message } from './conversationStore';
import type { IFlowSettings } from './main';
import { initI18n, t, format } from './i18n';
import { MessageListView } from './ui/chat/messageListView';
import { ToolCallView } from './ui/chat/toolCallView';
import { type ImageMediaType, type ImageAttachment, MAX_IMAGE_SIZE, getImageMediaType, isSupportedImageFile, generateImageAttachmentId, truncateImageName, formatImageSize } from './ui/chat/imageAttachmentView';
import { ConversationService } from './domain/conversation/conversationService';
import { LocalStorageConversationRepository } from './domain/conversation/conversationRepository';
import { resolveInputState } from './ui/chat/inputState';
import { ScrollPositionStore } from './ui/chat/scrollPositionStore';
import { buildQuotaWarningMessage } from './domain/conversation/storageQuotaPolicy';
import { getButtonAriaLabel } from './ui/chat/ariaButtonLabels';

export const VIEW_TYPE_IFLOW_CHAT = 'iflow-chat-view';

export type { ImageMediaType, ImageAttachment };

export class IFlowChatView extends ItemView {
	plugin: IFlowPlugin;
	iflowService: IFlowService;
	private conversationService: ConversationService;
	private messageListView!: MessageListView;
	private toolCallView!: ToolCallView;
	private messages: { role: string; content: string; id: string }[] = [];
	private currentMessage = '';
	private currentThought = '';
	private isStreaming = false;



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
	private connectionStatusEl: HTMLElement | null = null;
	private connectionCheckTimer: ReturnType<typeof setInterval> | null = null;
	private sendButton: HTMLButtonElement | null = null;
	private scrollPositionStore = new ScrollPositionStore();

	constructor(leaf: WorkspaceLeaf, plugin: IFlowPlugin, iflowService: IFlowService) {
		super(leaf);
		this.plugin = plugin;
		this.iflowService = iflowService;

		// Initialize i18n
		initI18n();

		// 获取 vault 路径用于会话隔离存储
		const vaultPath = this.plugin.getVaultPath();
		const repository = new LocalStorageConversationRepository(vaultPath);
		this.conversationService = new ConversationService(repository);

		// Subscribe to conversation changes
		this.conversationService.subscribe(() => this.onConversationChange());
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

		// Connection status bar (Task 2.3)
		this.connectionStatusEl = chatContainer.createDiv({ cls: 'iflow-connection-status iflow-status-detecting' });
		this.renderConnectionStatus('detecting');

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

		// Initialize UI sub-components
		this.messageListView = new MessageListView(messagesContainer, {
			user: t().roles.user,
			assistant: t().roles.assistant,
		});
		this.toolCallView = new ToolCallView({
			params: t().tools.params,
			result: t().tools.result,
			errorPrefix: t().tools.error,
		});

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

		// Send button (round icon)
		const sendButton = inputWrapper.createEl('button', {
			cls: 'iflow-send-button',
			text: '↑',
			attr: { 'aria-label': t().ui.send },
		});
		this.sendButton = sendButton as unknown as HTMLButtonElement;
		sendButton.onclick = () => this.sendMessage();

		// Handle enter key
		textarea.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				this.sendMessage();
			}
		});

		// Update send button state whenever textarea content changes
		textarea.addEventListener('input', () => this.updateInputState());

		// Setup drag/drop for images
		this.setupImageDropAndPaste(inputWrapper);

		// Update context when active file changes
		this.updateContext();
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', () => this.updateContext())
		);

		// Initialize conversation - load existing or create new
		this.initializeConversation();

		// Start connection status polling (Task 2.3)
		this.startConnectionStatusPolling();
	}

	private initializeConversation(): void {
		const state = this.conversationService.getState();
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
		if (this.connectionCheckTimer !== null) {
			clearInterval(this.connectionCheckTimer);
			this.connectionCheckTimer = null;
		}
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
			
			const removeBtn = this.contextIndicator.createSpan({
				cls: 'iflow-context-remove',
				text: '×',
				attr: { 'role': 'button', 'aria-label': getButtonAriaLabel('contextRemove'), 'tabindex': '0' },
			});
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
		return isSupportedImageFile(file);
	}

	private getMediaType(filename: string): ImageMediaType | null {
		return getImageMediaType(filename);
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
		return generateImageAttachmentId();
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

		// Task 6.5: Bulk clear button when more than 1 image attached
		if (this.attachedImages.size > 1) {
			const clearAllBtn = this.imagePreviewEl.createDiv({ cls: 'iflow-image-clear-all' });
			clearAllBtn.textContent = `清空全部 (${this.attachedImages.size})`;
			clearAllBtn.onclick = () => {
				this.attachedImages.clear();
				this.updateImagePreview();
			};
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

		const remove = chip.createSpan({
			cls: 'iflow-image-remove',
			text: '×',
			attr: { 'role': 'button', 'aria-label': getButtonAriaLabel('imageRemove'), 'tabindex': '0' },
		});
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

		const closeBtn = modal.createDiv({
			cls: 'iflow-image-modal-close',
			text: '×',
			attr: { 'role': 'button', 'aria-label': getButtonAriaLabel('modalClose'), 'tabindex': '0' },
		});

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
		return truncateImageName(name, maxLen);
	}

	private formatSize(bytes: number): string {
		return formatImageSize(bytes);
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
			this.conversationService.appendUserMessage(this.currentConversationId, content);
		}

		// Add assistant message placeholder with loading state
		const assistantMsgId = this.addMessage('assistant', '');
		this.currentMessage = '';
		this.isStreaming = true;
		this.updateInputState(); // Task 6.2: disable send during streaming
		
		// Show loading animation
		this.showLoadingAnimation(assistantMsgId);

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
			this.currentThought = '';
			this.updateInputState();
			// Task 7.5: Check storage quota after each response
			this.checkAndWarnQuota();
			console.log('[iFlow Chat] Cleanup: streaming state reset');
		};

		// Show "sending" status (Task 2.8)
		this.renderConnectionStatus('detecting');

		// Send to iFlow
		try {
			await this.iflowService.sendMessage({
				content,
				filePath: activeFile?.path,
				fileContent,
				selection,
				onThought: (chunk: string) => {
					this.currentThought += chunk;
					this.messageListView.showThought(assistantMsgId, this.currentThought);
					if (this.plugin.settings.enableAutoScroll) {
						this.scrollToBottom();
					}
				},
				onChunk: (chunk: string) => {
					// Hide loading on first chunk
					if (!this.currentMessage) {
						this.hideLoadingAnimation(assistantMsgId);
					}
					
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
					this.messageListView.finalizeThought(assistantMsgId);
					cleanup();

					// Restore connected status (Task 2.8)
					this.renderConnectionStatus('connected');

					// Save assistant message to conversation
					if (this.currentConversationId && this.currentMessage) {
						this.conversationService.appendAssistantMessage(
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
					this.renderConnectionStatus('disconnected');
					// Task 2.9: user-facing error (avoid raw exception dump)
					this.updateMessage(assistantMsgId, t().errors.sendFailed);
				},
			});
		} catch (error) {
			console.log('[iFlow Chat] Exception in sendMessage', error);
			cleanup();
			this.renderConnectionStatus('disconnected');
			// Task 2.9: user-facing error
			this.updateMessage(assistantMsgId, t().errors.sendFailed);
		}
	}

	private addMessage(role: string, content: string): string {
		const id = Date.now().toString();
		this.messages.push({ role, content, id });
		this.messageListView.appendMessage(role, content, id);
		return id;
	}

	private updateMessage(id: string, content: string): void {
		this.messageListView.updateMessage(id, content);
	}

	private showLoadingAnimation(messageId: string): void {
		this.messageListView.showLoading(messageId, '思考中...');
	}

	private hideLoadingAnimation(messageId: string): void {
		this.messageListView.hideLoading(messageId);
	}

	private showOrUpdateToolCall(messageId: string, tool: import('./iflowService').IFlowToolCall): void {
		const contentEl = this.messageListView.getMessageContentElement(messageId);
		if (!contentEl) return;
		this.toolCallView.showOrUpdate(contentEl, tool);
	}

	private scrollToBottom(): void {
		this.messageListView.scrollToBottom();
	}

	private updateInputState(): void {
		if (!this.sendButton) return;
		const isEmpty = this.textarea.value.trim().length === 0;
		const state = resolveInputState({ isStreaming: this.isStreaming, isEmpty });
		(this.sendButton as any).disabled = state.sendDisabled;
		this.sendButton.textContent = state.buttonLabel;
		if (state.sendDisabled) {
			this.sendButton.addClass('iflow-send-disabled');
		} else {
			this.sendButton.removeClass('iflow-send-disabled');
		}
	}

	// Task 7.5: Quota warning — throttled to once per view lifetime
	private quotaWarningShown = false;
	private checkAndWarnQuota(): void {
		if (this.quotaWarningShown) return;
		const quota = this.conversationService.getStorageQuota();
		if (!quota) return;
		const msg = buildQuotaWarningMessage(quota);
		if (msg) {
			new Notice(msg, 6000);
			this.quotaWarningShown = true;
		}
	}

	// ============================================
	// Connection Status (Task 2.3)
	// ============================================

	private renderConnectionStatus(state: 'detecting' | 'connected' | 'disconnected' | 'reconnecting'): void {
		if (!this.connectionStatusEl) return;
		const el = this.connectionStatusEl;
		el.empty();
		el.className = `iflow-connection-status iflow-status-${state}`;

		const dots: Record<string, string> = {
			detecting: '○',
			connected: '●',
			disconnected: '○',
			reconnecting: '◌',
		};
		const labels: Record<string, string> = {
			detecting: t().status.detecting,
			connected: t().status.connected,
			disconnected: t().status.disconnected,
			reconnecting: t().status.reconnecting,
		};

		el.createSpan({ cls: 'iflow-status-dot', text: dots[state] });
		el.createSpan({ cls: 'iflow-status-label', text: labels[state] });
	}

	private startConnectionStatusPolling(): void {
		const check = async () => {
			try {
				const ok = await this.iflowService.checkConnection();
				this.renderConnectionStatus(ok ? 'connected' : 'disconnected');
			} catch {
				this.renderConnectionStatus('disconnected');
			}
		};

		// Immediate check
		check();

		// Poll every 10 s
		this.connectionCheckTimer = setInterval(check, 10000);
	}

	// ============================================
	// UI Component Creators
	// ============================================

	private addWelcomeMessage(): void {
		// Generate dynamic greeting based on time
		const greeting = this.getDynamicGreeting();

		this.messagesContainer.createDiv({
			cls: 'iflow-welcome',
		}, (el) => {
			// Greeting text with nice styling
			const greetingEl = el.createDiv({ cls: 'iflow-welcome-greeting' });
			greetingEl.createEl('span', { cls: 'iflow-welcome-emoji', text: greeting.emoji });
			greetingEl.createEl('span', { cls: 'iflow-welcome-text', text: greeting.text });

			// Subtitle
			el.createEl('p', { cls: 'iflow-welcome-subtitle', text: greeting.subtitle });
		});
	}

	private getDynamicGreeting(): { emoji: string; text: string; subtitle: string } {
		const now = new Date();
		const hour = now.getHours();
		const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday

		// Special day greetings
		if (dayOfWeek === 5) {
			// Friday
			return {
				emoji: '🎉',
				text: '周五快乐！',
				subtitle: '周末快到了，今天想完成什么？'
			};
		}

		if (dayOfWeek === 0) {
			// Sunday
			return {
				emoji: '☀️',
				text: '周日愉快！',
				subtitle: '享受休息时光，有需要随时找我'
			};
		}

		if (dayOfWeek === 6) {
			// Saturday
			return {
				emoji: '🌟',
				text: '周六好！',
				subtitle: '周末愉快，今天想做点什么？'
			};
		}

		// Time-based greetings for weekdays
		if (hour >= 5 && hour < 9) {
			return {
				emoji: '🌅',
				text: '早安！',
				subtitle: '新的一天开始了，准备好了吗？'
			};
		}

		if (hour >= 9 && hour < 12) {
			return {
				emoji: '☕',
				text: '上午好！',
				subtitle: '祝你今天工作效率满满'
			};
		}

		if (hour >= 12 && hour < 14) {
			return {
				emoji: '🍽️',
				text: '中午好！',
				subtitle: '记得吃午饭，下午继续加油'
			};
		}

		if (hour >= 14 && hour < 18) {
			return {
				emoji: '💪',
				text: '下午好！',
				subtitle: '有什么我可以帮你的？'
			};
		}

		if (hour >= 18 && hour < 22) {
			return {
				emoji: '🌙',
				text: '晚上好！',
				subtitle: '今天辛苦了，还有什么要处理的吗？'
			};
		}

		// Late night
		return {
			emoji: '🦉',
			text: '夜深了',
			subtitle: '注意休息，熬夜伤身体哦'
		};
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
			attr: { 'aria-label': getButtonAriaLabel('newConversation') },
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

		const state = this.conversationService.getState();

		// Filter conversations by search query
		const filteredConversations = state.conversations.filter(c =>
			c.title.toLowerCase().includes(searchQuery.toLowerCase())
		);

		// Sort by update time (newest first)
		filteredConversations.sort((a, b) => b.updatedAt - a.updatedAt);

		// Group conversations by date
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
		const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

		const groups: { label: string; conversations: Conversation[] }[] = [
			{ label: t().ui.today, conversations: [] },
			{ label: t().ui.yesterday, conversations: [] },
			{ label: t().ui.thisWeek, conversations: [] },
			{ label: t().ui.older, conversations: [] },
		];

		filteredConversations.forEach(conv => {
			const date = new Date(conv.updatedAt);
			if (date >= today) {
				groups[0].conversations.push(conv);
			} else if (date >= yesterday) {
				groups[1].conversations.push(conv);
			} else if (date >= thisWeek) {
				groups[2].conversations.push(conv);
			} else {
				groups[3].conversations.push(conv);
			}
		});

		// Render each group
		groups.forEach(group => {
			if (group.conversations.length > 0) {
				listContainer.createDiv({
					cls: 'iflow-conversation-group-label',
					text: group.label,
				});

				group.conversations.forEach(conv => {
					this.renderConversationItem(listContainer, conv);
				});
			}
		});

		if (filteredConversations.length === 0) {
			const emptyEl = listContainer.createDiv({ cls: 'iflow-conversation-empty' });
			if (searchQuery) {
				// Task 2.7: search no-results state
				emptyEl.createSpan({ text: t().ui.noConversationsFound });
				const clearBtn = emptyEl.createEl('button', {
					cls: 'iflow-conversation-empty-action',
					text: t().ui.clearSearch,
				});
				clearBtn.onclick = () => {
					const input = listContainer.closest('.iflow-conversation-panel')?.querySelector('input');
					if (input) {
						(input as HTMLInputElement).value = '';
						this.renderConversationList(listContainer, '');
					}
				};
			} else {
				// Task 2.7: no history state with new-conversation CTA
				emptyEl.createSpan({ text: t().ui.noConversations });
				const newBtn = emptyEl.createEl('button', {
					cls: 'iflow-conversation-empty-action',
					text: t().ui.startNewConversation,
				});
				newBtn.onclick = () => {
					this.createNewConversation();
					this.closeConversationPanel();
				};
			}
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
			attr: { 'aria-label': getButtonAriaLabel('deleteConversation') },
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
		const current = this.conversationService.getCurrentConversation();
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

		const state = this.conversationService.getState();
		this.currentConversationId = state.currentConversationId;

		// Update title
		const current = this.conversationService.getCurrentConversation();
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
		const current = this.conversationService.getCurrentConversation();
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
		this.conversationService.newConversation();

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
		// Save current scroll position before switching
		if (this.currentConversationId) {
			this.scrollPositionStore.save(this.currentConversationId, this.messagesContainer.scrollTop);
		}
		this.conversationService.switchConversation(conversationId);
		// Close panel after switching
		this.closeConversationPanel();
		// onConversationChange will be called automatically
	}

	private deleteConversation(conversationId: string): void {
		this.conversationService.deleteConversation(conversationId);
		// onConversationChange will be called automatically
	}

	private loadMessagesFromConversation(): void {
		this.messagesContainer.empty();

		// Reset streaming state
		this.isStreaming = false;
		this.currentMessage = '';

		const current = this.conversationService.getCurrentConversation();
		if (!current) {
			// Show welcome message if no conversation
			this.addWelcomeMessage();
			this.messages = [];
			return;
		}

		// Clear and reload messages array
		this.messages = [];

		// Load messages from conversation using messageListView
		this.messageListView.loadConversation(current.messages);
		current.messages.forEach(msg => {
			this.messages.push({ role: msg.role, content: msg.content, id: msg.id });
		});

		// Restore scroll position for this conversation (Task 6.3)
		const savedPos = this.currentConversationId
			? this.scrollPositionStore.get(this.currentConversationId)
			: 0;
		if (savedPos > 0) {
			requestAnimationFrame(() => {
				this.messagesContainer.scrollTop = savedPos;
			});
		} else {
			// Scroll to bottom for new/unsaved conversations
			this.scrollToBottom();
		}
	}

	// ============================================
	// Update available options from iFlow CLI
	// ============================================

}
