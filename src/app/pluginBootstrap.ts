import type IFlowPlugin from '../main';
import { SettingsService } from './settingsService';
import { SdkProcessManager } from './sdkProcessManager';

export interface PluginRuntime {
	settingsService: SettingsService;
	sdkProcessManager: SdkProcessManager;
}

export function bootstrap(plugin: IFlowPlugin): PluginRuntime {
	return {
		settingsService: new SettingsService(plugin),
		sdkProcessManager: new SdkProcessManager(plugin),
	};
}
