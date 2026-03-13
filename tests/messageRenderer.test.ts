import { describe, expect, it } from 'vitest';
import { escapeHtml, renderMessage } from '../src/ui/chat/messageRenderer';

describe('messageRenderer', () => {
	it('escapes html correctly', () => {
		expect(escapeHtml('<script>"x" & y</script>')).toBe('&lt;script&gt;&quot;x&quot; &amp; y&lt;/script&gt;');
	});

	it('renders fenced code blocks with escaped code', () => {
		const input = '```ts\nconst a = "<x>"\n```';
		const rendered = renderMessage(input);
		expect(rendered).toContain('iflow-code-block language-ts');
		expect(rendered).toContain('const a = &quot;&lt;x&gt;&quot;');
	});

	it('renders inline code and bold text', () => {
		const rendered = renderMessage('Use `Ctrl+K` and **bold** text.');
		expect(rendered).toContain('iflow-inline-code');
		expect(rendered).toContain('iflow-bold');
	});
});
