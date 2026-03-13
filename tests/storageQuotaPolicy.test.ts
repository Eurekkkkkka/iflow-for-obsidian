import { describe, expect, it } from 'vitest';
import {
	calculateStorageQuotaInfo,
	cleanupOldConversations,
	MAX_STORAGE_BYTES,
} from '../src/domain/conversation/storageQuotaPolicy';

describe('storageQuotaPolicy', () => {
	it('calculates quota usage from data length', () => {
		const info = calculateStorageQuotaInfo('1234567890');
		expect(info.usedBytes).toBe(10);
		expect(info.totalBytes).toBe(MAX_STORAGE_BYTES);
		expect(info.percentUsed).toBeCloseTo(10 / MAX_STORAGE_BYTES);
	});

	it('marks warning and critical thresholds', () => {
		const warningData = 'a'.repeat(Math.ceil(MAX_STORAGE_BYTES * 0.81));
		const criticalData = 'a'.repeat(Math.ceil(MAX_STORAGE_BYTES * 0.96));
		expect(calculateStorageQuotaInfo(warningData).approachingLimit).toBe(true);
		expect(calculateStorageQuotaInfo(criticalData).atLimit).toBe(true);
	});

	it('cleans up old conversations while preserving newest order', () => {
		const conversations = Array.from({ length: 55 }, (_, i) => ({
			id: `c-${i}`,
			updatedAt: i,
		}));
		const result = cleanupOldConversations(conversations, 'c-0', 50);
		expect(result.conversations).toHaveLength(50);
		expect(result.removedCount).toBe(5);
		expect(result.currentConversationId).toBe('c-54');
	});
});
