import { describe, expect, it } from 'vitest';
import { isCanvasFile, normalizeCanvasContent } from '../src/infra/obsidian/canvasFileAdapter';

describe('canvasFileAdapter', () => {
	it('detects canvas extension', () => {
		expect(isCanvasFile('note.canvas')).toBe(true);
		expect(isCanvasFile('note.md')).toBe(false);
	});

	it('keeps valid canvas json shape', () => {
		const input = JSON.stringify({ nodes: [], edges: [] });
		const output = normalizeCanvasContent(input);
		expect(JSON.parse(output)).toEqual({ nodes: [], edges: [] });
	});

	it('falls back to generated canvas when input is invalid json', () => {
		const output = normalizeCanvasContent('not a json');
		const parsed = JSON.parse(output);
		expect(Array.isArray(parsed.nodes)).toBe(true);
		expect(Array.isArray(parsed.edges)).toBe(true);
		expect(parsed.nodes[0].text).toContain('not a json');
	});
});
