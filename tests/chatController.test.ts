import { describe, expect, it, vi } from 'vitest';
import { ChatController } from '../src/features/chat/chatController';

describe('ChatController', () => {
	it('orchestrates send flow and forwards chunks/tools/end', async () => {
		const buildContext = vi.fn().mockResolvedValue({ filePath: 'a.md', fileContent: 'A', selection: 'S' });
		const compose = vi.fn().mockReturnValue('PROMPT');
		const sendMessage = vi.fn().mockImplementation(async (options) => {
			options.onChunk?.('hello');
			options.onTool?.({ id: 't1', name: 'x', input: {}, status: 'running' });
			options.onEnd?.();
		});

		const controller = new ChatController({ buildContext, compose, sendMessage });
		const onChunk = vi.fn();
		const onTool = vi.fn();
		const onEnd = vi.fn();
		await controller.send({ content: 'hi', onChunk, onTool, onEnd });

		expect(buildContext).toHaveBeenCalled();
		expect(compose).toHaveBeenCalled();
		expect(sendMessage).toHaveBeenCalled();
		expect(onChunk).toHaveBeenCalledWith('hello');
		expect(onTool).toHaveBeenCalled();
		expect(onEnd).toHaveBeenCalled();
	});
});
