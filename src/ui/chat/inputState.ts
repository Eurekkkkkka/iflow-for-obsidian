/**
 * Pure function for resolving input area UI state based on streaming/content status.
 * Used by chatView to drive send button enabled/label and textarea placeholder (Phase 6.2).
 */

export interface InputStateInput {
	isStreaming: boolean;
	isEmpty: boolean;
}

export interface InputStateResult {
	sendDisabled: boolean;
	buttonLabel: string;
	placeholder: string;
}

export function resolveInputState({ isStreaming, isEmpty }: InputStateInput): InputStateResult {
	if (isStreaming) {
		return {
			sendDisabled: true,
			buttonLabel: '···',
			placeholder: '正在生成回答，请稍候…',
		};
	}
	return {
		sendDisabled: isEmpty,
		buttonLabel: '↑',
		placeholder: '输入消息… (Enter 发送，Shift+Enter 换行)',
	};
}
