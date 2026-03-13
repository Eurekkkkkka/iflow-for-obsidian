interface CanvasNode {
	id: string;
	type: 'text' | 'file' | 'link' | 'group';
	x: number;
	y: number;
	width: number;
	height: number;
	text?: string;
}

interface CanvasData {
	nodes?: CanvasNode[];
	edges?: any[];
}

export function isCanvasFile(filePath: string): boolean {
	return filePath.endsWith('.canvas');
}

export function generateCanvasId(): string {
	return Math.random().toString(36).substring(2, 15);
}

export function generateBasicCanvas(content?: string): string {
	const canvasData: CanvasData = {
		nodes: [
			{
				id: generateCanvasId(),
				type: 'text',
				x: 0,
				y: 0,
				width: 250,
				height: 100,
				text: content || '新节点 - 双击编辑文本',
			},
		],
		edges: [],
	};

	return JSON.stringify(canvasData, null, '\t');
}

export function normalizeCanvasContent(content: string): string {
	try {
		const parsed = JSON.parse(content);
		if (parsed && (parsed.nodes || parsed.edges)) {
			return JSON.stringify(parsed, null, '\t');
		}
	} catch (_error) {
		// Fall back to a basic canvas when content is not valid JSON.
	}

	return generateBasicCanvas(content);
}
