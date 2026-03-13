import { describe, it, expect } from 'vitest';
import { buildSdkSpawnOptions } from '../src/app/sdkSpawnOptions';

describe('buildSdkSpawnOptions', () => {
	it('Windows: shell=true and windowsHide=true to suppress CLI window', () => {
		const opts = buildSdkSpawnOptions('win32');
		expect(opts.shell).toBe(true);
		expect(opts.windowsHide).toBe(true);
	});

	it('Unix: shell=false and windowsHide=false', () => {
		const opts = buildSdkSpawnOptions('linux');
		expect(opts.shell).toBe(false);
		expect(opts.windowsHide).toBe(false);
	});

	it('both platforms: detached=true for background persistence', () => {
		expect(buildSdkSpawnOptions('win32').detached).toBe(true);
		expect(buildSdkSpawnOptions('darwin').detached).toBe(true);
	});
});
