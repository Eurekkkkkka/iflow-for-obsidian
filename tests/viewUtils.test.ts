import { describe, it, expect } from 'vitest';
import { shouldCollapseView } from '../src/app/viewUtils';

describe('shouldCollapseView', () => {
	it('returns true when leaf exists and sidebar is open (toggle off)', () => {
		expect(shouldCollapseView(true, false)).toBe(true);
	});

	it('returns false when leaf exists but sidebar is already collapsed (reveal)', () => {
		expect(shouldCollapseView(true, true)).toBe(false);
	});

	it('returns false when no leaf exists (open new)', () => {
		expect(shouldCollapseView(false, false)).toBe(false);
	});

	it('returns false when forceOpen is true, even if sidebar is open', () => {
		expect(shouldCollapseView(true, false, true)).toBe(false);
	});
});
