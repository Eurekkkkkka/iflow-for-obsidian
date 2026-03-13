import { describe, it, expect } from 'vitest';
import { buildChatContext, type BuildChatContextDeps } from '../src/features/chat/chatContextBuilder';

function makeDeps(overrides: Partial<BuildChatContextDeps> = {}): BuildChatContextDeps {
	return {
		getActiveFile: () => null,
		readFile: async () => '',
		getFileTags: () => [],
		getSelection: () => '',
		excludedTags: [],
		...overrides,
	};
}

const fakeFile = { path: 'notes/hello.md' } as any;

describe('buildChatContext', () => {
	it('returns empty context when no active file', async () => {
		const ctx = await buildChatContext(makeDeps());
		expect(ctx).toEqual({});
	});

	it('returns filePath, fileContent and selection for normal file', async () => {
		const ctx = await buildChatContext(makeDeps({
			getActiveFile: () => fakeFile,
			readFile: async () => '# Hello',
			getSelection: () => 'selected text',
		}));
		expect(ctx).toEqual({
			filePath: 'notes/hello.md',
			fileContent: '# Hello',
			selection: 'selected text',
		});
	});

	it('returns only filePath when file has excluded tag', async () => {
		const ctx = await buildChatContext(makeDeps({
			getActiveFile: () => fakeFile,
			readFile: async () => 'secret',
			getFileTags: () => ['#private'],
			excludedTags: ['#private'],
		}));
		expect(ctx).toEqual({ filePath: 'notes/hello.md' });
	});
});
