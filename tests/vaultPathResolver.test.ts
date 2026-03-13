import { describe, expect, it } from 'vitest';
import { toVaultRelativePath } from '../src/infra/obsidian/vaultPathResolver';

describe('vaultPathResolver', () => {
	it('converts absolute path under vault to relative path', () => {
		expect(toVaultRelativePath('/vault/docs/a.md', '/vault')).toBe('docs/a.md');
	});

	it('keeps relative path unchanged', () => {
		expect(toVaultRelativePath('docs/a.md', '/vault')).toBe('docs/a.md');
	});

	it('removes leading slash for obsidian relative path style', () => {
		expect(toVaultRelativePath('/docs/a.md', '/vault')).toBe('docs/a.md');
	});
});
