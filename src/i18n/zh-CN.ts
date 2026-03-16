/**
 * Chinese Simplified language pack
 * 中文简体语言包
 */
export const zhCN = {
	// UI Labels
	ui: {
		send: '发送',
		newConversation: '新对话',
		today: '今天',
		yesterday: '昨天',
		thisWeek: '本周',
		older: '更早',
		messages: '条消息',
		noMessages: '0 条消息',
		clearSearch: '清空搜索',
		startNewConversation: '新建对话',
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

	// Runtime status
	status: {
		detecting: '检测中',
		connected: '已连接',
		starting: '启动中',
		startFailed: '启动失败',
		authFailed: '认证失败',
		sending: '发送中',
		completed: '已完成',
		timedOut: '已超时',
		reconnecting: '重连中',
		disconnected: '未连接',
	},

	// Errors
	errors: {
		streamingTimeout: '流式传输超时',
		connectionFailed: '连接失败',
		sendFailed: '发送失败，请重试',
		sdkNotInstalled: '未检测到 iFlow CLI，请运行: npm install -g @iflow-ai/iflow-cli@latest',
		sdkAuthFailed: 'iFlow CLI 认证失败，请检查账号状态',
		sdkPortBusy: '端口 {port} 被占用，请在设置中修改端口后重试',
		sdkStartTimeout: 'iFlow CLI 启动超时，请手动运行 iflow 后重试',
		genericHint: '如仍无法解决，请重启 Obsidian 或检查日志',
	},

	// Settings page
	settings: {
		title: 'iFlow for Obsidian 设置',
		port: 'iFlow CLI WebSocket 端口',
		portDesc: 'iFlow CLI 监听的端口号 (默认: 8090)',
		timeout: '连接超时 (毫秒)',
		timeoutDesc: '连接 iFlow CLI 的超时时间 (默认: 60000)',
		autoScroll: '启用自动滚动',
		autoScrollDesc: '在流式响应期间自动滚动到底部',
		excludedTags: '排除标签',
		excludedTagsDesc: '带有这些标签的笔记不会自动附加到对话中 (用逗号分隔)',
		language: '界面语言',
		languageDesc: '选择插件界面的显示语言',
		languageOptions: {
			'zh-CN': '中文简体',
			'en-US': 'English',
		},
		cliRequirements: 'iFlow CLI 要求',
		cliRequirementsDesc: '此插件需要安装并运行 iFlow CLI。安装命令: npm install -g @iflow-ai/iflow-cli@latest',
		connectionStatus: '连接状态: ',
		connected: '✓ 已连接',
		disconnected: '✗ 未连接',
		checking: '检测中...',
		autoAttachFile: '自动附加当前文件',
		autoAttachFileDesc: '当打开文件时自动将其作为上下文附加到对话中',
	},

	// Attachment context
	attachment: {
		removeFile: '移除附件',
		noFileAttached: '无附加文件',
		dropImageHere: '拖放图片到此处',
		pasteImage: '或粘贴图片 (Ctrl+V)',
		imageTooLarge: '图片大小超过限制 (最大 5MB)',
		unsupportedImageType: '不支持的图片格式',
	},

	// Context indicator
	context: {
		file: '📄 ',
		attached: '已附加: ',
		autoLabel: '自动',
		manualLabel: '手动',
		removeContext: '移除',
		selectionLabel: '选中文本',
	},
};

export type Language = typeof zhCN;
