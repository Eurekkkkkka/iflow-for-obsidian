import { describe, expect, it } from 'vitest';
import { resolveWindowsIflowLaunch } from '../src/app/windowsIflowLauncher';

function toPosixPath(value: string): string {
	return value.replace(/\\/g, '/');
}

describe('resolveWindowsIflowLaunch', () => {
	it('uses sibling node.exe when available', () => {
		const appData = 'C:/Users/test/AppData/Roaming';
		const existing = new Set<string>([
			'C:/Users/test/AppData/Roaming/npm/node_modules/@iflow-ai/iflow-cli/bundle/entry.js',
			'C:/Users/test/AppData/Roaming/npm/node.exe',
		]);

		const launch = resolveWindowsIflowLaunch(8090, {
			appData,
			existsSync: (p) => existing.has(toPosixPath(p)),
		});

		expect(toPosixPath(launch.command)).toBe('C:/Users/test/AppData/Roaming/npm/node.exe');
		expect(toPosixPath(launch.args[0])).toBe('C:/Users/test/AppData/Roaming/npm/node_modules/@iflow-ai/iflow-cli/bundle/entry.js');
		expect(launch.args.slice(1)).toEqual(['--experimental-acp', '--port', '8090', '--stream']);
	});

	it('falls back to node when sibling node.exe is missing', () => {
		const appData = 'C:/Users/test/AppData/Roaming';
		const existing = new Set<string>([
			'C:/Users/test/AppData/Roaming/npm/node_modules/@iflow-ai/iflow-cli/bundle/entry.js',
		]);

		const launch = resolveWindowsIflowLaunch(9000, {
			appData,
			existsSync: (p) => existing.has(toPosixPath(p)),
		});

		expect(launch.command).toBe('node');
		expect(toPosixPath(launch.args[0])).toBe('C:/Users/test/AppData/Roaming/npm/node_modules/@iflow-ai/iflow-cli/bundle/entry.js');
		expect(launch.args[3]).toBe('9000');
	});

	it('throws when APPDATA is unavailable', () => {
		expect(() => resolveWindowsIflowLaunch(8090, { appData: '' })).toThrow(
			'APPDATA is not set',
		);
	});

	it('throws when iflow CLI entry.js is missing', () => {
		const appData = 'C:/Users/test/AppData/Roaming';
		expect(() =>
			resolveWindowsIflowLaunch(8090, {
				appData,
				existsSync: () => false,
			}),
		).toThrow('Cannot resolve iflow CLI entry.js');
	});
});
