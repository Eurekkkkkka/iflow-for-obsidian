import { describe, expect, it, vi } from 'vitest';
import { JsonRpcProtocol } from '../src/infra/acp/jsonRpcProtocol';

describe('JsonRpcProtocol', () => {
	it('sends request and resolves response', async () => {
		const sent: string[] = [];
		const protocol = new JsonRpcProtocol((msg) => sent.push(msg));

		const pending = protocol.sendRequest('ping', { a: 1 });
		const req = JSON.parse(sent[0]);
		expect(req.method).toBe('ping');

		protocol.handleMessage(JSON.stringify({ jsonrpc: '2.0', id: req.id, result: { ok: true } }));
		await expect(pending).resolves.toEqual({ ok: true });
	});

	it('dispatches server request and returns result', async () => {
		const sent: string[] = [];
		const protocol = new JsonRpcProtocol((msg) => sent.push(msg));
		protocol.onServerMethod('sum', async (_id, params) => params.a + params.b);

		protocol.handleMessage(JSON.stringify({ jsonrpc: '2.0', id: 9, method: 'sum', params: { a: 2, b: 3 } }));
		await Promise.resolve();
		const response = JSON.parse(sent[0]);
		expect(response.id).toBe(9);
		expect(response.result).toBe(5);
	});

	it('rejects pending requests on clear', async () => {
		const protocol = new JsonRpcProtocol(() => undefined);
		const pending = protocol.sendRequest('never');
		protocol.clearPendingRequests('closed');
		await expect(pending).rejects.toThrow('closed');
	});
});
