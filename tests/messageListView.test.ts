import { describe, expect, it } from 'vitest';
import { resolveRoleLabel, MessageListView } from '../src/ui/chat/messageListView';

describe('messageListView', () => {
	it('resolves role labels with overrides', () => {
		const labels = { user: '用户', assistant: '助手' };
		expect(resolveRoleLabel('user', labels)).toBe('用户');
		expect(resolveRoleLabel('assistant', labels)).toBe('助手');
	});

	it('falls back for unknown role', () => {
		expect(resolveRoleLabel('system', { user: 'U', assistant: 'A' })).toBe('system');
	});

	it('loadConversation clears container and renders messages', () => {
		const container = createMockContainer();
		const view = new MessageListView(container as any, { user: 'U', assistant: 'A' });

		// First append a message to ensure loadConversation clears it
		view.appendMessage('user', 'old', 'old-1');
		expect(container.children.length).toBe(1);

		const messages = [
			{ id: 'msg-1', role: 'user', content: 'Hello' },
			{ id: 'msg-2', role: 'assistant', content: 'Hi there' },
		];

		view.loadConversation(messages);

		// Container should have been emptied then refilled with 2 messages
		expect(container.children.length).toBe(2);
		expect(container.children[0].dataset.id).toBe('msg-1');
		expect(container.children[1].dataset.id).toBe('msg-2');
	});
});

/**
 * Minimal mock of HTMLElement for testing loadConversation logic.
 */
function createMockContainer() {
	const children: any[] = [];
	const container: any = {
		get children() { return children; },
		createDiv(opts: any) {
			const div: any = {
				cls: opts?.cls,
				dataset: {},
				createDiv(innerOpts: any) {
					const innerDiv: any = { cls: innerOpts?.cls, text: innerOpts?.text, innerHTML: '' };
					return innerDiv;
				},
			};
			children.push(div);
			return div;
		},
		empty() {
			children.length = 0;
		},
		querySelector(_selector: string) {
			return null;
		},
		scrollTop: 0,
		scrollHeight: 0,
	};
	return container;
}
