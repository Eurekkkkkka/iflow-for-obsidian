# CLAUDE.md - iFlow for Obsidian

## Project Overview

iFlow for Obsidian - An Obsidian plugin that embeds iFlow CLI as a sidebar chat interface. The vault directory becomes iFlow's working directory, giving it full agentic capabilities: file read/write, bash commands, and multi-step workflows.

## Commands

```bash
npm run dev        # Development (watch mode, auto-compile)
npm run build      # Production build
```

## Architecture

### File Structure

```
src/
├── main.ts                 # Plugin entry point, settings management
├── chatView.ts             # Chat view UI, core interaction logic ⭐ CORE
├── iflowService.ts         # iFlow CLI WebSocket communication (ACP protocol) ⭐ CORE
├── conversationStore.ts    # Conversation persistence (localStorage)
└── styles.css              # Plugin styles
```

### Key Components

| Component | Purpose | Key Details |
|-----------|---------|-------------|
| **IFlowPlugin** (main.ts) | Plugin lifecycle, settings | Manages ribbon icon, view registration, settings UI |
| **IFlowChatView** (chatView.ts) | Chat UI and message handling | Handles streaming, scrolling, conversation switching |
| **IFlowService** (iflowService.ts) | WebSocket communication | ACP protocol (JSON-RPC 2.0), manages connection |
| **ConversationStore** (conversationStore.ts) | Data persistence | localStorage, pub/sub pattern for updates |

## Critical Technical Details

### ACP Protocol (Agent Communication Protocol)

iFlow CLI uses JSON-RPC 2.0 over WebSocket:

```
1. WebSocket connect → ws://localhost:8080/acp
2. initialize → { protocolVersion: 1, clientCapabilities: {...} }
3. authenticate → { methodId: 'oauth-iflow' } (if needed)
4. session/new → { cwd, mcpServers: [], settings: {} }
5. session/prompt → { prompt: [{ type: 'text', text: '...' }] }
6. Receive session/update notifications (streaming chunks)
7. Final response has stopReason: 'end_turn' or 'max_turns'
```

**IMPORTANT:** The `onEnd` callback MUST be triggered when `stopReason` is detected:

```typescript
// In iflowService.ts sendMessage() - line ~450
if (result?.stopReason === 'end_turn' || result?.stopReason === 'max_turns') {
    this.messageHandlers.forEach(handler => handler({ type: 'end' }));
}
```

### Streaming State Management

The `isStreaming` flag is CRITICAL for preventing bugs:

```typescript
// In chatView.ts
private isStreaming = false;

private async sendMessage() {
    // Force reset if stuck (prevents "can't send second message" bug)
    if (this.isStreaming) {
        console.warn('[iFlow Chat] Force reset');
        this.isStreaming = false;
    }

    this.isStreaming = true;

    // Set timeout protection (60 seconds)
    this.streamingTimeout = setTimeout(() => {
        this.isStreaming = false; // Force reset if onEnd never called
    }, 60000);

    await this.iflowService.sendMessage({
        onChunk: (chunk) => {
            this.currentMessage += chunk;
            this.updateMessage(assistantMsgId, this.currentMessage);
            if (enableAutoScroll) this.scrollToBottom();
        },
        onEnd: () => {
            cleanup(); // Resets isStreaming, clears timeout
            // Save to conversation store
            this.conversationStore.addAssistantMessage(id, this.currentMessage);
        },
    });
}
```

### Conversation Change Handling

**CRITICAL:** Don't reload messages during streaming (causes messages to disappear):

```typescript
private onConversationChange(): void {
    // Skip reload during streaming
    if (this.isStreaming) {
        this.updateConversationUI(); // Only update metadata, not messages
        return;
    }
    // Normal reload...
}
```

### Auto-Scroll Implementation

Use `requestAnimationFrame` + `setTimeout` for reliable scrolling:

```typescript
private scrollToBottom(): void {
    requestAnimationFrame(() => {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    });
    setTimeout(() => {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }, 10);
}
```

## Data Flow

### Sending a Message

```
1. User types in textarea → presses Enter
2. chatView.sendMessage()
   - Check isStreaming (force reset if true)
   - Add user message to UI
   - Set isStreaming = true
   - Call iflowService.sendMessage()
3. iflowService.sendMessage()
   - Apply runtime settings (mode, model, think)
   - Register event handlers (onChunk, onEnd, onError)
   - Send JSON-RPC request: session/prompt
4. Receive streaming updates (session/update notifications)
   - Extract content from update
   - Trigger onChunk callback
   - chatView updates message UI
5. Receive final response with stopReason
   - Trigger 'end' event
   - onEnd callback saves message to store
   - Reset isStreaming = false
```

### Conversation Persistence

```
1. Add message → conversationStore.addUserMessage()
2. Update state + save to localStorage
3. Trigger notify()
4. All subscribers receive onConversationChange()
5. UI updates (unless streaming)
```

## Common Bugs & Fixes

### Bug #1: Messages lost after sending

**Symptom:** Messages disappear from conversation after sending

**Root Cause:** `onEnd` callback never called, `isStreaming` stuck at `true`

**Fix:** Ensure `stopReason` triggers 'end' event:
```typescript
// iflowService.ts line ~450
if (result?.stopReason === 'end_turn' || result?.stopReason === 'max_turns') {
    this.messageHandlers.forEach(handler => handler({ type: 'end' }));
}
```

### Bug #2: Can't send second message

**Symptom:** Send button becomes unresponsive

**Root Cause:** `isStreaming` not reset after first message

**Fix:** Add force reset at start of sendMessage():
```typescript
if (this.isStreaming) {
    this.isStreaming = false;
}
```

### Bug #3: Messages disappear during streaming

**Symptom:** UI messages vanish while streaming

**Root Cause:** `onConversationChange` clears container during streaming

**Fix:** Skip reload when `isStreaming === true`:
```typescript
if (this.isStreaming) return;
```

## Development Workflow

### Making Changes

1. Edit files in `src/`
2. `npm run dev` auto-compiles to `main.js`
3. Reload plugin in Obsidian (Cmd/Ctrl + R in developer console)
4. Test changes
5. Commit with conventional commit message

### Testing Streaming

Always test:
- ✅ First message sends successfully
- ✅ Second message sends successfully (no force reset)
- ✅ Messages persist after closing/reopening chat
- ✅ Auto-scroll works during streaming
- ✅ Conversation switching works

### Debugging

```typescript
// Key log points
console.log('[iFlow Chat] sendMessage called', { isStreaming, content });
console.log('[iFlow] Stream complete, stopReason:', result.stopReason);
console.log('[iFlow Chat] onEnd called');
```

Check browser console:
- `Ctrl/Cmd + Shift + I` → Console tab
- Filter: `iFlow`

## Storage

| Location | Contents |
|----------|----------|
| `localStorage` (key: 'iflow-conversations') | Conversation data (JSON) |
| `localStorage` (key: 'iflow-settings') | Plugin settings |

## Settings

```typescript
interface IFlowSettings {
    port: number;              // iFlow CLI port (default: 8080)
    timeout: number;           // Connection timeout (default: 5000ms)
    excludedTags: string[];    // Tags to exclude (default: ['private', 'sensitive'])
    enableAutoScroll: boolean; // Auto-scroll to bottom (default: true)
}
```

## Release Process

```bash
# 1. Update versions
vim manifest.json  # Update "version"
vim package.json   # Update "version"

# 2. Build
npm run build

# 3. Commit & push
git add -A
git commit -m "feat: your changes"
git push origin main

# 4. Create release
gh release create v0.x.x main.js manifest.json styles.css \
  --title "v0.x.x" \
  --notes "Release notes"

# 5. Users update via BRAT
```

## Reference Projects

- [Claudian](https://github.com/YishenTu/claudian) - Claude Code for Obsidian (inspiration)
- [Obsidian Sample Plugin](https://github.com/obsidianmd/obsidian-sample-plugin) - Basic plugin template

## Important Notes

- **Always check `isStreaming` state** before assuming message operations work
- **Never trigger full message reload during streaming** - causes UI flicker
- **Always call `onEnd` when stream completes** - otherwise messages won't save
- **Use requestAnimationFrame for DOM updates** - ensures rendering happens
- **Test second message send** - this is the most common failure mode
- **Check browser console logs** - they reveal state issues

## When Adding Features

1. **Check existing patterns first** - don't reinvent
2. **Consider streaming impact** - will it work during isStreaming?
3. **Test conversation switching** - does state transfer correctly?
4. **Verify persistence** - do changes save to localStorage?
5. **Add debug logs** - help future debugging
