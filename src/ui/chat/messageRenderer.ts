export function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

// ── helpers ──────────────────────────────────────────────────────────────────

function splitTableRow(row: string): string[] {
	return row.split('|').slice(1, -1).map((cell) => cell.trim());
}

function renderMarkdownTables(content: string): string {
	// header | separator | body rows
	return content.replace(
		/^(\|.+\|)[ \t]*\n(\|[-: |]+\|)[ \t]*\n((?:\|.+\|[ \t]*\n?)+)/gm,
		(_match, header, _sep, body) => {
			const headerCells = splitTableRow(header).map((c) => escapeHtml(c));
			const bodyLines = body
				.trim()
				.split('\n')
				.filter((r: string) => r.trim().startsWith('|'));
			const thead = `<thead><tr>${headerCells
				.map((c: string) => `<th class="iflow-th">${c}</th>`)
				.join('')}</tr></thead>`;
			const tbody = `<tbody>${bodyLines
				.map((row: string) => {
					const cells = splitTableRow(row).map((c) => escapeHtml(c));
					return `<tr>${cells.map((c: string) => `<td class="iflow-td">${c}</td>`).join('')}</tr>`;
				})
				.join('')}</tbody>`;
			return `<table class="iflow-table">${thead}${tbody}</table>`;
		},
	);
}

function wrapListItems(content: string): string {
	const lines = content.split('\n');
	const out: string[] = [];
	let listType: 'ul' | 'ol' | null = null;

	for (const line of lines) {
		const isOl = /^<li class="iflow-li iflow-li-num"/.test(line);
		const isUl = !isOl && /^<li class="iflow-li"/.test(line);

		if (isUl) {
			if (listType === 'ol') { out.push('</ol>'); }
			if (listType !== 'ul') { out.push('<ul class="iflow-ul">'); listType = 'ul'; }
		} else if (isOl) {
			if (listType === 'ul') { out.push('</ul>'); }
			if (listType !== 'ol') { out.push('<ol class="iflow-ol">'); listType = 'ol'; }
		} else if (listType !== null) {
			out.push(listType === 'ul' ? '</ul>' : '</ol>');
			listType = null;
		}
		out.push(line);
	}

	if (listType === 'ul') out.push('</ul>');
	else if (listType === 'ol') out.push('</ol>');

	return out.join('\n');
}

// ── main export ───────────────────────────────────────────────────────────────

export function renderMessage(content: string): string {
	// Pass 1: Extract code blocks (protect from subsequent passes).
	const codeBlocks: string[] = [];
	let result = content.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
		const langClass = lang ? `language-${lang}` : '';
		const langAttr = lang ? ` data-lang="${escapeHtml(lang)}"` : '';
		const html = `<pre class="iflow-code-block ${langClass}"${langAttr}><code>${escapeHtml(code.trim())}</code></pre>`;
		const placeholder = `\x00CODE${codeBlocks.length}\x00`;
		codeBlocks.push(html);
		return placeholder;
	});

	// Pass 2: Markdown tables (multi-line block, must precede inline passes).
	result = renderMarkdownTables(result);

	// Pass 3: Blockquotes → thinking blocks (standard Markdown `> ` prefix).
	result = result.replace(/^>\s+(.+)$/gm, '<div class="iflow-thinking">$1</div>');
	// Legacy: lines starting with `* Thinking …`
	result = result.replace(/^\*\s*(Thinking.+)$/gm, '<div class="iflow-thinking">$1</div>');

	// Pass 4: ATX headings.
	result = result.replace(/^### (.+)$/gm, '<h4 class="iflow-h4">$1</h4>');
	result = result.replace(/^## (.+)$/gm, '<h3 class="iflow-h3">$1</h3>');
	result = result.replace(/^# (.+)$/gm, '<h2 class="iflow-h2">$1</h2>');

	// Pass 5: Inline formatting.
	result = result.replace(/`([^`]+)`/g, '<code class="iflow-inline-code">$1</code>');
	result = result.replace(/\*\*([^*]+)\*\*/g, '<strong class="iflow-bold">$1</strong>');
	result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');

	// Pass 6: Unordered and ordered list items.
	result = result.replace(/^(\s*)[-*]\s+(.+)$/gm, (_match, spaces, text) => {
		const indent = spaces.length;
		return `<li class="iflow-li" style="margin-left: ${indent * 8}px">${text}</li>`;
	});
	result = result.replace(/^(\s*)(\d+)\.\s+(.+)$/gm, (_match, spaces, _num, text) => {
		const indent = spaces.length;
		return `<li class="iflow-li iflow-li-num" style="margin-left: ${indent * 8}px">${text}</li>`;
	});

	// Pass 7: Wrap consecutive list items in ul / ol containers.
	result = wrapListItems(result);

	// Pass 8: Emoji icons.
	result = result.replace(/✅/g, '<span class="iflow-icon iflow-icon-success">✅</span>');
	result = result.replace(/❌/g, '<span class="iflow-icon iflow-icon-error">❌</span>');
	result = result.replace(/🔄/g, '<span class="iflow-icon iflow-icon-loading">🔄</span>');
	result = result.replace(/◆/g, '<span class="iflow-icon iflow-icon-diamond">◆</span>');

	// Pass 9: File path highlights.
	result = result.replace(
		/([a-zA-Z0-9_\-/.]+\.(ts|js|tsx|jsx|py|md|json|yaml|yml|css|html))/g,
		'<span class="iflow-file-path">$1</span>',
	);

	// Pass 10: Keyboard shortcuts.
	result = result.replace(/`([A-Za-z]+\+[A-Za-z+]+)`/g, '<kbd class="iflow-kbd">$1</kbd>');

	// Pass 11: Newlines → br, strip br adjacent to block elements.
	result = result.replace(/\n/g, '<br>');
	result = result.replace(/<\/(h[234]|div|li|ul|ol|table)><br>/g, '</$1>');
	result = result.replace(/<br><(h[234]|div|li|ul|ol|table)/g, '<$1');

	// Pass 12: Restore code blocks, then strip adjacent br around pre.
	result = result.replace(/\x00CODE(\d+)\x00/g, (_m, i) => codeBlocks[parseInt(i, 10)]);
	result = result.replace(/<br><pre/g, '<pre');
	result = result.replace(/<\/pre><br>/g, '</pre>');

	return result;
}
