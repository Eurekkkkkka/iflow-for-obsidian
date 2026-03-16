import { describe, expect, it } from 'vitest';
import { buildDiagnosticsReport, type DiagnosticsInput } from '../src/ui/chat/diagnosticsReport';
import { MAX_STORAGE_BYTES } from '../src/domain/conversation/storageQuotaPolicy';

function makeInput(overrides: Partial<DiagnosticsInput> = {}): DiagnosticsInput {
	return {
		connectionState: 'connected',
		lastError: null,
		usedBytes: 1024,
		totalBytes: MAX_STORAGE_BYTES,
		port: 8090,
		...overrides,
	};
}

describe('buildDiagnosticsReport', () => {
	it('connected state produces OK status line', () => {
		const report = buildDiagnosticsReport(makeInput({ connectionState: 'connected' }));
		expect(report).toContain('已连接');
	});

	it('disconnected state produces error status line', () => {
		const report = buildDiagnosticsReport(makeInput({ connectionState: 'disconnected' }));
		expect(report).toContain('未连接');
	});

	it('detecting state produces checking status line', () => {
		const report = buildDiagnosticsReport(makeInput({ connectionState: 'detecting' }));
		expect(report).toContain('检测中');
	});

	it('reconnecting state produces reconnecting status line', () => {
		const report = buildDiagnosticsReport(makeInput({ connectionState: 'reconnecting' }));
		expect(report).toContain('重连中');
	});

	it('includes port number in report', () => {
		const report = buildDiagnosticsReport(makeInput({ port: 9999 }));
		expect(report).toContain('9999');
	});

	it('includes last error when present', () => {
		const report = buildDiagnosticsReport(makeInput({ lastError: 'connection refused' }));
		expect(report).toContain('connection refused');
	});

	it('omits error section when lastError is null', () => {
		const report = buildDiagnosticsReport(makeInput({ lastError: null }));
		expect(report).not.toContain('最近错误');
	});

	it('includes storage usage percentage', () => {
		const usedBytes = Math.floor(MAX_STORAGE_BYTES * 0.5);
		const report = buildDiagnosticsReport(makeInput({ usedBytes }));
		expect(report).toMatch(/50(\.\d+)?%/);
	});
});
