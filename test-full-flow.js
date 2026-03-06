#!/usr/bin/env node

// Full ACP flow test - simulate Obsidian plugin behavior
const WebSocket = require('ws');

const PORT = 8090;
const URL = `ws://localhost:${PORT}/acp`;

let messageId = 0;
const pendingRequests = new Map();
let sessionId = null;

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

async function testFullFlow() {
	console.log(`🔗 Connecting to ${URL}...\n`);

	const ws = new WebSocket(URL);

	ws.on('error', (error) => {
		console.error('❌ WebSocket error:', error.message);
		process.exit(1);
	});

	let fullResponse = '';
	let messageCount = 0;

	ws.on('message', (data) => {
		const messageStr = data.toString().trim();

		// Skip debug messages
		if (!messageStr || messageStr.startsWith('//')) {
			return;
		}

		try {
			const message = JSON.parse(messageStr);

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
				if (message.method === 'session/update') {
					const update = message.params;

					// Check different update types
					if (update.sessionUpdate === 'agent_message_chunk' || update.sessionUpdate === 'agent_thought_chunk') {
						const content = update.content;
						if (content?.text) {
							fullResponse += content.text;
							messageCount++;
							process.stdout.write(content.text); // Stream output
						}
					}

					// Check for completion
					if (update.sessionUpdate === 'task_finish') {
						console.log('\n\n✅ Task completed!');
						console.log(`📊 Stats: ${messageCount} chunks, ${fullResponse.length} characters`);

						// Close after a short delay
						setTimeout(() => {
							ws.close();
						}, 500);
					}
				}
			}
		} catch (error) {
			console.error('❌ Parse error:', error.message);
		}
	});

	return new Promise((resolve, reject) => {
		ws.on('open', async () => {
			console.log('✅ Connected!\n');

			try {
				// Step 1: Initialize
				console.log('📋 Step 1: Initialize...');
				const initResult = await sendRequest(ws, 'initialize', {
					protocolVersion: 1,
					clientCapabilities: {
						fs: {
							readTextFile: true,
							writeTextFile: true
						}
					}
				});
				console.log(`   Authenticated: ${initResult.isAuthenticated}`);

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
				sessionId = sessionResult.sessionId;
				console.log(`   Session ID: ${sessionId}`);

				// Step 4: Send prompt
				console.log('\n💬 Step 4: Send prompt "hello, please introduce yourself briefly"...');
				console.log('\n--- Response Start ---\n');

				await sendRequest(ws, 'session/prompt', {
					sessionId: sessionId,
					prompt: [{ type: 'text', text: 'hello, please introduce yourself briefly in one sentence' }]
				});

				console.log('\n⏳ Waiting for response...\n');

			} catch (error) {
				console.error('\n❌ Error:', error.message);
				ws.close();
				reject(error);
			}
		});

		ws.on('close', () => {
			console.log('\n\n--- Response End ---');
			console.log('🔌 Connection closed');
			resolve();
		});
	});
}

testFullFlow().catch(error => {
	console.error('Test failed:', error);
	process.exit(1);
});
