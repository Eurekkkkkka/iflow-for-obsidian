import { renderMessage } from './messageRenderer';

export interface RoleLabels {
	user: string;
	assistant: string;
}

export function resolveRoleLabel(role: string, labels: RoleLabels): string {
	if (role === 'user') return labels.user;
	if (role === 'assistant') return labels.assistant;
	return role;
}

export class MessageListView {
	constructor(
		private readonly container: HTMLElement,
		private readonly labels: RoleLabels,
	) {}

	appendMessage(role: string, content: string, id: string): void {
		const messageEl = this.container.createDiv({
			cls: `iflow-message iflow-message-${role}`,
		});
		messageEl.dataset.id = id;
		messageEl.createDiv({ cls: 'iflow-message-role', text: resolveRoleLabel(role, this.labels) });
		const contentEl = messageEl.createDiv({ cls: 'iflow-message-content' });
		contentEl.innerHTML = renderMessage(content);
	}

	updateMessage(id: string, content: string): void {
		const messageEl = this.container.querySelector(`[data-id="${id}"]`);
		if (!messageEl) return;
		const contentEl = messageEl.querySelector('.iflow-message-content');
		if (!contentEl) return;
		contentEl.innerHTML = renderMessage(content);
	}

	showLoading(messageId: string, text: string): void {
		const contentEl = this.getMessageContentElement(messageId);
		if (!contentEl) return;
		contentEl.innerHTML = `
			<div class="iflow-loading">
				<div class="iflow-loading-dots">
					<span></span>
					<span></span>
					<span></span>
				</div>
				<span class="iflow-loading-text">${text}</span>
			</div>
		`;
	}

	hideLoading(messageId: string): void {
		const messageEl = this.container.querySelector(`[data-id="${messageId}"]`);
		if (!messageEl) return;
		const loadingEl = messageEl.querySelector('.iflow-loading');
		if (loadingEl) {
			loadingEl.remove();
		}
	}

	getMessageContentElement(messageId: string): HTMLElement | null {
		const messageEl = this.container.querySelector(`[data-id="${messageId}"]`);
		if (!messageEl) return null;
		return messageEl.querySelector('.iflow-message-content') as HTMLElement | null;
	}

	scrollToBottom(): void {
		requestAnimationFrame(() => {
			this.container.scrollTop = this.container.scrollHeight;
		});
	}

	loadConversation(messages: Array<{ id: string; role: string; content: string }>): void {
		this.container.empty();
		for (const msg of messages) {
			this.appendMessage(msg.role, msg.content, msg.id);
		}
	}
}
