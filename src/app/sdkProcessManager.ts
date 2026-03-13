import type IFlowPlugin from '../main';

export interface StartResult {
	success: boolean;
}

export class SdkProcessManager {
	constructor(private readonly plugin: IFlowPlugin) {}

	async ensureRunning(forceRestart: boolean = false): Promise<StartResult> {
		const success = await this.plugin.ensureSdkRunning(forceRestart);
		return { success };
	}

	async start(): Promise<StartResult> {
		const success = await this.plugin.startSdk();
		return { success };
	}
}
