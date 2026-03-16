import { describe, expect, it } from 'vitest';
import { escapeHtml, renderMessage } from '../src/ui/chat/messageRenderer';

describe('messageRenderer', () => {
	// ── escapeHtml ────────────────────────────────────────────────────────────

	it('escapes html correctly', () => {
		expect(escapeHtml('<script>"x" & y</script>')).toBe('&lt;script&gt;&quot;x&quot; &amp; y&lt;/script&gt;');
	});

	// ── code blocks ──────────────────────────────────────────────────────────

	it('renders fenced code block with escaped code', () => {
		const input = '```ts\nconst a = "<x>"\n```';
		const rendered = renderMessage(input);
		expect(rendered).toContain('iflow-code-block language-ts');
		expect(rendered).toContain('const a = &quot;&lt;x&gt;&quot;');
	});

	it('adds data-lang attribute to code block with language', () => {
		const rendered = renderMessage('```python\nprint("hi")\n```');
		expect(rendered).toContain('data-lang="python"');
	});

	it('does not add data-lang attribute to code block without language', () => {
		const rendered = renderMessage('```\nhello\n```');
		expect(rendered).not.toContain('data-lang');
	});

	// ── inline formatting ────────────────────────────────────────────────────

	it('renders inline code and bold text', () => {
		const rendered = renderMessage('Use `Ctrl+K` and **bold** text.');
		expect(rendered).toContain('iflow-inline-code');
		expect(rendered).toContain('iflow-bold');
	});

	// ── markdown tables ───────────────────────────────────────────────────────

	it('renders a markdown table to HTML table element', () => {
		const input = '| Name | Value |\n| --- | --- |\n| foo | bar |\n';
		const rendered = renderMessage(input);
		expect(rendered).toContain('<table class="iflow-table">');
		expect(rendered).toContain('<th class="iflow-th">Name</th>');
		expect(rendered).toContain('<th class="iflow-th">Value</th>');
		expect(rendered).toContain('<td class="iflow-td">foo</td>');
		expect(rendered).toContain('<td class="iflow-td">bar</td>');
	});

	it('HTML-escapes table cell content', () => {
		const input = '| A | B |\n| --- | --- |\n| <x> | "y" |\n';
		const rendered = renderMessage(input);
		expect(rendered).toContain('&lt;x&gt;');
		expect(rendered).toContain('&quot;y&quot;');
	});

	// ── list containers ───────────────────────────────────────────────────────

	it('wraps unordered list items in a ul element', () => {
		const rendered = renderMessage('- alpha\n- beta\n- gamma');
		expect(rendered).toContain('<ul class="iflow-ul">');
		expect(rendered).toContain('</ul>');
		expect(rendered).toContain('iflow-li');
	});

	it('wraps ordered list items in an ol element', () => {
		const rendered = renderMessage('1. first\n2. second\n3. third');
		expect(rendered).toContain('<ol class="iflow-ol">');
		expect(rendered).toContain('</ol>');
		expect(rendered).toContain('iflow-li-num');
	});

	it('separates adjacent ul and ol lists', () => {
		const rendered = renderMessage('- item\n1. one');
		expect(rendered).toContain('<ul class="iflow-ul">');
		expect(rendered).toContain('</ul>');
		expect(rendered).toContain('<ol class="iflow-ol">');
	});

	// ── thinking blocks ───────────────────────────────────────────────────────

	it('renders blockquote lines as thinking blocks', () => {
		const rendered = renderMessage('> This is a thinking note');
		expect(rendered).toContain('class="iflow-thinking"');
		expect(rendered).toContain('This is a thinking note');
	});

	it('renders legacy * Thinking pattern as thinking block', () => {
		const rendered = renderMessage('* Thinking about the problem');
		expect(rendered).toContain('class="iflow-thinking"');
	});

	it('does not flag normal text as thinking', () => {
		const rendered = renderMessage('This is just a plain paragraph.');
		expect(rendered).not.toContain('iflow-thinking');
	});

	// ── code blocks protect inner content ────────────────────────────────────

	it('code block content is not processed by markdown rules', () => {
		const input = '```md\n**bold** and `code`\n```';
		const rendered = renderMessage(input);
		// Should be inside pre/code, escaped, not turned into HTML tags
		expect(rendered).toContain('**bold**');
		expect(rendered).toContain('`code`');
		expect(rendered).not.toContain('<strong');
	});
});
