import { App, Plugin, PluginSettingTab, Setting, Notice, WorkspaceLeaf, TFile, MarkdownView } from 'obsidian';
import { IFlowService } from './iflowService';
import { IFlowChatView, VIEW_TYPE_IFLOW_CHAT } from './chatView';
import { initI18n, t } from './i18n';
import { bootstrap, type PluginRuntime } from './app/pluginBootstrap';
import { shouldCollapseView } from './app/viewUtils';
import { resolveWindowsIflowLaunch } from './app/windowsIflowLauncher';
import { buildDiagnosticsReport } from './ui/chat/diagnosticsReport';

// Import Node.js modules for process management (Electron environment)
declare const require: (module: string) => any;
const { spawn } = require('child_process');
const path = require('path');

export { IFlowPlugin };
export type { IFlowSettings };

interface IFlowSettings {
	iflowPort: number;
	iflowTimeout: number;
	enableAutoScroll: boolean;
	excludedTags: string[];
	language: string;
	autoAttachFile: boolean;
	autoStartSdk: boolean;  // Auto-start iFlow SDK on plugin load
}

const DEFAULT_SETTINGS: IFlowSettings = {
	iflowPort: 8090,
	iflowTimeout: 60000,
	enableAutoScroll: true,
	excludedTags: ['private', 'sensitive'],
	language: 'zh-CN',
	autoAttachFile: true,
	autoStartSdk: true,  // Enabled by default
}

export default class IFlowPlugin extends Plugin {
	settings: IFlowSettings;
	iflowService: IFlowService;
	chatView: IFlowChatView | null = null;
	sdkProcess: any = null;  // Keep reference to SDK process
	runtime: PluginRuntime | null = null;

	async onload() {
		console.log('Loading iFlow for Obsidian plugin');

		// Load settings
		await this.loadSettings();

		// Initialize i18n with saved language setting
		initI18n(this.settings.language);

		// Initialize iFlow service
		this.iflowService = new IFlowService(this.settings.iflowPort, this.settings.iflowTimeout, this.app);
		this.runtime = bootstrap(this);

		// Register sidebar view
		this.registerView(
			VIEW_TYPE_IFLOW_CHAT,
			(leaf) => (this.chatView = new IFlowChatView(leaf, this, this.iflowService))
		);

			// Add ribbon icon — toggle behavior: click again to close the sidebar
		this.addRibbonIcon('message-square', 'Open iFlow Chat', () => {
			this.activateView();
		});

		// Add command to open chat (commands always open, no toggle)
		this.addCommand({
			id: 'open-iflow-chat',
			name: 'Open iFlow Chat',
			callback: () => this.activateView(true),
		});

		// Add command to open chat with selected text
		this.addCommand({
			id: 'open-iflow-chat-with-selection',
			name: 'Open iFlow Chat with Selection',
			checkCallback: (checking: boolean) => {
				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				const selection = activeView?.editor?.getSelection();

				if (selection) {
					if (!checking) {
						this.activateView();
					}
					return true;
				}
				return false;
			},
		});

		// Add command to start/restart SDK
		this.addCommand({
			id: 'restart-iflow-sdk',
			name: '重启 iFlow SDK',
			callback: () => this.ensureSdkRunning(true),
		});

		// Add settings tab
		this.addSettingTab(new IFlowSettingTab(this.app, this));

		// Auto-open chat view on load if previously open
		this.app.workspace.onLayoutReady(async () => {
			// Check and auto-start SDK if needed
			if (this.settings.autoStartSdk) {
				await this.ensureSdkRunning();
			}
			// forceOpen=true: auto-open on startup should always reveal, not toggle
			this.activateView(true);
		});
	}

	/**
	 * Ensure iFlow SDK is running, start it if not
	 */
	async ensureSdkRunning(forceRestart: boolean = false): Promise<boolean> {
		const port = this.settings.iflowPort;

		// First check if SDK is already running
		const isConnected = await this.iflowService.checkConnection();
		
		if (isConnected && !forceRestart) {
			console.log('[iFlow] SDK already running on port', port);
			return true;
		}

		// Show notification that we're starting SDK
		new Notice('正在启动 iFlow SDK...');

		// Start SDK
		const started = await this.startSdk();
		
		if (started) {
			new Notice('iFlow SDK 启动成功！');
		} else {
			new Notice('iFlow SDK 启动失败，请检查是否已安装 iflow CLI');
		}

		return started;
	}

	/**
	 * Start iFlow SDK process
	 */
	async startSdk(): Promise<boolean> {
		const port = this.settings.iflowPort;
		
		return new Promise((resolve) => {
			try {
				console.log('[iFlow] Starting SDK on port', port);

				if (process.platform === 'win32') {
					// Windows: bypass npm shim (iflow.ps1/cmd) and launch node+entry.js directly
					// so windowsHide can apply to the real process and avoid visible console windows.
					const launch = resolveWindowsIflowLaunch(port);
					this.sdkProcess = spawn(launch.command, launch.args, {
						shell: false,
						detached: true,
						windowsHide: true,
						stdio: 'ignore',
					});
				} else {
					this.sdkProcess = spawn('iflow', [
						'--experimental-acp',
						'--port', String(port),
						'--stream',
					], {
						shell: false,
						detached: true,
						stdio: 'ignore',
					});
				}

				// Fully detach: allow Obsidian to close without waiting for SDK
				this.sdkProcess.unref();

				// Handle process errors (e.g. iflow not installed / not in PATH)
				this.sdkProcess.on('error', (err: Error) => {
					console.error('[iFlow] SDK process error:', err);
					resolve(false);
				});

				// stdout/stderr are null (stdio:'ignore') — no handlers needed

				// Wait for the server to start, then check connection
				setTimeout(async () => {
					const connected = await this.iflowService.checkConnection();
					resolve(connected);
				}, 3000);

			} catch (error) {
				console.error('[iFlow] Failed to start SDK:', error);
				resolve(false);
			}
		});
	}

	onunload() {
		console.log('Unloading iFlow for Obsidian plugin');
		this.iflowService.dispose();
		
		// Note: We don't kill the SDK process on unload
		// because it's started as a detached process
		// This allows the SDK to keep running even if Obsidian is closed
	}

	/**
	 * Toggle sidebar chat view.
	 * @param forceOpen - when true, always reveal (auto-start / command palette). When false (ribbon click), collapse if already visible.
	 */
	async activateView(forceOpen = false) {
		const { workspace } = this.app;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_IFLOW_CHAT);

		if (leaves.length > 0) {
			const leaf = leaves[0];
			if (shouldCollapseView(true, workspace.rightSplit.collapsed, forceOpen)) {
				// Sidebar is open and user clicked ribbon to toggle it off
				workspace.rightSplit.collapse();
			} else {
				workspace.revealLeaf(leaf);
			}
			return;
		}

		// First open: create leaf in right sidebar
		const leaf = workspace.getRightLeaf(false);
		await leaf!.setViewState({ type: VIEW_TYPE_IFLOW_CHAT, active: true });
		workspace.revealLeaf(leaf!);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		// Update iFlow service with new settings
		this.iflowService.updateConfig(this.settings.iflowPort, this.settings.iflowTimeout);
	}

	getActiveFile(): TFile | null {
		return this.app.workspace.getActiveFile();
	}

	getVaultPath(): string {
		// @ts-ignore - adapter is available but not in types
		return this.app.vault.adapter.basePath;
	}
}

class IFlowSettingTab extends PluginSettingTab {
	plugin: IFlowPlugin;

	constructor(app: App, plugin: IFlowPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		const settings = t().settings;

		// ── 语言 ──────────────────────────────────────────
		containerEl.createEl('h3', { text: '界面与语言' });

		// Language setting
		new Setting(containerEl)
			.setName(settings.language)
			.setDesc(settings.languageDesc)
			.addDropdown(dropdown => dropdown
				.addOption('zh-CN', '中文简体')
				.addOption('en-US', 'English')
				.setValue(this.plugin.settings.language)
				.onChange(async (value) => {
					this.plugin.settings.language = value;
					await this.plugin.saveSettings();
					initI18n(value);
					// Refresh settings page to apply new language
					this.display();
				}));

		// ── 连接与服务 ────────────────────────────────────
		containerEl.createEl('h3', { text: '连接与服务' });

		// Auto-start SDK setting
		new Setting(containerEl)
			.setName('自动启动 SDK')
			.setDesc('Obsidian 加载插件时自动启动 iFlow SDK，首次安装后推荐开启')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoStartSdk)
				.onChange(async (value) => {
					this.plugin.settings.autoStartSdk = value;
					await this.plugin.saveSettings();
				}));

		// Manual SDK restart + recheck buttons (Task 7.3)
		new Setting(containerEl)
			.setName('SDK 操作')
			.setDesc('重启会终止并重新启动 SDK 进程；重新检测仅验证当前端口是否可达，不会重启进程')
			.addButton(button => button
				.setButtonText('重启 SDK')
				.onClick(async () => {
					button.setButtonText('启动中...');
					button.setDisabled(true);
					const success = await this.plugin.startSdk();
					button.setButtonText('重启 SDK');
					button.setDisabled(false);
					if (success) {
						new Notice('SDK 重启成功！');
						this.display();
					} else {
						new Notice('SDK 重启失败，请确认 iflow CLI 已安装并在 PATH 中');
					}
				}))
			.addButton(button => button
				.setButtonText('重新检测')
				.onClick(async () => {
					button.setButtonText('检测中...');
					button.setDisabled(true);
					const connected = await this.plugin.iflowService.checkConnection();
					button.setButtonText('重新检测');
					button.setDisabled(false);
					new Notice(connected ? '✓ SDK 连接正常' : '✗ SDK 未响应，请尝试重启');
				}));

		new Setting(containerEl)
			.setName(settings.port)
			.setDesc(settings.portDesc)
			.addText(text => text
				.setValue(String(this.plugin.settings.iflowPort))
				.onChange(async (value) => {
					const port = parseInt(value);
					if (!isNaN(port) && port > 0 && port < 65536) {
						this.plugin.settings.iflowPort = port;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName(settings.timeout)
			.setDesc(settings.timeoutDesc)
			.addText(text => text
				.setValue(String(this.plugin.settings.iflowTimeout))
				.onChange(async (value) => {
					const timeout = parseInt(value);
					if (!isNaN(timeout) && timeout > 0) {
						this.plugin.settings.iflowTimeout = timeout;
						await this.plugin.saveSettings();
					}
				}));

		// ── 上下文与附件 ──────────────────────────────────
		containerEl.createEl('h3', { text: '上下文与附件' });

		new Setting(containerEl)
			.setName(settings.autoScroll)
			.setDesc(settings.autoScrollDesc)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableAutoScroll)
				.onChange(async (value) => {
					this.plugin.settings.enableAutoScroll = value;
					await this.plugin.saveSettings();
				}));

		// Task 7.4: Improved description for autoAttachFile
		new Setting(containerEl)
			.setName(settings.autoAttachFile)
			.setDesc('发送消息时自动将当前编辑器中打开的笔记作为上下文附件发送，让模型了解你正在查看的内容')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoAttachFile)
				.onChange(async (value) => {
					this.plugin.settings.autoAttachFile = value;
					await this.plugin.saveSettings();
				}));

		// Task 7.4: Improved description for excludedTags
		new Setting(containerEl)
			.setName(settings.excludedTags)
			.setDesc('带有这些标签的笔记不会被自动附加（用英文逗号分隔，如 private, sensitive）。已通过自动附件功能手动添加的文件不受此规则影响')
			.addText(text => text
				.setValue(this.plugin.settings.excludedTags.join(', '))
				.onChange(async (value) => {
					this.plugin.settings.excludedTags = value
						.split(',')
						.map(tag => tag.trim())
						.filter(tag => tag.length > 0);
					await this.plugin.saveSettings();
				}));

		// ── 诊断与状态 ────────────────────────────────────
		// Task 7.2: Runtime diagnostics entry
		containerEl.createEl('h3', { text: '诊断与状态' });

		const diagnosticsEl = containerEl.createEl('div', { cls: 'iflow-diagnostics' });
		diagnosticsEl.createEl('p', { text: '正在检测连接状态…', cls: 'iflow-diagnostics-text' });

		this.plugin.iflowService.checkConnection().then(connected => {
			const storageSize = (() => {
				try {
					let total = 0;
					for (const key of Object.keys(localStorage)) {
						if (key.startsWith('iflow-conversations-')) {
							total += localStorage.getItem(key)?.length ?? 0;
						}
					}
					return total;
				} catch { return 0; }
			})();

			const report = buildDiagnosticsReport({
				connectionState: connected ? 'connected' : 'disconnected',
				lastError: null,
				usedBytes: storageSize,
				totalBytes: 4 * 1024 * 1024,
				port: this.plugin.settings.iflowPort,
			});

			diagnosticsEl.empty();
			report.split('\n').forEach(line => {
				diagnosticsEl.createEl('p', { text: line, cls: 'iflow-diagnostics-line' });
			});
		});

		// Add info about iFlow CLI
		containerEl.createEl('h3', { text: settings.cliRequirements });
		containerEl.createEl('p', {
			text: settings.cliRequirementsDesc
		});
	}
}