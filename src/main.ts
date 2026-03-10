import { App, Plugin, PluginSettingTab, Setting, Notice, WorkspaceLeaf, TFile, MarkdownView } from 'obsidian';
import { IFlowService } from './iflowService';
import { IFlowChatView, VIEW_TYPE_IFLOW_CHAT } from './chatView';
import { initI18n, t, setLanguage, getCurrentLangCode } from './i18n';

export { IFlowPlugin };
export type { IFlowSettings };

interface IFlowSettings {
	iflowPort: number;
	iflowTimeout: number;
	enableAutoScroll: boolean;
	excludedTags: string[];
	language: string;
	autoAttachFile: boolean;
	lastUsedModel: string;
	lastUsedMode: string;
	lastUsedThinking: boolean;
}

const DEFAULT_SETTINGS: IFlowSettings = {
	iflowPort: 8090,
	iflowTimeout: 60000,
	enableAutoScroll: true,
	excludedTags: ['private', 'sensitive'],
	language: 'zh-CN',
	autoAttachFile: true,
	lastUsedModel: 'glm-4.7',
	lastUsedMode: 'default',
	lastUsedThinking: false,
}

export default class IFlowPlugin extends Plugin {
	settings: IFlowSettings;
	iflowService: IFlowService;
	chatView: IFlowChatView | null = null;

	async onload() {
		console.log('Loading iFlow for Obsidian plugin');

		// Load settings
		await this.loadSettings();

		// Initialize i18n with saved language setting
		initI18n(this.settings.language);

		// Initialize iFlow service
		this.iflowService = new IFlowService(this.settings.iflowPort, this.settings.iflowTimeout, this.app);

		// Register sidebar view
		this.registerView(
			VIEW_TYPE_IFLOW_CHAT,
			(leaf) => (this.chatView = new IFlowChatView(leaf, this, this.iflowService))
		);

		// Add ribbon icon
		this.addRibbonIcon('message-square', 'Open iFlow Chat', () => {
			this.activateView();
		});

		// Add command to open chat
		this.addCommand({
			id: 'open-iflow-chat',
			name: 'Open iFlow Chat',
			callback: () => this.activateView(),
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

		// Add settings tab
		this.addSettingTab(new IFlowSettingTab(this.app, this));

		// Auto-open chat view on load if previously open
		this.app.workspace.onLayoutReady(() => {
			this.activateView();
		});
	}

	onunload() {
		console.log('Unloading iFlow for Obsidian plugin');
		this.iflowService.dispose();
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_IFLOW_CHAT);

		if (leaves.length > 0) {
			// Already open, just reveal
			leaf = leaves[0];
		} else {
			// Open in right sidebar
			leaf = workspace.getRightLeaf(false);
			await leaf.setViewState({ type: VIEW_TYPE_IFLOW_CHAT, active: true });
		}

		workspace.revealLeaf(leaf);
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
					setLanguage(value);
					// Refresh settings page to apply new language
					this.display();
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

		new Setting(containerEl)
			.setName(settings.autoScroll)
			.setDesc(settings.autoScrollDesc)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableAutoScroll)
				.onChange(async (value) => {
					this.plugin.settings.enableAutoScroll = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(settings.autoAttachFile)
			.setDesc(settings.autoAttachFileDesc)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoAttachFile)
				.onChange(async (value) => {
					this.plugin.settings.autoAttachFile = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(settings.excludedTags)
			.setDesc(settings.excludedTagsDesc)
			.addText(text => text
				.setValue(this.plugin.settings.excludedTags.join(', '))
				.onChange(async (value) => {
					this.plugin.settings.excludedTags = value
						.split(',')
						.map(tag => tag.trim())
						.filter(tag => tag.length > 0);
					await this.plugin.saveSettings();
				}));

		// Add info about iFlow CLI
		containerEl.createEl('h3', { text: settings.cliRequirements });
		containerEl.createEl('p', {
			text: settings.cliRequirementsDesc
		});

		// Connection status
		const statusDiv = containerEl.createEl('div', { cls: 'iflow-status' });
		statusDiv.createEl('p', { text: settings.connectionStatus });
		const statusText = statusDiv.createEl('span', { cls: 'iflow-status-text' });
		statusText.textContent = settings.checking;

		// Check connection
		this.plugin.iflowService.checkConnection().then(connected => {
			statusText.textContent = connected ? settings.connected : settings.disconnected;
			statusText.className = 'iflow-status-text ' + (connected ? 'connected' : 'disconnected');
		});
	}
}
