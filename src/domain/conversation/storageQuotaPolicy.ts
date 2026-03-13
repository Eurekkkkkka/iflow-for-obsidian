export interface StorageQuotaInfo {
	usedBytes: number;
	totalBytes: number;
	percentUsed: number;
	approachingLimit: boolean;
	atLimit: boolean;
}

export interface HasUpdatedAt {
	id: string;
	updatedAt: number;
}

export const MAX_STORAGE_BYTES = 4 * 1024 * 1024;
export const WARNING_THRESHOLD = 0.8;
export const CRITICAL_THRESHOLD = 0.95;

export function calculateStorageQuotaInfo(data: string | null): StorageQuotaInfo {
	const usedBytes = data ? data.length : 0;
	const percentUsed = usedBytes / MAX_STORAGE_BYTES;

	return {
		usedBytes,
		totalBytes: MAX_STORAGE_BYTES,
		percentUsed,
		approachingLimit: percentUsed >= WARNING_THRESHOLD,
		atLimit: percentUsed >= CRITICAL_THRESHOLD,
	};
}

export function cleanupOldConversations<T extends HasUpdatedAt>(
	conversations: T[],
	currentConversationId: string | null,
	keepCount: number = 50,
): { conversations: T[]; currentConversationId: string | null; removedCount: number } {
	const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
	const kept = sorted.slice(0, keepCount);
	const removedCount = Math.max(0, conversations.length - kept.length);

	let nextCurrentConversationId = currentConversationId;
	if (nextCurrentConversationId) {
		const stillExists = kept.find((conversation) => conversation.id === nextCurrentConversationId);
		if (!stillExists) {
			nextCurrentConversationId = kept[0]?.id || null;
		}
	}

	return {
		conversations: kept,
		currentConversationId: nextCurrentConversationId,
		removedCount,
	};
}
