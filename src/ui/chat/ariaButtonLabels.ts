export type ButtonId =
	| 'newConversation'
	| 'imageRemove'
	| 'contextRemove'
	| 'modalClose'
	| 'deleteConversation';

const ARIA_LABELS: Record<ButtonId, string> = {
	newConversation:    '新建会话',
	imageRemove:        '移除图片',
	contextRemove:      '移除上下文文件',
	modalClose:         '关闭预览',
	deleteConversation: '删除会话',
};

export function getButtonAriaLabel(id: ButtonId): string {
	return ARIA_LABELS[id];
}
