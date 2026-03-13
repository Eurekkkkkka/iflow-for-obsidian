import { describe, expect, it, beforeEach } from 'vitest';
import { InMemoryConversationRepository } from '../src/domain/conversation/conversationRepository';
import { LocalStorageConversationRepository } from '../src/domain/conversation/conversationRepository';
import { ConversationService } from '../src/domain/conversation/conversationService';
import { exportConversationsToMarkdown } from '../src/domain/conversation/conversationExportService';

describe('conversation domain', () => {
	it('creates and switches conversation', () => {
		const repo = new InMemoryConversationRepository();
		const service = new ConversationService(repo);
		const created = service.newConversation();
		expect(service.getCurrentConversation()?.id).toBe(created.id);
		service.newConversation();
		service.switchConversation(created.id);
		expect(service.getCurrentConversation()?.id).toBe(created.id);
	});

	it('appends messages and exports markdown', () => {
		const repo = new InMemoryConversationRepository();
		const service = new ConversationService(repo);
		const conv = service.newConversation();
		service.appendUserMessage(conv.id, 'hello world');
		service.appendAssistantMessage(conv.id, 'ok');
		const md = exportConversationsToMarkdown([service.getCurrentConversation()!]);
		expect(md).toContain('hello world');
		expect(md).toContain('ok');
	});

	it('deletes conversation', () => {
		const repo = new InMemoryConversationRepository();
		const service = new ConversationService(repo);
		const c1 = service.newConversation();
		const c2 = service.newConversation();
		service.deleteConversation(c2.id);
		expect(service.getState().conversations).toHaveLength(1);
		expect(service.getState().conversations[0].id).toBe(c1.id);
	});

	it('updates conversation settings', () => {
		const repo = new InMemoryConversationRepository();
		const service = new ConversationService(repo);
		const conv = service.newConversation();
		service.updateConversationSettings(conv.id, { mode: 'yolo', model: 'glm-5' });
		const updated = service.getCurrentConversation()!;
		expect(updated.mode).toBe('yolo');
		expect(updated.model).toBe('glm-5');
	});

	it('getConversationMessages returns messages for given id', () => {
		const repo = new InMemoryConversationRepository();
		const service = new ConversationService(repo);
		const conv = service.newConversation();
		service.appendUserMessage(conv.id, 'test');
		expect(service.getConversationMessages(conv.id)).toHaveLength(1);
		expect(service.getConversationMessages('nonexistent')).toHaveLength(0);
	});

	describe('LocalStorageConversationRepository', () => {
		let storage: Map<string, string>;

		beforeEach(() => {
			storage = new Map();
		});

		function createRepo(vaultPath = '/test/vault') {
			return new LocalStorageConversationRepository(vaultPath, {
				getItem: (key: string) => storage.get(key) ?? null,
				setItem: (key: string, value: string) => { storage.set(key, value); },
			});
		}

		it('persists state across instances', () => {
			const repo1 = createRepo();
			repo1.setState({
				currentConversationId: 'c1',
				conversations: [{ id: 'c1', title: 'Test', messages: [], mode: 'default', think: false, model: 'glm-4.7', createdAt: 1, updatedAt: 1 }],
			});

			// Create new instance pointing to same storage
			const repo2 = createRepo();
			expect(repo2.getState().currentConversationId).toBe('c1');
			expect(repo2.getState().conversations).toHaveLength(1);
		});

		it('isolates by vault path', () => {
			const repo1 = createRepo('/vault/a');
			repo1.setState({
				currentConversationId: 'c1',
				conversations: [{ id: 'c1', title: 'A', messages: [], mode: 'default', think: false, model: 'glm-4.7', createdAt: 1, updatedAt: 1 }],
			});

			const repo2 = createRepo('/vault/b');
			expect(repo2.getState().conversations).toHaveLength(0);
		});
	});
});
