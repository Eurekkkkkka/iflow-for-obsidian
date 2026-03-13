import { JsonRpcProtocol } from './jsonRpcProtocol';

export class AcpClient {
	private ws: WebSocket | null = null;
	private protocol: JsonRpcProtocol | null = null;
	private sessionId: string | null = null;

	constructor(private port: number, private timeout: number) {}

	setConfig(port: number, timeout: number): void {
		this.port = port;
		this.timeout = timeout;
	}

	getProtocol(): JsonRpcProtocol | null {
		return this.protocol;
	}

	getSessionId(): string | null {
		return this.sessionId;
	}

	async checkConnection(): Promise<boolean> {
		return new Promise((resolve) => {
			const ws = new WebSocket(`ws://localhost:${this.port}/acp`);
			const timeoutId = setTimeout(() => {
				ws.close();
				resolve(false);
			}, this.timeout);
			ws.onopen = () => {
				clearTimeout(timeoutId);
				ws.close();
				resolve(true);
			};
			ws.onerror = () => {
				clearTimeout(timeoutId);
				resolve(false);
			};
		});
	}

	async connect(handlers?: {
		onMessage?: (data: string) => void;
		onClose?: () => void;
		onError?: (error: Event) => void;
	}): Promise<void> {
		if (this.ws && this.ws.readyState === WebSocket.OPEN && this.protocol) {
			return;
		}
		return new Promise((resolve, reject) => {
			this.ws = new WebSocket(`ws://localhost:${this.port}/acp`);
			const timeoutId = setTimeout(() => {
				this.ws?.close();
				reject(new Error('Connection timeout'));
			}, this.timeout);

			this.ws.onopen = () => {
				clearTimeout(timeoutId);
				this.protocol = new JsonRpcProtocol((message) => {
					if (this.ws && this.ws.readyState === WebSocket.OPEN) {
						this.ws.send(message);
					}
				});
				resolve();
			};

			this.ws.onmessage = (event: MessageEvent) => {
				handlers?.onMessage?.(event.data);
			};

			this.ws.onerror = (error: Event) => {
				clearTimeout(timeoutId);
				handlers?.onError?.(error);
				reject(new Error('WebSocket connection failed'));
			};

			this.ws.onclose = () => {
				this.protocol?.clearPendingRequests();
				this.sessionId = null;
				handlers?.onClose?.();
			};
		});
	}

	setSessionId(sessionId: string): void {
		this.sessionId = sessionId;
	}

	sendRaw(message: string): void {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			throw new Error('WebSocket is not connected');
		}
		this.ws.send(message);
	}

	dispose(): void {
		this.protocol?.clearPendingRequests();
		this.ws?.close();
	}
}
