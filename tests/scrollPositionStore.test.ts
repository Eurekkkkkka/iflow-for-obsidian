import { describe, expect, it } from 'vitest';
import { ScrollPositionStore } from '../src/ui/chat/scrollPositionStore';

describe('ScrollPositionStore', () => {
	it('returns 0 for an unknown conversation id', () => {
		const store = new ScrollPositionStore();
		expect(store.get('unknown-id')).toBe(0);
	});

	it('saves and retrieves scroll position by conversation id', () => {
		const store = new ScrollPositionStore();
		store.save('conv-1', 420);
		expect(store.get('conv-1')).toBe(420);
	});

	it('overwrites an existing entry when saving again', () => {
		const store = new ScrollPositionStore();
		store.save('conv-1', 100);
		store.save('conv-1', 300);
		expect(store.get('conv-1')).toBe(300);
	});

	it('tracks multiple conversations independently', () => {
		const store = new ScrollPositionStore();
		store.save('conv-a', 50);
		store.save('conv-b', 900);
		expect(store.get('conv-a')).toBe(50);
		expect(store.get('conv-b')).toBe(900);
	});

	it('clears position for a specific conversation', () => {
		const store = new ScrollPositionStore();
		store.save('conv-1', 200);
		store.clear('conv-1');
		expect(store.get('conv-1')).toBe(0);
	});
});
