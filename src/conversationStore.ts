export type ConversationMode = "default" | "yolo" | "plan" | "smart";

export type ModelType =
	| "glm-4.7"
	| "glm-5"
	| "deepseek-v3.2-chat"
	| "iFlow-ROME-30BA3B"
	| "qwen3-coder-plus"
	| "kimi-k2-thinking"
	| "minimax-m2.5"
	| "minimax-m2.1"
	| "kimi-k2-0905"
	| "kimi-k2.5";

export interface Message {
	id: string;
	role: "user" | "assistant";
	content: string;
	timestamp: number;
}

export interface Conversation {
	id: string;
	title: string;
	messages: Message[];
	mode: ConversationMode;
	think: boolean;
	model: ModelType;
	createdAt: number;
	updatedAt: number;
}

export interface ConversationState {
	currentConversationId: string | null;
	conversations: Conversation[];
}

const STORAGE_KEY = "iflow-conversations";

export class ConversationStore {
	private state: ConversationState;
	private listeners: Set<() => void> = new Set();

	constructor() {
		this.state = this.load();
	}

	private load(): ConversationState {
		try {
			const data = localStorage.getItem(STORAGE_KEY);
			if (data) {
				return JSON.parse(data);
			}
		} catch (error) {
			console.error("Failed to load conversations:", error);
		}
		return {
			currentConversationId: null,
			conversations: [],
		};
	}

	private save(): void {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
		} catch (error) {
			console.error("Failed to save conversations:", error);
		}
	}

	private notify(): void {
		this.listeners.forEach((listener) => listener());
	}

	getState(): ConversationState {
		return { ...this.state };
	}

	subscribe(callback: () => void): () => void {
		this.listeners.add(callback);
		return () => this.listeners.delete(callback);
	}

	getCurrentConversation(): Conversation | null {
		if (!this.state.currentConversationId) {
			return null;
		}
		return (
			this.state.conversations.find(
				(c) => c.id === this.state.currentConversationId
			) || null
		);
	}

	newConversation(
		defaultModel: ModelType = "glm-4.7",
		defaultMode: ConversationMode = "default",
		defaultThink: boolean = false
	): Conversation {
		const current = this.getCurrentConversation();
		const conversation: Conversation = {
			id: `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			title: "New Conversation",
			messages: [],
			mode: current?.mode ?? defaultMode,
			think: current?.think ?? defaultThink,
			model: current?.model ?? defaultModel,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		};

		this.state = {
			...this.state,
			conversations: [conversation, ...this.state.conversations],
			currentConversationId: conversation.id,
		};

		this.save();
		this.notify();
		return conversation;
	}

	switchConversation(conversationId: string): void {
		const conversation = this.state.conversations.find(
			(c) => c.id === conversationId
		);
		if (!conversation) {
			console.error(`Conversation ${conversationId} not found`);
			return;
		}

		this.state = {
			...this.state,
			currentConversationId: conversationId,
		};

		this.save();
		this.notify();
	}

	deleteConversation(conversationId: string): void {
		const conversations = this.state.conversations.filter(
			(c) => c.id !== conversationId
		);

		let currentConversationId = this.state.currentConversationId;
		if (currentConversationId === conversationId) {
			currentConversationId = conversations.length > 0 ? conversations[0].id : null;
		}

		this.state = {
			conversations,
			currentConversationId,
		};

		this.save();
		this.notify();
	}

	updateConversationSettings(
		conversationId: string,
		settings: Partial<Pick<Conversation, "mode" | "think" | "model">>
	): void {
		const conversations = this.state.conversations.map((c) =>
			c.id === conversationId
				? { ...c, ...settings, updatedAt: Date.now() }
				: c
		);

		this.state = { ...this.state, conversations };
		this.save();
		this.notify();
	}

	addUserMessage(conversationId: string, content: string): Message {
		const message: Message = {
			id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			role: "user",
			content,
			timestamp: Date.now(),
		};

		const conversations = this.state.conversations.map((c) => {
			if (c.id === conversationId) {
				const messages = [...c.messages, message];
				const title =
					c.title === "New Conversation"
						? this.generateTitle(content)
						: c.title;
				return {
					...c,
					messages,
					title,
					updatedAt: Date.now(),
				};
			}
			return c;
		});

		this.state = { ...this.state, conversations };
		this.save();
		this.notify();
		return message;
	}

	addAssistantMessage(conversationId: string, content: string): Message {
		const message: Message = {
			id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			role: "assistant",
			content,
			timestamp: Date.now(),
		};

		const conversations = this.state.conversations.map((c) => {
			if (c.id === conversationId) {
				return {
					...c,
					messages: [...c.messages, message],
					updatedAt: Date.now(),
				};
			}
			return c;
		});

		this.state = { ...this.state, conversations };
		this.save();
		this.notify();
		return message;
	}

	updateAssistantMessage(
		conversationId: string,
		messageId: string,
		content: string
	): void {
		const conversations = this.state.conversations.map((c) => {
			if (c.id === conversationId) {
				const messages = c.messages.map((m) =>
					m.id === messageId ? { ...m, content } : m
				);
				return { ...c, messages, updatedAt: Date.now() };
			}
			return c;
		});

		this.state = { ...this.state, conversations };
		this.save();
		this.notify();
	}

	private generateTitle(firstMessage: string): string {
		// Generate a title from the first user message (max 50 chars)
		const trimmed = firstMessage.trim();
		return trimmed.length > 50
			? trimmed.substring(0, 47) + "..."
			: trimmed;
	}

	getConversationMessages(conversationId: string): Message[] {
		const conversation = this.state.conversations.find(
			(c) => c.id === conversationId
		);
		return conversation?.messages || [];
	}
}
