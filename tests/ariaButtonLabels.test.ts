import { describe, expect, it } from 'vitest';
import { getButtonAriaLabel, type ButtonId } from '../src/ui/chat/ariaButtonLabels';

describe('getButtonAriaLabel', () => {
	it('returns Chinese label for new conversation button', () => {
		expect(getButtonAriaLabel('newConversation')).toBe('新建会话');
	});

	it('returns Chinese label for image remove button', () => {
		expect(getButtonAriaLabel('imageRemove')).toBe('移除图片');
	});

	it('returns Chinese label for context remove button', () => {
		expect(getButtonAriaLabel('contextRemove')).toBe('移除上下文文件');
	});

	it('returns Chinese label for modal close button', () => {
		expect(getButtonAriaLabel('modalClose')).toBe('关闭预览');
	});

	it('returns Chinese label for delete conversation button', () => {
		expect(getButtonAriaLabel('deleteConversation')).toBe('删除会话');
	});

	it('all labels are non-empty strings', () => {
		const ids: ButtonId[] = [
			'newConversation',
			'imageRemove',
			'contextRemove',
			'modalClose',
			'deleteConversation',
		];
		for (const id of ids) {
			const label = getButtonAriaLabel(id);
			expect(typeof label).toBe('string');
			expect(label.length).toBeGreaterThan(0);
		}
	});
});
