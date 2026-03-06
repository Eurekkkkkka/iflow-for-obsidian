#!/usr/bin/env node

// Simple ACP protocol test
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

	return new Promise((resolve, reject) => {
		pendingRequests.set(id, { resolve, reject });
		ws.send(JSON.stringify(request));
	});
}

async function testAcp() {
	console.log(`🔗 Connecting to ${URL}...`);

	const ws = new WebSocket(URL);

	ws.on('error', (error) => {
		console.error('❌ WebSocket error:', error.message);
		process.exit(1);
	});

	ws.on('message', (data) => {
		try {
			const message = JSON.parse(data.toString());

			// Handle response
			if ('id' in message && message.id !== undefined) {
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
				console.log('\n📨 Notification:', message.method);
				if (message.method === 'session/update') {
					const update = message.params;
					if (update.content?.text) {
						console.log('   Content:', update.content.text);
					}
				}
			}
		} catch (error) {
			console.error('❌ Failed to parse message:', error);
		}
	});

	return new Promise((resolve, reject) => {
		ws.on('open', async () => {
			console.log('✅ Connected!');

			try {
				// Step 1: Initialize
				console.log('\n📋 Step 1: Initialize...');
				const initResult = await sendRequest(ws, 'initialize', {
					protocolVersion: 1,
					clientCapabilities: {
						fs: {
							readTextFile: true,
							writeTextFile: true
						}
					}
				});
				console.log('   Authenticated:', initResult.isAuthenticated);

				// Step 2: Authenticate if needed
				if (!initResult.isAuthenticated) {
					console.log('\n🔐 Step 2: Authenticate...');
					await sendRequest(ws, 'authenticate', { methodId: 'oauth-iflow' });
					console.log('   ✅ Authenticated!');
				}

				// Step 3: Create session
				console.log('\n🆕 Step 3: Create session...');
				const sessionResult = await sendRequest(ws, 'session/new', {
					cwd: '/',
					mcpServers: [],
					settings: {}
				});
				console.log('   Session ID:', sessionResult.sessionId);

				// Step 4: Send prompt
				console.log('\n💬 Step 4: Send prompt "hello"...');
				sendRequest(ws, 'session/prompt', {
					sessionId: sessionResult.sessionId,
					prompt: [{ type: 'text', text: 'hello' }]
				});

				console.log('⏳ Waiting for response...\n');

				// Close after 30 seconds
				setTimeout(() => {
					console.log('\n✅ Test completed!');
					ws.close();
					resolve();
				}, 30000);

			} catch (error) {
				console.error('\n❌ Error:', error.message);
				ws.close();
				reject(error);
			}
		});

		ws.on('close', () => {
			console.log('\n🔌 Connection closed');
		});
	});
}

testAcp().catch(error => {
	console.error('Test failed:', error);
	process.exit(1);
});
