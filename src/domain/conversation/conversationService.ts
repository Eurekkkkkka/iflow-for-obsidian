import type {
	Conversation,
	ConversationState,
	Message,
} from '../../conversationStore';
import { cleanupOldConversations, type StorageQuotaInfo } from './storageQuotaPolicy';
import type { ConversationRepository, LocalStorageConversationRepository } from './conversationRepository';

export class ConversationService {
	constructor(private readonly repository: ConversationRepository) {}

	getState(): ConversationState {
		return this.repository.getState();
	}

	getCurrentConversation(): Conversation | null {
		const state = this.repository.getState();
		if (!state.currentConversationId) {
			return null;
		}
		return state.conversations.find((c) => c.id === state.currentConversationId) || null;
	}

	newConversation(): Conversation {
		const state = this.repository.getState();
		const conversation: Conversation = {
			id: `conv-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
			title: 'New Conversation',
			messages: [],
			mode: 'default',
			think: false,
			model: 'glm-4.7',
			createdAt: Date.now(),
			updatedAt: Date.now(),
		};

		this.repository.setState({
			currentConversationId: conversation.id,
			conversations: [conversation, ...state.conversations],
		});
		return conversation;
	}

	switchConversation(conversationId: string): void {
		const state = this.repository.getState();
		if (!state.conversations.find((c) => c.id === conversationId)) {
			return;
		}
		this.repository.setState({ ...state, currentConversationId: conversationId });
	}

	deleteConversation(conversationId: string): void {
		const state = this.repository.getState();
		const conversations = state.conversations.filter((c) => c.id !== conversationId);
		let currentConversationId = state.currentConversationId;
		if (currentConversationId === conversationId) {
			currentConversationId = conversations.length > 0 ? conversations[0].id : null;
		}
		this.repository.setState({ currentConversationId, conversations });
	}

	updateConversationSettings(
		conversationId: string,
		settings: Partial<Pick<Conversation, 'mode' | 'think' | 'model'>>,
	): void {
		const state = this.repository.getState();
		const conversations = state.conversations.map((c) =>
			c.id === conversationId
				? { ...c, ...settings, updatedAt: Date.now() }
				: c,
		);
		this.repository.setState({ ...state, conversations });
	}

	getConversationMessages(conversationId: string): Message[] {
		const state = this.repository.getState();
		const conversation = state.conversations.find((c) => c.id === conversationId);
		return conversation?.messages ?? [];
	}

	appendUserMessage(conversationId: string, content: string): Message {
		const state = this.repository.getState();
		const message: Message = {
			id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
			role: 'user',
			content,
			timestamp: Date.now(),
		};
		const conversations = state.conversations.map((conversation) => {
			if (conversation.id !== conversationId) {
				return conversation;
			}
			const title = conversation.title === 'New Conversation'
				? this.generateTitle(content)
				: conversation.title;
			return {
				...conversation,
				title,
				messages: [...conversation.messages, message],
				updatedAt: Date.now(),
			};
		});
		const cleanupResult = cleanupOldConversations(conversations, state.currentConversationId, 50);
		this.repository.setState({
			currentConversationId: cleanupResult.currentConversationId,
			conversations: cleanupResult.conversations,
		});
		return message;
	}

	appendAssistantMessage(conversationId: string, content: string): Message {
		const state = this.repository.getState();
		const message: Message = {
			id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
			role: 'assistant',
			content,
			timestamp: Date.now(),
		};
		const conversations = state.conversations.map((conversation) => {
			if (conversation.id !== conversationId) {
				return conversation;
			}
			return {
				...conversation,
				messages: [...conversation.messages, message],
				updatedAt: Date.now(),
			};
		});
		this.repository.setState({ ...state, conversations });
		return message;
	}

	subscribe(listener: () => void): () => void {
		return this.repository.subscribe(listener);
	}

	getStorageQuota(): StorageQuotaInfo | null {
		const repo = this.repository as Partial<LocalStorageConversationRepository>;
		if (typeof repo.getStorageQuota === 'function') {
			return repo.getStorageQuota();
		}
		return null;
	}

	private generateTitle(firstMessage: string): string {
		const trimmed = firstMessage.trim();
		return trimmed.length > 50 ? `${trimmed.substring(0, 47)}...` : trimmed;
	}
}
