import type { IFlowToolCall } from '../../iflowService';

export interface ToolCallLabels {
	params: string;
	result: string;
	errorPrefix: string;
}

export function formatToolStatusIcon(status: IFlowToolCall['status']): string {
	if (status === 'completed') return '✅';
	if (status === 'error') return '❌';
	return '🔄';
}

export class ToolCallView {
	constructor(private readonly labels: ToolCallLabels) {}

	showOrUpdate(messageContainer: HTMLElement, tool: IFlowToolCall): void {
		let toolContainer = messageContainer.querySelector(`.iflow-tool-call[data-tool-id="${tool.id}"]`) as HTMLElement | null;

		if (!toolContainer) {
			toolContainer = messageContainer.createDiv({
				cls: `iflow-tool-call iflow-tool-status-${tool.status || 'running'}`,
			});
			toolContainer.dataset.toolId = tool.id;
			const header = toolContainer.createDiv({ cls: 'iflow-tool-header' });
			header.createSpan({ cls: 'iflow-tool-icon', text: formatToolStatusIcon(tool.status) });
			header.createSpan({ cls: 'iflow-tool-name', text: tool.name });
			const details = toolContainer.createDiv({ cls: 'iflow-tool-details' });
			if (tool.input && Object.keys(tool.input).length > 0) {
				details.createDiv({ cls: 'iflow-tool-section-title', text: this.labels.params });
				const inputPre = details.createEl('pre', { cls: 'iflow-tool-input' });
				inputPre.createEl('code', { text: JSON.stringify(tool.input, null, 2) });
			}
			return;
		}

		toolContainer.className = `iflow-tool-call iflow-tool-status-${tool.status || 'running'}`;
		const iconEl = toolContainer.querySelector('.iflow-tool-icon');
		if (iconEl) {
			iconEl.textContent = formatToolStatusIcon(tool.status);
		}

		if (tool.status === 'completed' && tool.result) {
			let resultEl = toolContainer.querySelector('.iflow-tool-result');
			if (!resultEl) {
				const details = toolContainer.querySelector('.iflow-tool-details');
				if (details) {
					details.createDiv({ cls: 'iflow-tool-section-title', text: this.labels.result });
					resultEl = (details as HTMLElement).createEl('pre', { cls: 'iflow-tool-result' });
					const resultText = typeof tool.result === 'string' ? tool.result : JSON.stringify(tool.result, null, 2);
					(resultEl as HTMLElement).createEl('code', { text: resultText });
				}
			}
		}

		if (tool.status === 'error' && tool.error) {
			let errorEl = toolContainer.querySelector('.iflow-tool-error');
			if (!errorEl) {
				const details = toolContainer.querySelector('.iflow-tool-details');
				if (details) {
					errorEl = (details as HTMLElement).createDiv({ cls: 'iflow-tool-error' });
					(errorEl as HTMLElement).createSpan({ text: `${this.labels.errorPrefix}${tool.error}` });
				}
			}
		}
	}
}
