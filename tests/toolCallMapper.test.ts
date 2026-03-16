import { describe, expect, it } from 'vitest';
import { mapSessionUpdateToEvents } from '../src/features/chat/toolCallMapper';

describe('toolCallMapper', () => {
	// ── existing passing tests ─────────────────────────────────────────────

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

	// ── Phase 4.2: thought stream separation ──────────────────────────────

	it('agent_thought_chunk maps to thought event, NOT stream', () => {
		const events = mapSessionUpdateToEvents({
			sessionUpdate: 'agent_thought_chunk',
			content: { type: 'text', text: 'thinking deeply' },
		});
		expect(events).toHaveLength(1);
		expect(events[0].type).toBe('thought');
		expect(events[0].content).toBe('thinking deeply');
	});

	it('agent_message_chunk still maps to stream event', () => {
		const events = mapSessionUpdateToEvents({
			sessionUpdate: 'agent_message_chunk',
			content: { type: 'text', text: 'final answer' },
		});
		expect(events[0].type).toBe('stream');
	});

	it('thought and stream events never carry the same type', () => {
		const thoughtEvents = mapSessionUpdateToEvents({
			sessionUpdate: 'agent_thought_chunk',
			content: { type: 'text', text: 'x' },
		});
		const streamEvents = mapSessionUpdateToEvents({
			sessionUpdate: 'agent_message_chunk',
			content: { type: 'text', text: 'x' },
		});
		expect(thoughtEvents[0].type).not.toBe(streamEvents[0].type);
	});

	it('agent_turn_end emits only end event, no stream', () => {
		const events = mapSessionUpdateToEvents({ sessionUpdate: 'agent_turn_end' });
		expect(events.some(e => e.type === 'stream')).toBe(false);
		expect(events.some(e => e.type === 'thought')).toBe(false);
		expect(events.some(e => e.type === 'end')).toBe(true);
	});

	it('tool_result error status maps correctly', () => {
		const events = mapSessionUpdateToEvents({
			content: {
				type: 'tool_result',
				tool_use_id: 't2',
				tool_name: 'fs/write_text_file',
				error: 'permission denied',
			},
		});
		expect(events[0]).toMatchObject({ type: 'tool', data: { status: 'error', error: 'permission denied' } });
	});

	// ── Phase 9.2: thought stream edge cases ──────────────────────────────────

	it('agent_thought_chunk with empty text emits no events', () => {
		const events = mapSessionUpdateToEvents({
			sessionUpdate: 'agent_thought_chunk',
			content: { type: 'text', text: '' },
		});
		expect(events).toHaveLength(0);
	});

	it('agent_thought_chunk with null content emits no events and does not throw', () => {
		expect(() => {
			const events = mapSessionUpdateToEvents({
				sessionUpdate: 'agent_thought_chunk',
				content: null,
			});
			expect(events).toHaveLength(0);
		}).not.toThrow();
	});

	it('agent_thought_chunk with non-text content type emits no events', () => {
		const events = mapSessionUpdateToEvents({
			sessionUpdate: 'agent_thought_chunk',
			content: { type: 'tool_use', name: 'some_tool', id: 'x', input: {} },
		});
		expect(events).toHaveLength(0);
	});

	it('interleaved thought and stream chunks each route to correct event type', () => {
		const thought1 = mapSessionUpdateToEvents({ sessionUpdate: 'agent_thought_chunk', content: { type: 'text', text: '思考一' } });
		const stream1 = mapSessionUpdateToEvents({ sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: '回答一' } });
		const thought2 = mapSessionUpdateToEvents({ sessionUpdate: 'agent_thought_chunk', content: { type: 'text', text: '思考二' } });
		const stream2 = mapSessionUpdateToEvents({ sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: '回答二' } });

		expect(thought1[0].type).toBe('thought');
		expect(stream1[0].type).toBe('stream');
		expect(thought2[0].type).toBe('thought');
		expect(stream2[0].type).toBe('stream');
	});
});
