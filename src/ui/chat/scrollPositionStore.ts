/**
 * In-memory store for conversation scroll positions.
 * Used to restore reading position when switching between conversations (Phase 6.3).
 */
export class ScrollPositionStore {
	private readonly positions = new Map<string, number>();

	/** Returns the saved scroll position, or 0 if none exists. */
	get(conversationId: string): number {
		return this.positions.get(conversationId) ?? 0;
	}

	/** Saves the current scroll position for a conversation. */
	save(conversationId: string, scrollTop: number): void {
		this.positions.set(conversationId, scrollTop);
	}

	/** Clears the saved position for a conversation (resets to 0). */
	clear(conversationId: string): void {
		this.positions.delete(conversationId);
	}
}
