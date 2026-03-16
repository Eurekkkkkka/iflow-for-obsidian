import { Notice } from 'obsidian';
import { JsonRpcProtocol, type JsonRpcNotification } from './infra/acp/jsonRpcProtocol';
import { AcpClient } from './infra/acp/acpClient';
import { mapSessionUpdateToEvents } from './features/chat/toolCallMapper';
import { composePrompt } from './features/chat/promptComposer';
import { VaultFileBridge } from './infra/obsidian/vaultFileBridge';

// Import Node.js modules for process management (Electron environment)
declare const require: (module: string) => any;
const { spawn } = require('child_process');
const path = require('path');

// Terminal session tracking
interface TerminalSession {
	id: string;
	process: any;
	output: string;
	exitCode: number | null;
	completed: boolean;
}

export interface IFlowMessage {
	type: 'stream' | 'thought' | 'tool' | 'question' | 'plan' | 'error' | 'end';
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
	images?: Array<{
		mediaType: string;
		data: string;  // base64
	}>;
	onChunk?: (chunk: string) => void;
	onThought?: (chunk: string) => void;
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
		console.log('[iFlow] Sending initialize with clientCapabilities:', JSON.stringify({
			fs: { readTextFile: true, writeTextFile: true },
			terminal: true
		}));
		const initResult = await this.protocol.sendRequest('initialize', {
			protocolVersion: 1,
			clientCapabilities: {
				fs: {
					readTextFile: true,
					writeTextFile: true,
				},
				terminal: true,
			},
		}) as { isAuthenticated?: boolean };
		console.log('[iFlow] Initialize result:', JSON.stringify(initResult));

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
		// When clientCapabilities.terminal is true, iFlow CLI should use terminal/* methods
		// shellTimeout: increase timeout for shell commands
		const sessionSettings: Record<string, unknown> = {
			permission_mode: 'default', // Required for tools to work
			shellTimeout: 120000, // 2 minutes timeout for shell commands
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

	private terminalSessions = new Map<string, TerminalSession>();

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

		// Terminal: create a new terminal session and execute command
		this.protocol.onServerMethod('terminal/create', async (_id: number, params: any) => {
			console.log('[iFlow] terminal/create:', params);
			const terminalId = `terminal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
			
			// ACP spec: command is the executable name, args is array of arguments
			const command = params?.command || '';
			const args = params?.args || [];
			const cwd = params?.cwd || this.getVaultPath();
			const env = params?.env || {};
			const maxOutputBytes = params?.maxOutputBytes || 1000000;

			// Combine command and args for execution
			const fullCommand = args.length > 0 ? `${command} ${args.join(' ')}` : command;
			console.log('[iFlow] Executing command:', fullCommand, 'in cwd:', cwd);

			return new Promise((resolve) => {
				try {
					// Determine shell based on platform
					const isWindows = process.platform === 'win32';
					const shell = isWindows ? 'powershell.exe' : '/bin/bash';
					const shellArgs = isWindows 
						? ['-NoProfile', '-Command', fullCommand]
						: ['-c', fullCommand];

					const childProcess = spawn(shell, shellArgs, {
						cwd,
						env: { ...process.env, ...env },
						shell: false,
						windowsHide: true,
					});

					const session: TerminalSession = {
						id: terminalId,
						process: childProcess,
						output: '',
						exitCode: null,
						completed: false,
					};

					// Capture stdout
					childProcess.stdout?.on('data', (data: Buffer) => {
						const chunk = data.toString();
						// Apply maxOutputBytes limit
						if (session.output.length + chunk.length > maxOutputBytes) {
							const excess = session.output.length + chunk.length - maxOutputBytes;
							session.output = session.output.substring(excess) + chunk;
						} else {
							session.output += chunk;
						}
					});

					// Capture stderr
					childProcess.stderr?.on('data', (data: Buffer) => {
						const chunk = data.toString();
						if (session.output.length + chunk.length > maxOutputBytes) {
							const excess = session.output.length + chunk.length - maxOutputBytes;
							session.output = session.output.substring(excess) + chunk;
						} else {
							session.output += chunk;
						}
					});

					// Handle process completion
					childProcess.on('close', (code: number) => {
						session.exitCode = code;
						session.completed = true;
						console.log(`[iFlow] Terminal ${terminalId} exited with code ${code}`);
					});

					childProcess.on('error', (err: Error) => {
						session.output += `Error: ${err.message}\n`;
						session.exitCode = 1;
						session.completed = true;
					});

					this.terminalSessions.set(terminalId, session);
					console.log(`[iFlow] Terminal created: ${terminalId}`);

					// ACP spec returns { id: terminalId }
					resolve({ id: terminalId });
				} catch (error) {
					console.error('[iFlow] terminal/create error:', error);
					resolve({ error: String(error) });
				}
			});
		});

		// Terminal: get output from a terminal session
		this.protocol.onServerMethod('terminal/output', async (_id: number, params: any) => {
			console.log('[iFlow] terminal/output:', params);
			const terminalId = params?.id;
			if (!terminalId) {
				return { error: 'Terminal ID is required' };
			}

			const session = this.terminalSessions.get(terminalId);
			if (!session) {
				return { error: `Terminal session not found: ${terminalId}` };
			}

			// ACP spec format: { output, exitStatus: { code, signal } | null, truncated }
			return {
				output: session.output,
				exitStatus: session.completed ? { code: session.exitCode ?? 0, signal: null } : null,
				truncated: false,
			};
		});

		// Terminal: wait for command to complete
		this.protocol.onServerMethod('terminal/wait_for_exit', async (_id: number, params: any) => {
			console.log('[iFlow] terminal/wait_for_exit:', params);
			const terminalId = params?.id;

			if (!terminalId) {
				return { error: 'Terminal ID is required' };
			}

			const session = this.terminalSessions.get(terminalId);
			if (!session) {
				return { error: `Terminal session not found: ${terminalId}` };
			}

			return new Promise((resolve) => {
				if (session.completed) {
					// ACP spec format: { exitStatus: { code, signal } }
					resolve({
						exitStatus: { code: session.exitCode ?? 0, signal: null },
					});
					return;
				}

				const checkInterval = setInterval(() => {
					if (session.completed) {
						clearInterval(checkInterval);
						resolve({
							exitStatus: { code: session.exitCode ?? 0, signal: null },
						});
					}
				}, 100);
			});
		});

		// Terminal: kill a running command
		this.protocol.onServerMethod('terminal/kill', async (_id: number, params: any) => {
			console.log('[iFlow] terminal/kill:', params);
			const terminalId = params?.id;

			if (!terminalId) {
				return { error: 'Terminal ID is required' };
			}

			const session = this.terminalSessions.get(terminalId);
			if (!session) {
				return { error: `Terminal session not found: ${terminalId}` };
			}

			if (!session.completed && session.process) {
				session.process.kill();
				session.completed = true;
				session.exitCode = -1;
				return { killed: true };
			}

			return { killed: false, message: 'Process already completed' };
		});

		// Terminal: release terminal resources
		this.protocol.onServerMethod('terminal/release', async (_id: number, params: any) => {
			console.log('[iFlow] terminal/release:', params);
			const terminalId = params?.id;

			if (!terminalId) {
				return { error: 'Terminal ID is required' };
			}

			const session = this.terminalSessions.get(terminalId);
			if (session && !session.completed && session.process) {
				session.process.kill();
			}

			this.terminalSessions.delete(terminalId);
			return { released: true };
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

		// Apply runtime settings before sending prompt

		const prompt = options.promptOverride ?? composePrompt({
			userMessage: options.content,
			filePath: options.filePath,
			selection: options.selection,
		});

		// Clear any stale handlers from previous messages
		this.clearHandlers();

		// Register handlers for this message
		if (options.onChunk) this.on('stream', options.onChunk);
		if (options.onThought) this.on('thought', options.onThought);
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
