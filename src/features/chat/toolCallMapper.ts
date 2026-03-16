import type { IFlowMessage, IFlowToolCall } from '../../iflowService';

/** Extract plain text from a text-typed content object. */
function extractText(content: any): string | null {
	if (!content || typeof content !== 'object') return null;
	if (content.type === 'text' && typeof content.text === 'string') return content.text;
	if (typeof content.text === 'string') return content.text;
	return null;
}

export function extractTextFromUpdate(update: any): string | null {
	if (update.sessionUpdate === 'agent_message_chunk') {
		return extractText(update.content);
	}

	if (typeof update === 'string') return update;
	if (update.content?.type === 'text') return update.content.text || '';
	if (update.content?.text) return update.content.text;
	if (update.text) return update.text;
	if (update.delta?.text) return update.delta.text;
	if (update.message?.content) return update.message.content;
	return null;
}

export function mapSessionUpdateToEvents(update: any): IFlowMessage[] {
	const events: IFlowMessage[] = [];
	if (!update || typeof update !== 'object') {
		return events;
	}

	// ── Phase 4.2: thought chunk maps to 'thought', NOT 'stream' ──────────
	if (update.sessionUpdate === 'agent_thought_chunk') {
		const text = extractText(update.content);
		if (text) {
			events.push({ type: 'thought', content: text });
		}
		return events; // thought events never trigger end — return early
	}

	const content = update.content;
	if (content && typeof content === 'object') {
		if (content.type === 'tool_use') {
			events.push({
				type: 'tool',
				data: {
					id: content.id || content.tool_use_id || Date.now().toString(),
					name: content.name,
					input: content.input || content.arguments,
					status: 'running',
				} as IFlowToolCall,
			});
		} else if (content.type === 'tool_result') {
			events.push({
				type: 'tool',
				data: {
					id: content.tool_use_id || content.id,
					name: content.tool_name || 'unknown',
					input: {},
					status: content.error ? 'error' : 'completed',
					result: content.result || content.content,
					error: content.error,
				} as IFlowToolCall,
			});
		} else {
			const textContent = extractTextFromUpdate(update);
			if (textContent) {
				events.push({ type: 'stream', content: textContent });
			}
		}
	} else {
		const textContent = extractTextFromUpdate(update);
		if (textContent) {
			events.push({ type: 'stream', content: textContent });
		}
	}

	if (
		update.sessionUpdate === 'task_finish' ||
		update.status === 'done' ||
		update.done ||
		update.sessionUpdate === 'agent_turn_end'
	) {
		events.push({ type: 'end' });
	}

	return events;
}
