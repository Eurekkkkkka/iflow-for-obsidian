import type {
	Conversation,
	ConversationState,
	ConversationMode,
	ModelType,
} from '../../conversationStore';

export interface ConversationRepository {
	getState(): ConversationState;
	setState(state: ConversationState): void;
	subscribe(listener: () => void): () => void;
}

export class InMemoryConversationRepository implements ConversationRepository {
	private state: ConversationState = {
		currentConversationId: null,
		conversations: [],
	};
	private readonly listeners = new Set<() => void>();

	getState(): ConversationState {
		return {
			currentConversationId: this.state.currentConversationId,
			conversations: [...this.state.conversations],
		};
	}

	setState(state: ConversationState): void {
		this.state = {
			currentConversationId: state.currentConversationId,
			conversations: [...state.conversations],
		};
		this.listeners.forEach((listener) => listener());
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}
}

/** 可注入的 Storage 接口，方便测试使用 mock */
export interface StorageAdapter {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
}

const STORAGE_VERSION = 1;

export class LocalStorageConversationRepository implements ConversationRepository {
	private state: ConversationState;
	private readonly storageKey: string;
	private readonly listeners = new Set<() => void>();

	constructor(
		vaultPath: string,
		private readonly storage: StorageAdapter = localStorage,
	) {
		this.storageKey = `iflow-conversations-${this.hashVaultPath(vaultPath)}`;
		this.state = this.load();
	}

	getState(): ConversationState {
		return {
			currentConversationId: this.state.currentConversationId,
			conversations: [...this.state.conversations],
		};
	}

	setState(state: ConversationState): void {
		this.state = {
			currentConversationId: state.currentConversationId,
			conversations: [...state.conversations],
		};
		this.save();
		this.listeners.forEach((listener) => listener());
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private load(): ConversationState {
		try {
			const data = this.storage.getItem(this.storageKey);
			if (data) {
				const parsed = JSON.parse(data);
				return {
					currentConversationId: parsed.currentConversationId ?? null,
					conversations: parsed.conversations ?? [],
				};
			}
		} catch (error) {
			console.error('[ConversationRepository] Failed to load:', error);
		}
		return { currentConversationId: null, conversations: [] };
	}

	private save(): void {
		try {
			const persisted = {
				...this.state,
				version: STORAGE_VERSION,
				updatedAt: Date.now(),
			};
			this.storage.setItem(this.storageKey, JSON.stringify(persisted));
		} catch (error) {
			console.error('[ConversationRepository] Failed to save:', error);
		}
	}

	private hashVaultPath(path: string): string {
		let hash = 0;
		for (let i = 0; i < path.length; i++) {
			const char = path.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash;
		}
		return Math.abs(hash).toString(36);
	}
}
