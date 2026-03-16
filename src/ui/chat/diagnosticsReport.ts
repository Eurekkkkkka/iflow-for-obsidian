import { MAX_STORAGE_BYTES } from '../../domain/conversation/storageQuotaPolicy';

export type ConnectionState = 'connected' | 'disconnected' | 'detecting' | 'reconnecting';

export interface DiagnosticsInput {
	connectionState: ConnectionState;
	lastError: string | null;
	usedBytes: number;
	totalBytes: number;
	port: number;
}

const STATE_LABEL: Record<ConnectionState, string> = {
	connected:    '已连接',
	disconnected: '未连接',
	detecting:    '检测中',
	reconnecting: '重连中',
};

export function buildDiagnosticsReport(input: DiagnosticsInput): string {
	const { connectionState, lastError, usedBytes, totalBytes, port } = input;
	const pct = ((usedBytes / totalBytes) * 100).toFixed(1);
	const state = STATE_LABEL[connectionState];

	const lines: string[] = [
		`连接状态：${state}`,
		`服务端口：${port}`,
		`存储占用：${pct}%（${formatBytes(usedBytes)} / ${formatBytes(totalBytes)}）`,
	];

	if (lastError !== null) {
		lines.push(`最近错误：${lastError}`);
	}

	return lines.join('\n');
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
