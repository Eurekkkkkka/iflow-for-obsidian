/**
 * English language pack
 */
export const enUS = {
	// Model names
	models: {
		'glm-4.7': 'GLM-4.7',
		'glm-5': 'GLM-5',
		'deepseek-v3.2-chat': 'DeepSeek-V3.2',
		'iFlow-ROME-30BA3B': 'iFlow-ROME-30BA3B(Preview)',
		'qwen3-coder-plus': 'Qwen3-Coder-Plus',
		'kimi-k2-thinking': 'Kimi-K2-Thinking',
		'minimax-m2.5': 'MiniMax-M2.5',
		'minimax-m2.1': 'MiniMax-M2.1',
		'kimi-k2-0905': 'Kimi-K2-0905',
		'kimi-k2.5': 'Kimi-K2.5',
	},

	// Mode names
	modes: {
		default: {
			name: 'Normal',
			icon: '⚡'
		},
		yolo: {
			name: 'YOLO',
			icon: '🚀'
		},
		smart: {
			name: 'Smart',
			icon: '🧠'
		},
		plan: {
			name: 'Plan',
			icon: '📋'
		},
	},

	// UI Labels
	ui: {
		send: 'Send',
		thinking: 'Thinking',
		newConversation: 'New Conversation',
		today: 'Today',
		messages: 'messages',
		noMessages: '0 messages',
		noConversations: 'No conversations yet',
		noConversationsFound: 'No conversations found',
		searchConversations: 'Search conversations...',
		now: 'now',
		minutesAgo: '{n}m',
		hoursAgo: '{n}h',
	},

	// Input placeholder
	input: {
		placeholder: 'Ask iFlow anything... (Use @ to reference files, Shift+Enter for new line)',
	},

	// Welcome message
	welcome: {
		title: '👋 Welcome to iFlow!',
		subtitle: 'Your AI-powered coding assistant for Obsidian.',
		helpTitle: 'I can help you with:',
		helpItems: [
			'• Reading and editing your notes',
			'• Searching your vault',
			'• Writing and refactoring code',
			'• Answering questions',
		],
		hint: '\nSelect a model and mode above, then start typing!',
	},

	// Tool calls
	tools: {
		params: '参数：',
		result: '结果：',
		error: '❌ Error: ',
	},

	// Message roles
	roles: {
		user: 'You',
		assistant: 'iFlow',
	},

	// Context indicator
	context: {
		file: '📄 ',
	},

	// Errors
	errors: {
		streamingTimeout: 'Streaming timeout',
		connectionFailed: 'Connection failed',
	},
};

export type Language = typeof enUS;
