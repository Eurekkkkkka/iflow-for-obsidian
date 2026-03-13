import type IFlowPlugin from '../main';
import type { IFlowSettings } from '../main';

export class SettingsService {
	constructor(private readonly plugin: IFlowPlugin) {}

	async load(): Promise<IFlowSettings> {
		await this.plugin.loadSettings();
		return this.plugin.settings;
	}

	get(): IFlowSettings {
		return this.plugin.settings;
	}

	async update(partial: Partial<IFlowSettings>): Promise<IFlowSettings> {
		this.plugin.settings = { ...this.plugin.settings, ...partial };
		await this.plugin.saveSettings();
		return this.plugin.settings;
	}
}
