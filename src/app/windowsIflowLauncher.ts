import * as path from 'path';
import * as fs from 'fs';

export interface ResolvedWindowsIflowLaunch {
	command: string;
	args: string[];
}

export interface ResolveWindowsIflowLaunchDeps {
	appData?: string;
	existsSync?: (filePath: string) => boolean;
}

export function resolveWindowsIflowLaunch(
	port: number,
	deps: ResolveWindowsIflowLaunchDeps = {},
): ResolvedWindowsIflowLaunch {
	const appData = deps.appData ?? process.env.APPDATA ?? '';
	if (!appData) {
		throw new Error('APPDATA is not set');
	}

	const existsSync = deps.existsSync ?? fs.existsSync;
	const npmBinDir = path.join(appData, 'npm');
	const entryJs = path.join(
		npmBinDir,
		'node_modules',
		'@iflow-ai',
		'iflow-cli',
		'bundle',
		'entry.js',
	);

	if (!existsSync(entryJs)) {
		throw new Error(`Cannot resolve iflow CLI entry.js at: ${entryJs}`);
	}

	const siblingNodeExe = path.join(npmBinDir, 'node.exe');
	const command = existsSync(siblingNodeExe) ? siblingNodeExe : 'node';

	return {
		command,
		args: [
			entryJs,
			'--experimental-acp',
			'--port',
			String(port),
			'--stream',
		],
	};
}
