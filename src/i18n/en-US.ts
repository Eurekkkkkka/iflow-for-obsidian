/**
 * English language pack
 */
export const enUS = {
	// UI Labels
	ui: {
		send: 'Send',
		newConversation: 'New Conversation',
		today: 'Today',
		yesterday: 'Yesterday',
		thisWeek: 'This Week',
		older: 'Older',
		messages: 'messages',
		noMessages: '0 messages',
		clearSearch: 'Clear search',
		startNewConversation: 'Start new conversation',
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

	// Runtime status
	status: {
		detecting: 'Detecting',
		connected: 'Connected',
		starting: 'Starting',
		startFailed: 'Start failed',
		authFailed: 'Auth failed',
		sending: 'Sending',
		completed: 'Completed',
		timedOut: 'Timed out',
		reconnecting: 'Reconnecting',
		disconnected: 'Disconnected',
	},

	// Errors
	errors: {
		streamingTimeout: 'Streaming timeout',
		connectionFailed: 'Connection failed',
		sendFailed: 'Send failed, please try again',
		sdkNotInstalled: 'iFlow CLI not found. Run: npm install -g @iflow-ai/iflow-cli@latest',
		sdkAuthFailed: 'iFlow CLI authentication failed. Please check your account.',
		sdkPortBusy: 'Port {port} is in use. Change the port in Settings and retry.',
		sdkStartTimeout: 'iFlow CLI start timed out. Run `iflow` manually then retry.',
		genericHint: 'If the issue persists, restart Obsidian or check the console logs.',
	},

	// Settings page
	settings: {
		title: 'iFlow for Obsidian Settings',
		port: 'iFlow CLI WebSocket Port',
		portDesc: 'The port number that iFlow CLI is listening on (default: 8090)',
		timeout: 'Connection Timeout (ms)',
		timeoutDesc: 'Timeout for connecting to iFlow CLI (default: 60000)',
		autoScroll: 'Enable Auto Scroll',
		autoScrollDesc: 'Automatically scroll to bottom during streaming responses',
		excludedTags: 'Excluded Tags',
		excludedTagsDesc: 'Notes with these tags will not be automatically attached to conversations (comma-separated)',
		language: 'Interface Language',
		languageDesc: 'Select the display language for the plugin interface',
		languageOptions: {
			'zh-CN': '中文简体',
			'en-US': 'English',
		},
		cliRequirements: 'iFlow CLI Requirements',
		cliRequirementsDesc: 'This plugin requires iFlow CLI to be installed and running. Install it with: npm install -g @iflow-ai/iflow-cli@latest',
		connectionStatus: 'Connection Status: ',
		connected: '✓ Connected',
		disconnected: '✗ Disconnected',
		checking: 'Checking...',
		autoAttachFile: 'Auto Attach Current File',
		autoAttachFileDesc: 'Automatically attach the current file as context when opening it',
	},

	// Attachment context
	attachment: {
		removeFile: 'Remove attachment',
		noFileAttached: 'No file attached',
		dropImageHere: 'Drop image here',
		pasteImage: 'or paste image (Ctrl+V)',
		imageTooLarge: 'Image exceeds size limit (max 5MB)',
		unsupportedImageType: 'Unsupported image type',
	},

	// Context indicator
	context: {
		file: '📄 ',
		attached: 'Attached: ',
		autoLabel: 'auto',
		manualLabel: 'manual',
		removeContext: 'Remove',
		selectionLabel: 'Selection',
	},
};

export type Language = typeof enUS;
