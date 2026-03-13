import { describe, expect, it } from 'vitest';
import { mapSessionUpdateToEvents } from '../src/features/chat/toolCallMapper';

describe('toolCallMapper', () => {
	it('maps text chunk to stream event', () => {
		const events = mapSessionUpdateToEvents({
			sessionUpdate: 'agent_message_chunk',
			content: { type: 'text', text: 'hello' },
		});
		expect(events).toEqual([{ type: 'stream', content: 'hello' }]);
	});

	it('maps tool_use and tool_result', () => {
		const useEvents = mapSessionUpdateToEvents({
			content: { type: 'tool_use', id: 't1', name: 'fs/read_text_file', input: { path: 'a.md' } },
		});
		expect(useEvents[0].type).toBe('tool');

		const resultEvents = mapSessionUpdateToEvents({
			content: { type: 'tool_result', tool_use_id: 't1', tool_name: 'fs/read_text_file', result: 'ok' },
		});
		expect(resultEvents[0]).toMatchObject({ type: 'tool', data: { id: 't1', status: 'completed' } });
	});

	it('maps finish signal to end event', () => {
		const events = mapSessionUpdateToEvents({ sessionUpdate: 'task_finish' });
		expect(events).toContainEqual({ type: 'end' });
	});
});
