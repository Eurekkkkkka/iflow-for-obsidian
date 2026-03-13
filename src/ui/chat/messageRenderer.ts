export function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

export function renderMessage(content: string): string {
	// First handle code blocks to avoid inner markdown replacement.
	let result = content.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
		const langClass = lang ? `language-${lang}` : '';
		return `<pre class="iflow-code-block ${langClass}"><code>${escapeHtml(code.trim())}</code></pre>`;
	});

	result = result.replace(/`([^`]+)`/g, '<code class="iflow-inline-code">$1</code>');
	result = result.replace(/\*\*([^*]+)\*\*/g, '<strong class="iflow-bold">$1</strong>');
	result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');
	result = result.replace(/^\*\s*(Thinking.+)$/gm, '<div class="iflow-thinking">$1</div>');

	result = result.replace(/^### (.+)$/gm, '<h4 class="iflow-h4">$1</h4>');
	result = result.replace(/^## (.+)$/gm, '<h3 class="iflow-h3">$1</h3>');
	result = result.replace(/^# (.+)$/gm, '<h2 class="iflow-h2">$1</h2>');

	result = result.replace(/^(\s*)[-*]\s+(.+)$/gm, (_match, spaces, text) => {
		const indent = spaces.length;
		return `<li class="iflow-li" style="margin-left: ${indent * 8}px">${text}</li>`;
	});

	result = result.replace(/^(\s*)(\d+)\.\s+(.+)$/gm, (_match, spaces, _num, text) => {
		const indent = spaces.length;
		return `<li class="iflow-li iflow-li-num" style="margin-left: ${indent * 8}px">${text}</li>`;
	});

	result = result.replace(/✅/g, '<span class="iflow-icon iflow-icon-success">✅</span>');
	result = result.replace(/❌/g, '<span class="iflow-icon iflow-icon-error">❌</span>');
	result = result.replace(/🔄/g, '<span class="iflow-icon iflow-icon-loading">🔄</span>');
	result = result.replace(/◆/g, '<span class="iflow-icon iflow-icon-diamond">◆</span>');

	result = result.replace(/([a-zA-Z0-9_\-/.]+\.(ts|js|tsx|jsx|py|md|json|yaml|yml|css|html))/g,
		'<span class="iflow-file-path">$1</span>');

	result = result.replace(/`([A-Za-z]+\+[A-Za-z+]+)`/g, '<kbd class="iflow-kbd">$1</kbd>');

	result = result.replace(/\n/g, '<br>');
	result = result.replace(/<\/(h[234]|pre|div|li)><br>/g, '</$1>');
	result = result.replace(/<br><(h[234]|pre|div|li)/g, '<$1');

	return result;
}
