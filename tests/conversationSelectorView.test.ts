import { describe, expect, it } from 'vitest';
import {
	filterAndSortConversations,
	formatConversationTimeLabel,
	groupConversationsByDate,
} from '../src/ui/chat/conversationSelectorView';

describe('conversationSelectorView helpers', () => {
	it('filters by query and sorts by updatedAt desc', () => {
		const conversations = [
			{ id: '1', title: 'Plan task', updatedAt: 100 },
			{ id: '2', title: 'Daily notes', updatedAt: 300 },
			{ id: '3', title: 'Plan release', updatedAt: 200 },
		];

		const result = filterAndSortConversations(conversations, 'plan');
		expect(result.map((item) => item.id)).toEqual(['3', '1']);
	});

	it('groups conversations by date buckets', () => {
		const now = new Date('2026-03-12T12:00:00.000Z');
		const conversations = [
			{ id: 'today', title: 'A', updatedAt: new Date('2026-03-12T08:00:00.000Z').getTime() },
			{ id: 'yesterday', title: 'B', updatedAt: new Date('2026-03-11T08:00:00.000Z').getTime() },
			{ id: 'week', title: 'C', updatedAt: new Date('2026-03-08T08:00:00.000Z').getTime() },
			{ id: 'older', title: 'D', updatedAt: new Date('2026-02-20T08:00:00.000Z').getTime() },
		];

		const groups = groupConversationsByDate(
			conversations,
			{ today: 'Today', yesterday: 'Yesterday', thisWeek: 'This Week', older: 'Older' },
			now,
		);

		expect(groups[0].conversations.map((item) => item.id)).toEqual(['today']);
		expect(groups[1].conversations.map((item) => item.id)).toEqual(['yesterday']);
		expect(groups[2].conversations.map((item) => item.id)).toEqual(['week']);
		expect(groups[3].conversations.map((item) => item.id)).toEqual(['older']);
	});

	it('formats relative time using provided templates', () => {
		const now = new Date('2026-03-12T12:00:00.000Z');
		const minutes = formatConversationTimeLabel(new Date('2026-03-12T11:30:00.000Z').getTime(), {
			now,
			nowLabel: 'Now',
			minutesAgoTemplate: '{n}m ago',
			hoursAgoTemplate: '{n}h ago',
			format: (template, vars) => template.replace('{n}', String(vars.n)),
		});
		expect(minutes).toBe('30m ago');
	});
});
