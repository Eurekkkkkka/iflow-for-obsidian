#!/usr/bin/env node

// WebSocket message monitor - shows all iFlow ACP communication
const WebSocket = require('ws');

const PORT = 8090;
const URL = `ws://localhost:${PORT}/acp`;

let messageId = 0;
const pendingRequests = new Map();

function sendRequest(ws, method, params = {}) {
	const id = messageId++;
	const request = {
		jsonrpc: '2.0',
		id,
		method,
		...(Object.keys(params).length > 0 ? { params } : {})
	};

	console.log(`\n📤 >>> SEND:`, JSON.stringify(request, null, 2));

	return new Promise((resolve, reject) => {
		pendingRequests.set(id, { resolve, reject });
		ws.send(JSON.stringify(request));
	});
}

async function monitorAcp() {
	console.log(`🔗 Monitoring ${URL}...`);
	console.log(`Press Ctrl+C to stop\n`);

	const ws = new WebSocket(URL);

	ws.on('error', (error) => {
		console.error('❌ WebSocket error:', error.message);
	});

	ws.on('message', (data) => {
		const messageStr = data.toString().trim();

		// Show all messages including debug ones
		if (messageStr.startsWith('//')) {
			console.log(`\n🔵 DEBUG: ${messageStr}`);
			return;
		}

		if (!messageStr) return;

		try {
			const message = JSON.parse(messageStr);

			// Handle response
			if ('id' in message && message.id !== undefined) {
				console.log(`\n📩 <<< RESPONSE (id=${message.id}):`);
				console.log(JSON.stringify(message, null, 2));

				const pending = pendingRequests.get(message.id);
				if (pending) {
					pendingRequests.delete(message.id);
					if (message.error) {
						pending.reject(new Error(message.error.message));
					} else {
						pending.resolve(message.result);
					}
				}
			}

			// Handle notification
			if (!('id' in message)) {
				console.log(`\n📨 <<< NOTIFICATION:`, message.method);
				console.log(JSON.stringify(message, null, 2));
			}
		} catch (error) {
			console.log(`\n❓ <<< UNKNOWN: ${messageStr.substring(0, 200)}`);
		}
	});

	ws.on('open', async () => {
		console.log('✅ Connected! Starting ACP handshake...\n');

		try {
			// Initialize
			const initResult = await sendRequest(ws, 'initialize', {
				protocolVersion: 1,
				clientCapabilities: {
					fs: {
						readTextFile: true,
						writeTextFile: true
					}
				}
			});
			console.log('\n✅ Initialize result:', JSON.stringify(initResult, null, 2));

			// Authenticate if needed
			if (!initResult.isAuthenticated) {
				await sendRequest(ws, 'authenticate', { methodId: 'oauth-iflow' });
				console.log('\n✅ Authenticated!');
			}

			// Create session
			const sessionResult = await sendRequest(ws, 'session/new', {
				cwd: '/',
				mcpServers: [],
				settings: {}
			});
			console.log('\n✅ Session created:', sessionResult.sessionId);

			console.log('\n⏸️  Monitoring mode: Waiting for messages...');
			console.log('Now you can use the Obsidian plugin and see all messages here\n');

		} catch (error) {
			console.error('\n❌ Error:', error.message);
		}
	});

	ws.on('close', () => {
		console.log('\n🔌 Connection closed');
		process.exit(0);
	});

	// Keep alive
	setInterval(() => {
		if (ws.readyState === WebSocket.OPEN) {
			// Send a ping to keep connection alive
			ws.ping();
		}
	}, 30000);
}

monitorAcp().catch(error => {
	console.error('Monitor failed:', error);
	process.exit(1);
});
