/**
 * Chinese Simplified language pack
 * 中文简体语言包
 */
export const zhCN = {
	// Model names (keep original as they are model IDs)
	models: {
		'glm-4.7': 'GLM-4.7',
		'glm-5': 'GLM-5',
		'deepseek-v3.2-chat': 'DeepSeek-V3.2',
		'iFlow-ROME-30BA3B': 'iFlow-ROME-30BA3B(预览版)',
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
			name: '普通',
			icon: '⚡'
		},
		yolo: {
			name: '极速',
			icon: '🚀'
		},
		smart: {
			name: '智能',
			icon: '🧠'
		},
		plan: {
			name: '规划',
			icon: '📋'
		},
	},

	// UI Labels
	ui: {
		send: '发送',
		thinking: '思考',
		newConversation: '新对话',
		today: '今天',
		messages: '条消息',
		noMessages: '0 条消息',
		noConversations: '暂无对话',
		noConversationsFound: '未找到对话',
		searchConversations: '搜索对话...',
		now: '刚刚',
		minutesAgo: '{n}分钟前',
		hoursAgo: '{n}小时前',
	},

	// Input placeholder
	input: {
		placeholder: '向 iFlow 提问... (使用 @ 引用文件, Shift+Enter 换行)',
	},

	// Welcome message
	welcome: {
		title: '👋 欢迎使用 iFlow!',
		subtitle: '您的 Obsidian AI 编程助手。',
		helpTitle: '我可以帮助您：',
		helpItems: [
			'• 阅读和编辑笔记',
			'• 搜索您的仓库',
			'• 编写和重构代码',
			'• 回答问题',
		],
		hint: '\n选择上方的模型和模式，然后开始输入！',
	},

	// Tool calls
	tools: {
		params: '参数：',
		result: '结果：',
		error: '❌ 错误: ',
	},

	// Message roles
	roles: {
		user: '你',
		assistant: 'iFlow',
	},

	// Context indicator
	context: {
		file: '📄 ',
	},

	// Errors
	errors: {
		streamingTimeout: '流式传输超时',
		connectionFailed: '连接失败',
	},
};

export type Language = typeof zhCN;
