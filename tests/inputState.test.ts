import { describe, expect, it } from 'vitest';
import { resolveInputState } from '../src/ui/chat/inputState';

describe('resolveInputState', () => {
	it('returns enabled send when not streaming and content is non-empty', () => {
		const state = resolveInputState({ isStreaming: false, isEmpty: false });
		expect(state.sendDisabled).toBe(false);
	});

	it('disables send when content is empty and not streaming', () => {
		const state = resolveInputState({ isStreaming: false, isEmpty: true });
		expect(state.sendDisabled).toBe(true);
	});

	it('disables send when streaming (regardless of content)', () => {
		expect(resolveInputState({ isStreaming: true, isEmpty: false }).sendDisabled).toBe(true);
		expect(resolveInputState({ isStreaming: true, isEmpty: true }).sendDisabled).toBe(true);
	});

	it('returns streaming button label when streaming', () => {
		const state = resolveInputState({ isStreaming: true, isEmpty: false });
		expect(state.buttonLabel).toBeTruthy();
		expect(state.buttonLabel).not.toBe('');
	});

	it('returns normal button label when not streaming', () => {
		const normal = resolveInputState({ isStreaming: false, isEmpty: false });
		const streaming = resolveInputState({ isStreaming: true, isEmpty: false });
		expect(normal.buttonLabel).not.toBe(streaming.buttonLabel);
	});

	it('returns a placeholder string', () => {
		const state = resolveInputState({ isStreaming: false, isEmpty: true });
		expect(typeof state.placeholder).toBe('string');
		expect(state.placeholder.length).toBeGreaterThan(0);
	});
});
