import { Notice } from 'obsidian';
import { JsonRpcProtocol, type JsonRpcNotification } from './infra/acp/jsonRpcProtocol';
import { AcpClient } from './infra/acp/acpClient';
import { mapSessionUpdateToEvents } from './features/chat/toolCallMapper';
import { composePrompt } from './features/chat/promptComposer';
import { VaultFileBridge } from './infra/obsidian/vaultFileBridge';

export interface IFlowMessage {
	type: 'stream' | 'tool' | 'question' | 'plan' | 'error' | 'end';
	content?: string;
	data?: any;
}

export interface IFlowToolCall {
	id: string;
	name: string;
	input: any;
	status?: 'running' | 'completed' | 'error';
	result?: any;
	error?: string;
}

export interface SendMessageOptions {
	content: string;
	promptOverride?: string;
	filePath?: string;
	fileContent?: string;
	selection?: string;
	model?: string;
	mode?: string;
	thinkingEnabled?: boolean;
	images?: Array<{
		mediaType: string;
		data: string;  // base64
	}>;
	onChunk?: (chunk: string) => void;
	onTool?: (tool: IFlowToolCall) => void;
	onEnd?: () => void;
	onError?: (error: string) => void;
}

export class IFlowService {
	private port: number;
	private timeout: number;
	private acpClient: AcpClient;
	private reconnectTimer: any = null;
	private messageHandlers: ((msg: IFlowMessage) => void)[] = [];
	private isConnected: boolean = false;
	private protocol: JsonRpcProtocol | null = null;
	private sessionId: string | null = null;
	private app: any; // Obsidian App instance

	constructor(port: number, timeout: number, app?: any) {
		this.port = port;
		this.timeout = timeout;
		this.app = app;
		this.acpClient = new AcpClient(port, timeout);
	}

	async checkConnection(): Promise<boolean> {
		return this.acpClient.checkConnection();
	}

	async connect(): Promise<void> {
		if (this.isConnected && this.protocol) {
			return;
		}

		await this.acpClient.connect({
			onMessage: (data) => this.handleIncomingMessage(data),
			onError: (error) => console.error('iFlow WebSocket error:', error),
			onClose: () => {
				this.isConnected = false;
				this.sessionId = null;
				this.protocol?.clearPendingRequests();
				console.log('iFlow WebSocket disconnected');
				if (this.reconnectTimer) {
					clearTimeout(this.reconnectTimer);
				}
				this.reconnectTimer = setTimeout(() => {
					this.connect().catch(err => {
						console.error('Reconnection failed:', err);
					});
				}, 5000);
			},
		});

		console.log('iFlow WebSocket connected');
		this.protocol = this.acpClient.getProtocol();
		await this.initializeConnection();
		this.isConnected = true;
	}

	private async initializeConnection(): Promise<void> {
		if (!this.protocol) {
			throw new Error('Protocol not initialized');
		}

		// Initialize ACP
		const initResult = await this.protocol.sendRequest('initialize', {
			protocolVersion: 1,
			clientCapabilities: {
				fs: {
					readTextFile: true,
					writeTextFile: true,
				},
			},
		}) as { isAuthenticated?: boolean };

		// Authenticate if needed
		if (!initResult.isAuthenticated) {
			try {
				await this.protocol.sendRequest('authenticate', { methodId: 'oauth-iflow' });
				console.log('Authenticated with oauth-iflow');
			} catch (error) {
				console.error('Authentication failed:', error);
				throw new Error('Authentication failed');
			}
		}

		// Create new session - use user's home directory as workspace
		// In browser, we can't access process, so use Obsidian's vault path
		const cwd = (this.app as any)?.vault?.adapter?.basePath?.replace(/\/$/, '') || '/Users/jie';

		// Build session settings similar to VSCode plugin
		// IMPORTANT: permission_mode is required for tool calling to work
		const sessionSettings: Record<string, unknown> = {
			permission_mode: 'default', // Required for tools to work
			append_system_prompt: `IMPORTANT: When generating structured content like learning roadmaps, diagrams, knowledge graphs, or similar content:
1. Use the fs/write_text_file tool to create a file automatically
2. For visual roadmaps and diagrams, create an Obsidian Canvas file (.canvas extension)
3. Do NOT output large JSON structures as text - create files instead
4. Use descriptive filenames based on the content (e.g., "golang-learning-roadmap.canvas")
5. After creating the file, provide a brief summary of what was created`,
			add_dirs: [cwd], // Allow access to vault directory
		};

		const sessionResult = await this.protocol.sendRequest('session/new', {
			cwd,
			mcpServers: [],
			settings: sessionSettings,
		}) as { sessionId?: string };

		if (!sessionResult.sessionId) {
			throw new Error('Failed to create session');
		}

		this.sessionId = sessionResult.sessionId;
		console.log('ACP session created:', this.sessionId);

		// Register server method handlers
		this.registerServerHandlers();
	}

	private registerServerHandlers(): void {
		if (!this.protocol) return;
		const bridge = new VaultFileBridge(this.app.vault.adapter, this.getVaultPath());

		// Automatically approve all permission requests for local Obsidian plugin
		this.protocol.onServerMethod('session/request_permission', async (_id: number, params: any) => {
			console.log('[iFlow] Permission request:', params);

			// Return the first option (usually "proceed_always" or similar)
			if (params?.options && params.options.length > 0) {
				const firstOption = params.options[0];
				console.log('[iFlow] Permission approved:', firstOption.optionId);
				return firstOption.optionId;
			}

			// Fallback: return a default approval
			return 'proceed_always';
		});

		// File system: read text file
		this.protocol.onServerMethod('fs/read_text_file', async (_id: number, params: any) => {
			console.log('[iFlow] fs/read_text_file:', params);
			if (!params || typeof params.path !== 'string') {
				return { error: 'Invalid params: path is required' };
			}
			const result = await bridge.readTextFile(params.path);
			if (result.error) {
				console.error('[iFlow] fs/read_text_file error:', result.error);
			}
			return result;
		});

		// File system: write text file
		this.protocol.onServerMethod('fs/write_text_file', async (_id: number, params: any) => {
			console.log('[iFlow] fs/write_text_file:', params);
			if (!params || typeof params.path !== 'string' || typeof params.content !== 'string') {
				return { error: 'Invalid params: path and content are required' };
			}
			const result = await bridge.writeTextFile(params.path, params.content);
			if (result?.error) {
				console.error('[iFlow] fs/write_text_file error:', result.error);
			}
			return result;
		});
	}

	/**
	 * Get the vault path from Obsidian app
	 */
	private getVaultPath(): string {
		const basePath = (this.app as any)?.vault?.adapter?.basePath || '';
		return basePath.replace(/\/$/, ''); // Remove trailing slash
	}

	private handleIncomingMessage(data: string): void {
		if (!this.protocol) return;

		// Log all incoming messages for debugging
		const trimmed = data.trim();
		if (!trimmed.startsWith('//')) {
			console.log('[iFlow] Received message:', trimmed.substring(0, 200));
		}

		const message = this.protocol.handleMessage(data);

		if (!message) {
			return;
		}

		// Handle JSON-RPC notifications (no id)
		if (!('id' in message)) {
			const notification = message as JsonRpcNotification;
			console.log('[iFlow] Notification:', notification.method);

			// Handle session/update notifications (stream content)
			if (notification.method === 'session/update') {
				const params = notification.params as Record<string, any> | undefined;
				const update = params?.update;
				console.log('[iFlow] Update type:', update?.sessionUpdate);
				if (update && typeof update === 'object') {
					const events = mapSessionUpdateToEvents(update);
					for (const event of events) {
						if (event.type === 'stream' && event.content) {
							console.log('[iFlow] Content:', event.content.substring(0, 100));
						}
						if (event.type === 'tool') {
							console.log('[iFlow] Tool event');
						}
						if (event.type === 'end') {
							console.log('[iFlow] Task finished');
						}
						this.messageHandlers.forEach((handler) => handler(event));
					}
				}
			}
		}
	}

	async sendMessage(options: SendMessageOptions): Promise<void> {
		if (!this.isConnected || !this.protocol || !this.sessionId) {
			await this.connect();
		}

		// Apply runtime settings (mode, model, thinking) before sending prompt
		if (options.mode) {
			try {
				await this.protocol.sendRequest('session/set_mode', {
					sessionId: this.sessionId,
					modeId: options.mode,
				});
				console.log(`[iFlow] Mode set to: ${options.mode}`);
			} catch (error) {
				console.warn(`[iFlow] Failed to set mode: ${error}`);
			}
		}

		if (options.model) {
			try {
				await this.protocol.sendRequest('session/set_model', {
					sessionId: this.sessionId,
					modelId: options.model,
				});
				console.log(`[iFlow] Model set to: ${options.model}`);
			} catch (error) {
				console.warn(`[iFlow] Failed to set model: ${error}`);
			}
		}

		if (options.thinkingEnabled !== undefined) {
			try {
				const thinkPayload: any = {
					sessionId: this.sessionId,
					thinkEnabled: options.thinkingEnabled,
				};
				if (options.thinkingEnabled) {
					thinkPayload.thinkConfig = 'think';
				}
				await this.protocol.sendRequest('session/set_think', thinkPayload);
				console.log(`[iFlow] Thinking set to: ${options.thinkingEnabled}`);
			} catch (error) {
				console.warn(`[iFlow] Failed to set thinking: ${error}`);
			}
		}

		const prompt = options.promptOverride ?? composePrompt({
			userMessage: options.content,
			filePath: options.filePath,
			selection: options.selection,
		});

		// Clear any stale handlers from previous messages
		this.clearHandlers();

		// Register handlers for this message
		if (options.onChunk) this.on('stream', options.onChunk);
		if (options.onTool) this.on('tool', options.onTool);
		if (options.onEnd) this.on('end', () => {
			options.onEnd?.();
			this.clearHandlers();
		});
		if (options.onError) this.on('error', () => {
			options.onError?.('Connection error');
			this.clearHandlers();
		});

		// Build prompt content array
		const promptContent: Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }> = [];
		
		// Add images first (if any)
		if (options.images && options.images.length > 0) {
			for (const image of options.images) {
				promptContent.push({
					type: 'image',
					source: {
						type: 'base64',
						media_type: image.mediaType,
						data: image.data,
					},
				});
			}
		}
		
		// Add text content
		promptContent.push({
			type: 'text',
			text: prompt,
		});

		// Send prompt request
		try {
			const result = await this.protocol.sendRequest('session/prompt', {
				sessionId: this.sessionId,
				prompt: promptContent,
			});

			// Check if the response indicates completion
			if (result?.stopReason === 'end_turn' || result?.stopReason === 'max_turns') {
				console.log('[iFlow] Prompt completed with stopReason:', result.stopReason);
				// Trigger onEnd callback when stream completes normally
				this.messageHandlers.forEach(handler => handler({
					type: 'end',
				}));
			}
		} catch (error) {
			new Notice(`Failed to send message: ${error}`);
			this.clearHandlers();
		}
	}

	private handlerMap = new Map<string, Set<(data: any) => void>>();

	on(type: string, handler: (data: any) => void): void {
		// Track handlers by type for proper cleanup
		if (!this.handlerMap.has(type)) {
			this.handlerMap.set(type, new Set());
		}
		this.handlerMap.get(type)!.add(handler);

		// Also add to messageHandlers for dispatching
		this.messageHandlers.push((msg: IFlowMessage) => {
			if (msg.type === type) {
				handler(msg.content || msg.data);
			}
		});
	}

	off(type: string, handler: (data: any) => void): void {
		// Remove from handler map
		const handlers = this.handlerMap.get(type);
		if (handlers) {
			handlers.delete(handler);
			if (handlers.size === 0) {
				this.handlerMap.delete(type);
			}
		}

		// Rebuild messageHandlers without the removed handler
		this.messageHandlers = this.messageHandlers.filter(h => {
			// Can't directly compare, but we check if the handler is still in the map
			const typeHandlers = this.handlerMap.get(type);
			return typeHandlers ? true : true; // Keep all handlers, we'll manage via map
		});
	}

	clearHandlers(): void {
		this.messageHandlers = [];
		this.handlerMap.clear();
	}

	updateConfig(port: number, timeout: number): void {
		const portChanged = this.port !== port;
		const timeoutChanged = this.timeout !== timeout;

		this.port = port;
		this.timeout = timeout;
		this.acpClient.setConfig(port, timeout);

		if ((portChanged || timeoutChanged) && this.isConnected) {
			this.acpClient.dispose();
			this.isConnected = false;
		}
	}

	dispose(): void {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
		}
		this.protocol?.clearPendingRequests();
		this.acpClient.dispose();
		this.messageHandlers = [];
	}
}
