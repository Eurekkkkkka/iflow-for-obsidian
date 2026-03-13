export interface SdkSpawnOptions {
	detached: boolean;
	shell: boolean;
	/** Windows only: suppress the console window */
	windowsHide: boolean;
}

/**
 * Returns the child_process.spawn options for launching the iFlow SDK.
 *
 * On Windows, spawning via cmd.exe applies CREATE_NO_WINDOW only to cmd.exe
 * itself; the iflow child process can still allocate a new console.
 * Spawning iflow directly with shell:true and windowsHide:true ensures
 * CREATE_NO_WINDOW is applied directly to iflow, suppressing the CLI window.
 *
 * Callers should also:
 *   - set stdio: 'ignore' (prevents console inheritance)
 *   - call sdkProcess.unref() (allows Obsidian to close independently)
 */
export function buildSdkSpawnOptions(platform: string): SdkSpawnOptions {
	if (platform === 'win32') {
		return { detached: true, shell: true, windowsHide: true };
	}
	return { detached: true, shell: false, windowsHide: false };
}
