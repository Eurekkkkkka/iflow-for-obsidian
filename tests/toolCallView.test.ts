import { describe, expect, it } from 'vitest';
import { formatToolStatusIcon } from '../src/ui/chat/toolCallView';

describe('toolCallView', () => {
	it('returns icon by status', () => {
		expect(formatToolStatusIcon('completed')).toBe('✅');
		expect(formatToolStatusIcon('error')).toBe('❌');
		expect(formatToolStatusIcon('running')).toBe('🔄');
	});
});
