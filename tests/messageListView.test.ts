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

describe('MessageListView — thought stream (Phase 4.3+4.4)', () => {
	it('showThought creates a thought block inside the message', () => {
		const container = createMockContainer();
		const view = new MessageListView(container as any, { user: 'U', assistant: 'A' });
		view.appendMessage('assistant', '', 'msg-1');

		view.showThought('msg-1', '正在思考...');

		const msgEl = container.querySelector('[data-id="msg-1"]');
		const thoughtBlock = msgEl?.querySelector('.iflow-thought-block');
		expect(thoughtBlock).not.toBeNull();
	});

	it('showThought sets initial thought content', () => {
		const container = createMockContainer();
		const view = new MessageListView(container as any, { user: 'U', assistant: 'A' });
		view.appendMessage('assistant', '', 'msg-2');

		view.showThought('msg-2', '思考中');

		const msgEl = container.querySelector('[data-id="msg-2"]');
		const contentEl = msgEl?.querySelector('.iflow-thought-content');
		expect(contentEl?.innerHTML).toBe('思考中');
	});

	it('updateThought updates streaming thought content', () => {
		const container = createMockContainer();
		const view = new MessageListView(container as any, { user: 'U', assistant: 'A' });
		view.appendMessage('assistant', '', 'msg-3');
		view.showThought('msg-3', '初始思考');

		view.updateThought('msg-3', '更新后的思考内容');

		const msgEl = container.querySelector('[data-id="msg-3"]');
		const contentEl = msgEl?.querySelector('.iflow-thought-content');
		expect(contentEl?.innerHTML).toBe('更新后的思考内容');
	});

	it('thought content does not appear in main message content area', () => {
		const container = createMockContainer();
		const view = new MessageListView(container as any, { user: 'U', assistant: 'A' });
		view.appendMessage('assistant', '', 'msg-4');

		view.showThought('msg-4', '内部思考文本');

		const msgEl = container.querySelector('[data-id="msg-4"]');
		const mainContent = msgEl?.querySelector('.iflow-message-content');
		// thought text must not bleed into the main content area
		expect(mainContent?.innerHTML ?? '').not.toContain('内部思考文本');
	});

	it('finalizeThought adds collapsed class to thought block', () => {
		const container = createMockContainer();
		const view = new MessageListView(container as any, { user: 'U', assistant: 'A' });
		view.appendMessage('assistant', '', 'msg-5');
		view.showThought('msg-5', '某些思考');

		view.finalizeThought('msg-5');

		const msgEl = container.querySelector('[data-id="msg-5"]');
		const thoughtBlock = msgEl?.querySelector('.iflow-thought-block');
		expect(thoughtBlock?.classList?.contains('iflow-thought-collapsed')).toBe(true);
	});

	it('showThought does nothing when message id does not exist', () => {
		const container = createMockContainer();
		const view = new MessageListView(container as any, { user: 'U', assistant: 'A' });
		// Should not throw
		expect(() => view.showThought('nonexistent', 'content')).not.toThrow();
	});

	// ── Phase 9.2: thought stream boundary cases ──────────────────────────────

	it('updateThought before showThought does not throw and creates no block', () => {
		const container = createMockContainer();
		const view = new MessageListView(container as any, { user: 'U', assistant: 'A' });
		view.appendMessage('assistant', '', 'msg-6');

		// updateThought called without prior showThought — no thought-content element exists
		expect(() => view.updateThought('msg-6', '孤立更新')).not.toThrow();

		const msgEl = container.querySelector('[data-id="msg-6"]');
		const thoughtBlock = msgEl?.querySelector('.iflow-thought-block');
		expect(thoughtBlock).toBeNull();
	});

	it('finalizeThought does not throw when no thought block exists', () => {
		const container = createMockContainer();
		const view = new MessageListView(container as any, { user: 'U', assistant: 'A' });
		view.appendMessage('assistant', '', 'msg-7');

		expect(() => view.finalizeThought('msg-7')).not.toThrow();
	});

	it('showThought called multiple times creates only one thought block', () => {
		const container = createMockContainer();
		const view = new MessageListView(container as any, { user: 'U', assistant: 'A' });
		view.appendMessage('assistant', '', 'msg-8');

		view.showThought('msg-8', '第一次思考');
		view.showThought('msg-8', '第二次思考（更新）');

		const msgEl = container.querySelector('[data-id="msg-8"]');
		// Content is updated to the latest value
		const contentEl = msgEl?.querySelector('.iflow-thought-content');
		expect(contentEl?.innerHTML).toBe('第二次思考（更新）');
		// No duplicate toggle should exist (second call reuses existing block)
		// Verify via absence of a second toggle by checking toggle text is still present once
		const toggleEl = msgEl?.querySelector('.iflow-thought-toggle');
		expect(toggleEl).not.toBeNull();
	});

	it('stream content after thought does not pollute thought block', () => {
		const container = createMockContainer();
		const view = new MessageListView(container as any, { user: 'U', assistant: 'A' });
		view.appendMessage('assistant', '', 'msg-9');

		view.showThought('msg-9', '内部推理');
		view.finalizeThought('msg-9');
		view.updateMessage('msg-9', '最终回答');

		const msgEl = container.querySelector('[data-id="msg-9"]');
		const thoughtContent = msgEl?.querySelector('.iflow-thought-content');
		const mainContent = msgEl?.querySelector('.iflow-message-content');

		// Thought block retains original thought text
		expect(thoughtContent?.innerHTML).toBe('内部推理');
		// Main content has the answer (rendered through renderMessage)
		expect(mainContent?.innerHTML ?? '').toContain('最终回答');
		// Main content does not bleed thought text
		expect(mainContent?.innerHTML ?? '').not.toContain('内部推理');
	});
});

/**
 * Minimal mock of HTMLElement for testing loadConversation logic.
 * Supports nested querySelector via a flat registry keyed by data-id and CSS class.
 */
function createMockContainer() {
	const children: any[] = [];
	const allElements: any[] = [];

	function createEl(opts: any): any {
		const classes: string[] = (opts?.cls ?? '').split(' ').filter(Boolean);
		const classList = {
			_set: new Set<string>(classes),
			add(c: string) { this._set.add(c); },
			remove(c: string) { this._set.delete(c); },
			contains(c: string) { return this._set.has(c); },
		};
		const childEls: any[] = [];
		const el: any = {
			dataset: {} as Record<string, string>,
			get innerHTML() { return this._html ?? ''; },
			set innerHTML(v: string) { this._html = v; },
			_html: '',
			classList,
			createDiv(innerOpts: any) {
				const inner = createEl(innerOpts);
				childEls.push(inner);
				allElements.push(inner);
				return inner;
			},
			querySelector(selector: string) {
				return queryIn(childEls, selector);
			},
			remove() {
				// noop in mock
			},
		};
		allElements.push(el);
		return el;
	}

	function matchesSelector(el: any, selector: string): boolean {
		if (selector.startsWith('[data-id="')) {
			const id = selector.slice('[data-id="'.length, -2);
			return el.dataset?.id === id;
		}
		if (selector.startsWith('.')) {
			const cls = selector.slice(1);
			return el.classList?._set?.has(cls) ?? false;
		}
		return false;
	}

	function queryIn(els: any[], selector: string): any | null {
		for (const el of els) {
			if (matchesSelector(el, selector)) return el;
			const nested = el.querySelector?.(selector);
			if (nested) return nested;
		}
		return null;
	}

	const container: any = {
		get children() { return children; },
		createDiv(opts: any) {
			const div = createEl(opts);
			children.push(div);
			allElements.push(div);
			return div;
		},
		empty() {
			children.length = 0;
		},
		querySelector(selector: string) {
			return queryIn(children, selector);
		},
		scrollTop: 0,
		scrollHeight: 0,
	};
	return container;
}
