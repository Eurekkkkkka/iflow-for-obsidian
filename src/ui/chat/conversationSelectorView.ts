interface HasTitleAndUpdatedAt {
	title: string;
	updatedAt: number;
}

export interface ConversationGroup<T> {
	label: string;
	conversations: T[];
}

export interface ConversationGroupLabels {
	today: string;
	yesterday: string;
	thisWeek: string;
	older: string;
}

export interface ConversationTimeLabelDeps {
	now?: Date;
	nowLabel: string;
	minutesAgoTemplate: string;
	hoursAgoTemplate: string;
	format: (template: string, vars: { n: number }) => string;
}

export function filterAndSortConversations<T extends HasTitleAndUpdatedAt>(
	conversations: T[],
	searchQuery: string,
): T[] {
	const query = searchQuery.trim().toLowerCase();
	const filtered = query
		? conversations.filter((conversation) => conversation.title.toLowerCase().includes(query))
		: [...conversations];

	return filtered.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function groupConversationsByDate<T extends HasTitleAndUpdatedAt>(
	conversations: T[],
	labels: ConversationGroupLabels,
	now: Date = new Date(),
): ConversationGroup<T>[] {
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
	const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

	const groups: ConversationGroup<T>[] = [
		{ label: labels.today, conversations: [] },
		{ label: labels.yesterday, conversations: [] },
		{ label: labels.thisWeek, conversations: [] },
		{ label: labels.older, conversations: [] },
	];

	for (const conversation of conversations) {
		const date = new Date(conversation.updatedAt);
		if (date >= today) {
			groups[0].conversations.push(conversation);
		} else if (date >= yesterday) {
			groups[1].conversations.push(conversation);
		} else if (date >= thisWeek) {
			groups[2].conversations.push(conversation);
		} else {
			groups[3].conversations.push(conversation);
		}
	}

	return groups;
}

export function formatConversationTimeLabel(
	timestamp: number,
	deps: ConversationTimeLabelDeps,
): string {
	const now = deps.now ?? new Date();
	const date = new Date(timestamp);
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);

	if (diffMins < 1) {
		return deps.nowLabel;
	}
	if (diffMins < 60) {
		return deps.format(deps.minutesAgoTemplate, { n: diffMins });
	}
	if (diffHours < 24) {
		return deps.format(deps.hoursAgoTemplate, { n: diffHours });
	}
	return date.toLocaleDateString();
}
