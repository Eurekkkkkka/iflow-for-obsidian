import type { Conversation, ConversationState } from '../../conversationStore';

export function exportConversationsToJson(state: ConversationState): string {
	return JSON.stringify({
		version: 1,
		exportedAt: new Date().toISOString(),
		conversations: state.conversations,
		currentConversationId: state.currentConversationId,
	}, null, 2);
}

export function exportConversationsToMarkdown(conversations: Conversation[]): string {
	const lines: string[] = [];
	for (const conversation of conversations) {
		lines.push(`# ${conversation.title}`);
		lines.push('');
		lines.push(`**Created:** ${new Date(conversation.createdAt).toLocaleString()}`);
		lines.push(`**Model:** ${conversation.model}`);
		lines.push(`**Mode:** ${conversation.mode}`);
		lines.push('');
		for (const message of conversation.messages) {
			const role = message.role === 'user' ? '👤 **You**' : '🤖 **iFlow**';
			lines.push(`## ${role}`);
			lines.push('');
			lines.push(message.content);
			lines.push('');
		}
		lines.push('---');
		lines.push('');
	}
	return lines.join('\n');
}
