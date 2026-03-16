export interface JsonRpcRequest {
	jsonrpc: '2.0';
	id: number | string;
	method: string;
	params?: unknown;
}

export interface JsonRpcResponse {
	jsonrpc: '2.0';
	id: number | string;
	result?: unknown;
	error?: {
		code: number;
		message: string;
		data?: unknown;
	};
}

export interface JsonRpcNotification {
	jsonrpc: '2.0';
	method: string;
	params?: unknown;
}

type ServerMethodHandler = (id: number, params: any) => Promise<any>;

export class JsonRpcProtocol {
	private messageId = 0;
	private readonly pendingRequests = new Map<number | string, {
		resolve: (value: any) => void;
		reject: (error: Error) => void;
	}>();
	private readonly serverMethodHandlers = new Map<string, ServerMethodHandler>();

	constructor(private readonly send: (message: string) => void) {}

	sendRequest(method: string, params?: any): Promise<any> {
		const id = this.messageId++;
		const request: JsonRpcRequest = {
			jsonrpc: '2.0',
			id,
			method,
			...(params !== undefined ? { params } : {}),
		};

		return new Promise((resolve, reject) => {
			this.pendingRequests.set(id, { resolve, reject });
			try {
				this.send(JSON.stringify(request));
			} catch (error) {
				this.pendingRequests.delete(id);
				reject(error as Error);
			}
		});
	}

	onServerMethod(method: string, handler: ServerMethodHandler): void {
		this.serverMethodHandlers.set(method, handler);
	}

	handleMessage(data: string): JsonRpcResponse | JsonRpcNotification | null {
		const trimmed = data.trim();
		if (!trimmed || trimmed.startsWith('//')) {
			return null;
		}

		try {
			const message = JSON.parse(trimmed) as any;
			const id = message.id as number | undefined;
			const method = message.method as string | undefined;

			if (id !== undefined && !method) {
				const pending = this.pendingRequests.get(id);
				if (pending) {
					this.pendingRequests.delete(id);
					if (message.error) {
						pending.reject(new Error(message.error.message));
					} else {
						pending.resolve(message.result);
					}
				}
				return message;
			}

			if (id !== undefined && method) {
				const handler = this.serverMethodHandlers.get(method);
				if (!handler) {
					console.warn(`[iFlow] Unhandled server method: ${method}`, message.params);
					this.sendError(id, -32601, `Method not found: ${method}`);
					return message;
				}

				handler(id, message.params)
					.then((result) => this.sendResult(id, result))
					.catch((error: Error) => this.sendError(id, -32603, error.message));
				return message;
			}

			if (method && id === undefined) {
				return message as JsonRpcNotification;
			}

			return null;
		} catch (_error) {
			return null;
		}
	}

	clearPendingRequests(reason: string = 'Connection closed'): void {
		for (const pending of this.pendingRequests.values()) {
			pending.reject(new Error(reason));
		}
		this.pendingRequests.clear();
	}

	private sendResult(id: number, result: unknown): void {
		const response: JsonRpcResponse = { jsonrpc: '2.0', id, result };
		this.send(JSON.stringify(response));
	}

	private sendError(id: number, code: number, message: string): void {
		const response: JsonRpcResponse = { jsonrpc: '2.0', id, error: { code, message } };
		this.send(JSON.stringify(response));
	}
}
