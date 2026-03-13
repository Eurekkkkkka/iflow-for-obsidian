import { describe, expect, it } from 'vitest';
import { composePrompt } from '../src/features/chat/promptComposer';

describe('promptComposer', () => {
	it('adds chinese instruction and user message', () => {
		const prompt = composePrompt({ userMessage: 'hello' });
		expect(prompt).toContain('请始终使用中文');
		expect(prompt).toContain('hello');
	});

	it('adds canvas guidance when user asks canvas', () => {
		const prompt = composePrompt({ userMessage: '帮我做一个思维导图 canvas' });
		expect(prompt).toContain('fs/write_text_file');
		expect(prompt).toContain('Canvas');
	});

	it('includes file and selection context when provided', () => {
		const prompt = composePrompt({
			userMessage: 'fix',
			filePath: 'a.ts',
			selection: 'const a = 1',
		});
		expect(prompt).toContain('a.ts');
		expect(prompt).toContain('const a = 1');
	});
});
