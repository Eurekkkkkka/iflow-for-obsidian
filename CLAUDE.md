# CLAUDE.md - iFlow for Obsidian


## Project Overview

iFlow for Obsidian - An Obsidian plugin that embeds iFlow CLI as a sidebar chat interface. The vault directory becomes iFlow's working directory, giving it full agentic capabilities: file read/write, bash commands, and multi-step workflows.

## Commands

```bash
npm run dev        # Development (watch mode, auto-compile)
npm run build      # Production build
npm run version    # Bump version and update files
```

## Architecture

### File Structure

```
src/
├── main.ts                 # Plugin entry point, settings management
├── chatView.ts             # Chat view UI, core interaction logic ⭐ CORE
├── iflowService.ts         # iFlow CLI WebSocket communication (ACP protocol) ⭐ CORE
├── conversationStore.ts    # Conversation persistence with vault isolation ⭐ CORE
└── styles.css              # Plugin styles
```

### Key Components

| Component | Purpose | Key Details |
|-----------|---------|-------------|
| **IFlowPlugin** (main.ts) | Plugin lifecycle, settings | Manages ribbon icon, view registration, settings UI |
| **IFlowChatView** (chatView.ts) | Chat UI and message handling | Handles streaming, scrolling, conversation switching, export/import |
| **IFlowService** (iflowService.ts) | WebSocket communication | ACP protocol (JSON-RPC 2.0), manages connection |
| **ConversationStore** (conversationStore.ts) | Data persistence | Vault-isolated localStorage, pub/sub, export/import |

## Critical Technical Details

### ACP Protocol (Agent Communication Protocol)

iFlow CLI uses JSON-RPC 2.0 over WebSocket:

```
1. WebSocket connect → ws://localhost:8080/acp
2. initialize → { protocolVersion: 1, clientCapabilities: {...} }
3. authenticate → { methodId: 'oauth-iflow' } (if needed)
4. session/new → { cwd, mcpServers: [], settings: { permission_mode: 'default', append_system_prompt: '', add_dirs: [cwd] } }
5. session/prompt → { prompt: [{ type: 'text', text: '...' }] }
6. Receive session/update notifications (streaming chunks)
7. Final response has stopReason: 'end_turn' or 'max_turns'
```

**CRITICAL (v0.7.1+)**: Session settings MUST include `permission_mode` for tools to work:
```typescript
// iflowService.ts lines 355-366
const sessionSettings: Record<string, unknown> = {
    permission_mode: 'default',  // REQUIRED for tool calling to work!
    append_system_prompt: `IMPORTANT: When generating structured content like learning roadmaps, diagrams, knowledge graphs, or similar content:
1. Use the fs/write_text_file tool to create a file automatically
2. For visual roadmaps and diagrams, create an Obsidian Canvas file (.canvas extension)
3. Do NOT output large JSON structures as text - create files instead
4. Use descriptive filenames based on the content (e.g., "golang-learning-roadmap.canvas")
5. After creating the file, provide a brief summary of what was created`,
    add_dirs: [cwd],              // Allow access to vault directory
};
```

**v0.7.2 System Prompt**: The `append_system_prompt` instructs the AI model to:
- Use `fs/write_text_file` tool when generating structured content
- Create Canvas files (.canvas) for visual roadmaps and diagrams
- Avoid outputting large JSON as text (causes user confusion)
- Use descriptive filenames
- Provide summary after file creation

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

### Conversation Panel State Management

The conversation panel uses explicit state management (not hover-based):

```typescript
// State
private showConversationPanel = false;

// Methods
toggleConversationPanel(): void {
    this.showConversationPanel = !this.showConversationPanel;
    this.updateConversationPanelVisibility();
}

closeConversationPanel(): void {
    this.showConversationPanel = false;
    this.updateConversationPanelVisibility();
}

updateConversationPanelVisibility(): void {
    // Toggle .hidden class and aria-expanded
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

### Layout Structure (Flexbox)

The chat interface uses a strict flexbox hierarchy to ensure proper scrolling:

```css
/* Root container - controls overflow */
.iflow-chat-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;  /* Prevent container scroll */
}

/* Chat view - flexible child */
.iflow-chat {
    display: flex;
    flex-direction: column;
    height: 100%;
    flex: 1;
    min-height: 0;  /* Critical for flex child */
}

/* Messages - scrollable area */
.iflow-messages {
    flex: 1 1 auto;  /* Grow to fill space */
    overflow-y: auto;  /* Only messages scroll */
    min-height: 0;  /* Allows shrinking */
}

/* Input - fixed at bottom */
.iflow-input-container {
    flex: 0 0 auto;  /* Don't grow or shrink */
    max-height: 50vh;
    overflow-y: auto;  /* Internal scroll if needed */
}
```

**Key principles:**
- Container: `overflow: hidden` prevents double scrollbars
- Messages: `flex: 1 1 auto` + `overflow-y: auto` creates independent scroll
- Input: `flex: 0 0 auto` keeps it fixed at bottom
- Always add `min-height: 0` to flexible children

### Dropdown Panel Positioning

The conversation panel uses absolute positioning to appear below the trigger button:

```css
/* Parent container - MUST have position: relative */
.iflow-conversation-selector {
    position: relative;  /* Creates positioning context */
}

/* Trigger button */
.iflow-conversation-trigger {
    /* Regular button styles */
}

/* Panel - positioned relative to parent */
.iflow-conversation-panel {
    position: absolute;  /* Position relative to .iflow-conversation-selector */
    top: 100%;          /* Immediately below parent */
    left: 0;            /* Align left edge */
    width: auto;        /* Adapt to content */
    min-width: 300px;   /* Minimum width */
    max-width: 400px;   /* Maximum width */
    z-index: 1000;      /* Above other content */
}

/* Hidden state */
.iflow-conversation-panel.hidden {
    display: none;
}
```

**Critical points:**
- Parent MUST have `position: relative` for absolute child positioning
- `top: 100%` places panel immediately below parent
- Use `width: auto` with min/max constraints for responsive sizing
- Always initialize panel with `hidden` class to prevent flash on load
- Toggle `hidden` class and `aria-expanded` attribute for accessibility

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
2. Update state + save to localStorage (vault-isolated)
3. Trigger notify()
4. All subscribers receive onConversationChange()
5. UI updates (unless streaming)
```

### Vault-Isolated Storage

```
1. Get vault path: plugin.getVaultPath()
2. Hash path to create unique storage key
3. Each vault has isolated conversation data
4. Storage key format: iflow-conversations-{hash}
```

## Conversation Store API

### Core Methods

```typescript
// Conversation management
newConversation(model, mode, think): Conversation
switchConversation(id): void
deleteConversation(id): void
getCurrentConversation(): Conversation | null

// Message operations
addUserMessage(id, content): Message
addAssistantMessage(id, content): Message
updateAssistantMessage(convId, msgId, content): void

// State
getState(): ConversationState
subscribe(callback): () => void
```

### Export/Import API

```typescript
// Export to JSON (complete data backup)
const json = store.exportToJSON();
// Returns: JSON string with all conversations

// Export to Markdown (human-readable)
const md = store.exportToMarkdown(conversationId);
// Returns: Markdown formatted conversation(s)

// Import from JSON (merge strategy)
const result = store.importFromJSON(jsonString);
// Returns: { success, message, imported }
```

### Storage Quota API

```typescript
const quota = store.getStorageQuota();
// Returns:
{
    usedBytes: number;        // Current usage
    totalBytes: number;       // Max allowed (4MB)
    percentUsed: number;      // 0-1
    approachingLimit: boolean; // > 80%
    atLimit: boolean;         // > 95%
}
```

### Statistics API

```typescript
const stats = store.getStats();
// Returns:
{
    totalConversations: number;
    totalMessages: number;
    oldestConversation?: Date;
    newestConversation?: Date;
}
```

### Data Management

```typescript
// Clear all conversations
store.clearAll(): void

// Auto-cleanup happens when:
// - Storage exceeds 4MB limit
// - Keeps most recent 50 conversations
// - Sorted by updatedAt timestamp
```

## Data Structures

### Conversation

```typescript
interface Conversation {
    id: string;
    title: string;
    messages: Message[];
    mode: ConversationMode;  // "default" | "yolo" | "plan" | "smart"
    think: boolean;
    model: ModelType;
    createdAt: number;
    updatedAt: number;
}
```

### Message

```typescript
interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: number;
}
```

### Persisted State

```typescript
interface PersistedState extends ConversationState {
    version: number;         // For data migration
    createdAt: number;
    updatedAt: number;
}
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

### Bug #4: Conversation panel doesn't toggle

**Symptom:** Clicking conversation title doesn't show/hide panel

**Root Cause:** Missing click handler and state management

**Fix:** Add explicit toggle with state:
```typescript
trigger.onclick = (e) => {
    e.stopPropagation();
    this.toggleConversationPanel();
};
```

### Bug #5: Panel visible by default

**Symptom:** Panel shows permanently on page load

**Root Cause:** Panel created without `hidden` class

**Fix:** Add `hidden` class on panel creation:
```typescript
const panel = selector.createDiv({ cls: 'iflow-conversation-panel hidden' });
```

### Bug #6: Panel positioned at page bottom

**Symptom:** Panel appears at bottom of page instead of below trigger button

**Root Cause:** Missing `position: relative` on parent container `.iflow-conversation-selector`

**Fix:** Add CSS positioning:
```css
.iflow-conversation-selector {
    position: relative;  /* Critical for absolute child positioning */
}

.iflow-conversation-panel {
    position: absolute;
    top: 100%;
    left: 0;
    width: auto;
    min-width: 300px;
    max-width: 400px;
}
```

### Bug #7: Input container not fixed at bottom

**Symptom:** Input area scrolls with messages instead of staying fixed

**Root Cause:** Incorrect flexbox properties on input container

**Fix:** Set proper flex properties:
```css
.iflow-input-container {
    flex: 0 0 auto;  /* Don't grow or shrink */
    max-height: 50vh;
    overflow-y: auto;
}
```

### Bug #8: AI doesn't call tools (v0.7.1)

**Symptom:** AI outputs text description instead of calling `fs/write_text_file` tool

**Root Cause:** Missing `permission_mode` in session settings

**Discovery Process:**
1. Logs showed `tool_call` messages arriving but no tool execution
2. Compared with VSCode plugin (`iflow-for-vscode`)
3. Found VSCode uses `permission_mode: 'default'` in session settings

**Fix:** Add `permission_mode` to session settings:
```typescript
// iflowService.ts lines 355-361
const sessionSettings: Record<string, unknown> = {
    permission_mode: 'default',  // REQUIRED for tools to work!
    append_system_prompt: '',
    add_dirs: [cwd],
};
```

**Impact:** This is the MOST CRITICAL setting for tool calling to work. Without it:
- AI won't use file system tools
- Canvas files won't be created
- All file operations will fail silently

### Bug #9: Path handling TypeError (v0.7.1)

**Symptom:** `TypeError: The "path" argument must be of type string. Received undefined`

**Root Cause:** `getAbsolutePath()` removes leading slash BEFORE checking for vault path

**Example:**
- Input: `/Users/jie/Documents/Obsidian Vault/file.canvas`
- After removing `/`: `Users/jie/Documents/Obsidian Vault/file.canvas`
- Vault path: `/Users/jie/Documents/Obsidian Vault`
- Check fails because strings don't match!

**Fix:** Check for vault path FIRST, then remove leading slash:
```typescript
// iflowService.ts lines 496-517
private getAbsolutePath(filePath: string, vaultPath: string): string {
    // Check for full path FIRST (before removing slash)
    if (filePath.startsWith(vaultPath + '/')) {
        return filePath.substring(vaultPath.length + 1);
    }

    // Then handle leading slash
    if (filePath.startsWith('/')) {
        filePath = filePath.substring(1);
    }

    // Finally, check for vault path without leading slash
    if (filePath.startsWith(vaultPath)) {
        filePath = filePath.substring(vaultPath.length);
        if (filePath.startsWith('/')) {
            filePath = filePath.substring(1);
        }
    }

    return filePath;
}
```

**Result:** `/Users/.../vault/file.canvas` → `file.canvas` (correct!)

### Bug #10: AI outputs JSON as text instead of creating files (v0.7.2)

**Symptom:** When asking AI to generate learning roadmaps or diagrams, it outputs complete JSON Canvas structure as text in chat instead of calling `fs/write_text_file` to create a file.

**Example User Experience:**
- User: "生成一个golang 的学习路线图" (Generate a Golang learning roadmap)
- Expected: AI creates `golang-learning-roadmap.canvas` file
- Actual: AI outputs hundreds of lines of JSON text in chat

**Root Cause:** AI model doesn't have explicit instructions to use file tools for structured content. It defaults to outputting text.

**Discovery Process:**
1. User reported issue persists after v0.7.1 tool calling fix
2. Logs showed AI was generating correct Canvas JSON content
3. But JSON was being output as `text` chunks, not via `fs/write_text_file` tool
4. Tools like `w_query` (web search) and `bash` were being used
5. But `fs/write_text_file` was never called

**Fix:** Add system prompt via `append_system_prompt` in session settings:
```typescript
// iflowService.ts lines 357-366
const sessionSettings: Record<string, unknown> = {
    permission_mode: 'default',
    append_system_prompt: `IMPORTANT: When generating structured content like learning roadmaps, diagrams, knowledge graphs, or similar content:
1. Use the fs/write_text_file tool to create a file automatically
2. For visual roadmaps and diagrams, create an Obsidian Canvas file (.canvas extension)
3. Do NOT output large JSON structures as text - create files instead
4. Use descriptive filenames based on the content (e.g., "golang-learning-roadmap.canvas")
5. After creating the file, provide a brief summary of what was created`,
    add_dirs: [cwd],
};
```

**Key Insight:** The `append_system_prompt` session setting is passed to the AI model and guides its behavior. This is different from client-side prompts - it's server-side instruction that affects how the model thinks about tool usage.

**Impact:**
- AI now automatically creates files when generating structured content
- Users get actual Canvas files they can open and edit
- Chat interface shows tool call progress and summary
- Eliminates confusion from large JSON dumps in chat

**Related:**
- Similar to how VSCode plugin uses system prompts for mode-specific behavior
- See `iflow-for-vscode/src/acp/runtimeConfigApplier.ts` for reference

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
- ✅ Panel toggles on click
- ✅ Panel closes when clicking outside
- ✅ Panel appears below trigger button (not at page bottom)
- ✅ Input container stays fixed at bottom
- ✅ Messages scroll independently from input

### Testing Conversation Management

- ✅ New conversation creates empty state
- ✅ Conversations persist across reloads
- ✅ Switching conversations loads correct messages
- ✅ Deleting conversations works correctly
- ✅ Search filters conversations
- ✅ Export/import preserves data

### Debugging

```typescript
// Key log points
console.log('[iFlow Chat] sendMessage called', { isStreaming, content });
console.log('[iFlow] Stream complete, stopReason:', result.stopReason);
console.log('[iFlow Chat] onEnd called');
console.log('[ConversationStore] Storage quota:', quota);
```

Check browser console:
- `Ctrl/Cmd + Shift + I` → Console tab
- Filter: `iFlow`, `ConversationStore`

## Storage

| Location | Contents |
|----------|----------|
| `localStorage` (key: `iflow-conversations-{hash}`) | Vault-specific conversation data (JSON) |
| `localStorage` (key: 'iflow-settings') | Plugin settings |

### Vault Isolation

Each vault gets its own storage key based on path hash:
- Prevents cross-vault data contamination
- Allows independent conversation management per vault
- Automatic migration from old global storage

### Storage Limits

- **Max size**: 4MB per vault
- **Auto-cleanup**: Keeps 50 most recent conversations
- **Warning thresholds**:
  - 80%: Approaching limit
  - 95%: At limit

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
# 1. Make changes and test
npm run dev

# 2. Update versions
vim manifest.json  # Update "version"
vim package.json   # Update "version"
vim versions.json  # Add new version entry

# 3. Build
npm run build

# 4. Commit & push
git add -A
git commit -m "feat: your changes"
git push origin main

# 5. Create release with detailed notes
gh release create v0.x.x main.js manifest.json styles.css \
  --title "v0.x.x - Description" \
  --notes "Release notes"

# 6. Users update via BRAT
```

### Release Notes Template

```markdown
## 🎉 New Features
- Feature 1
- Feature 2

## 🐛 Bug Fixes
- Bug fix 1
- Bug fix 2

## 📝 Technical Changes
- Change 1
- Change 2

## 📦 Installation
### BRAT (Recommended)
1. Install BRAT plugin
2. Add: https://github.com/junjie-yan/iflow-for-obsidian
3. Enable plugin

### Manual
1. Download from releases
2. Extract to .obsidian/plugins/iflow-for-obsidian/
3. Enable in settings
```

## Reference Projects

- [iFlow for VSCode](https://github.com/iflow-ai/iflow-vscode) - VSCode extension (reference implementation)
- [Claudian](https://github.com/YishenTu/claudian) - Claude Code for Obsidian (inspiration)
- [Obsidian Sample Plugin](https://github.com/obsidianmd/obsidian-sample-plugin) - Basic plugin template

## Important Notes

- **Always check `isStreaming` state** before assuming message operations work
- **Never trigger full message reload during streaming** - causes UI flicker
- **Always call `onEnd` when stream completes** - otherwise messages won't save
- **Use requestAnimationFrame for DOM updates** - ensures rendering happens
- **Test second message send** - this is the most common failure mode
- **Check browser console logs** - they reveal state issues
- **Use vault-isolated storage** - each vault has independent data
- **Monitor storage quota** - auto-cleanup prevents overflow
- **Panel requires relative parent** - absolute positioning only works with `position: relative` parent
- **Initialize panel as hidden** - add `hidden` class on creation to prevent flash
- **Flexbox needs min-height: 0** - critical for flexible children to shrink properly
- **Input container must be flex: 0 0 auto** - prevents it from growing or shrinking

## Canvas File Support

### JSON Canvas 1.0 Format

Obsidian Canvas files use the JSON Canvas 1.0 open format:

```typescript
// Canvas file structure (iflowService.ts lines 3-36)
interface CanvasNode {
    id: string;              // Unique identifier
    type: 'text' | 'file' | 'link' | 'group';
    x: number;
    y: number;
    width: number;
    height: number;
    color?: string;          // "1"-"6" for color themes
    text?: string;           // For text nodes
    file?: string;           // For file nodes (relative path)
    subpath?: string;        // For file nodes (anchor/heading)
    url?: string;            // For link nodes
    label?: string;          // For link nodes
    background?: string;     // For group nodes
    backgroundStyle?: 'cover' | 'ratio' | 'repeat';
}

interface CanvasEdge {
    id: string;
    fromNode: string;        // Source node ID
    toNode: string;          // Target node ID
    fromSide?: 'top' | 'right' | 'bottom' | 'left';
    toSide?: 'top' | 'right' | 'bottom' | 'left';
    fromEnd?: 'none' | 'arrow';
    toEnd?: 'none' | 'arrow';
    color?: string;
    label?: string;
}

interface CanvasData {
    nodes?: CanvasNode[];
    edges?: CanvasEdge[];
}
```

### Canvas File Detection

```typescript
// Detect canvas files (iflowService.ts line 504)
private isCanvasFile(filePath: string): boolean {
    return filePath.endsWith('.canvas');
}
```

### Canvas Content Normalization

```typescript
// Normalize and validate canvas content (iflowService.ts lines 515-528)
private normalizeCanvasContent(content: string): string {
    try {
        const parsed = JSON.parse(content);
        if (parsed && (parsed.nodes || parsed.edges)) {
            return JSON.stringify(parsed, null, '\t');
        }
    } catch (e) {
        console.log('[iFlow] Invalid canvas JSON, creating basic canvas with content');
    }
    return this.generateBasicCanvas(content);
}
```

### Intelligent Canvas Format Guidance

When the user wants to create visual content, the plugin automatically injects Canvas format guidance:

```typescript
// Auto-detect Canvas intent (iflowService.ts lines 696-768)
const wantsCanvas = /canvas|思维导图|流程图|导图|可视化|graph|map|flowchart/i.test(prompt);

if (wantsCanvas) {
    const canvasGuidance = `
== Obsidian Canvas 文件格式指导 ==

当创建 .canvas 文件时，请遵循 JSON Canvas 1.0 格式：

文件结构：
{
  "nodes": [...],
  "edges": [...]
}

[... detailed Canvas format instructions ...]
`;
    prompt = canvasGuidance + '\n\n' + prompt;
}
```

**Detection keywords**:
- Chinese: canvas、思维导图、流程图、导图、可视化
- English: canvas、graph、map、flowchart、diagram

### Canvas File Writing

Canvas files receive special handling in `fs/write_text_file`:

```typescript
// Canvas file handling (iflowService.ts lines 407-468)
this.protocol.onServerMethod('fs/write_text_file', async (_id: number, params: any) => {
    const vaultPath = this.getVaultPath();
    const relativePath = this.getAbsolutePath(params.path, vaultPath);

    // Special handling for canvas files
    if (this.isCanvasFile(relativePath)) {
        console.log('[iFlow] Creating canvas file:', relativePath);
        const canvasContent = this.normalizeCanvasContent(params.content);

        const existingFile = this.app.vault.getAbstractFileByPath(relativePath);
        if (existingFile) {
            const file = this.app.vault.getFileByPath(relativePath);
            if (file) {
                await this.app.vault.modify(file, canvasContent);
            }
        } else {
            await this.app.vault.create(relativePath, canvasContent);
        }
        return null;
    }

    // Regular file handling...
});
```

### Canvas vs Claudian Architecture

| Feature | iFlow for Obsidian | Claudian |
|---------|-------------------|----------|
| **CLI** | iFlow CLI | Claude Code CLI |
| **SDK** | Direct WebSocket | Claude Agent SDK |
| **Skills** | Plugin-level guidance | obsidian-skills in CLI |
| **Canvas support** | Auto-detect + inject format | Built into CLI |

**Key insight**: iFlow CLI doesn't have obsidian-skills like Claude Code CLI, so Canvas format guidance must be provided at the plugin level through intelligent prompt injection.

## Tool Call Visualization

### Overview

Tool call visualization provides real-time feedback when AI executes tools, making the agent's actions transparent to the user. This is critical for user trust and debugging.

### IFlowToolCall Interface

```typescript
// Tool call state tracking (iflowService.ts lines 69-76)
export interface IFlowToolCall {
    id: string;                    // Unique tool call ID
    name: string;                  // Tool name (e.g., fs/write_text_file)
    input: any;                    // Tool parameters
    status?: 'running' | 'completed' | 'error';
    result?: any;                  // Tool result (when completed)
    error?: string;                // Error message (when failed)
}
```

### Tool Call Detection

iFlow CLI sends tool calls through `session/update` notifications:

```typescript
// Tool use detection (iflowService.ts lines 586-598)
if (content.type === 'tool_use') {
    console.log('[iFlow] Tool use detected:', content.name);
    this.messageHandlers.forEach(handler => handler({
        type: 'tool',
        data: {
            id: content.id || content.tool_use_id || Date.now().toString(),
            name: content.name,
            input: content.input || content.arguments,
            status: 'running',
        } as IFlowToolCall,
    }));
}

// Tool result detection (iflowService.ts lines 599-613)
else if (content.type === 'tool_result') {
    console.log('[iFlow] Tool result:', content.tool_use_id);
    this.messageHandlers.forEach(handler => handler({
        type: 'tool',
        data: {
            id: content.tool_use_id || content.id,
            name: content.tool_name || 'unknown',
            input: {},
            status: content.error ? 'error' : 'completed',
            result: content.result || content.content,
            error: content.error,
        } as IFlowToolCall,
    }));
}
```

### UI Implementation

Tool call visualization creates interactive cards showing tool execution:

```typescript
// Tool call display (chatView.ts lines 348-420)
private showOrUpdateToolCall(messageId: string, tool: IFlowToolCall): void {
    // Find or create tool call container
    let toolContainer = contentEl.querySelector(`.iflow-tool-call[data-tool-id="${tool.id}"]`);

    if (!toolContainer) {
        // Create new tool call element with status
        toolContainer = contentEl.createDiv({
            cls: `iflow-tool-call iflow-tool-status-${tool.status || 'running'}`,
        });
        (toolContainer as any).dataset.toolId = tool.id;

        // Status icon: 🔄 running / ✅ completed / ❌ error
        const statusIcon = tool.status === 'completed' ? '✅' :
                           tool.status === 'error' ? '❌' : '🔄';

        header.createSpan({ cls: 'iflow-tool-icon', text: statusIcon });
        header.createSpan({ cls: 'iflow-tool-name', text: tool.name });

        // Display parameters in formatted code block
        if (tool.input && Object.keys(tool.input).length > 0) {
            const inputPre = details.createEl('pre', { cls: 'iflow-tool-input' });
            inputPre.createEl('code', { text: JSON.stringify(tool.input, null, 2) });
        }
    } else {
        // Update existing tool call status
        toolContainer.className = `iflow-tool-call iflow-tool-status-${tool.status || 'running'}`;

        // Update icon based on status
        if (iconEl) {
            iconEl.textContent = tool.status === 'completed' ? '✅' :
                                tool.status === 'error' ? '❌' : '🔄';
        }

        // Add result when completed
        if (tool.status === 'completed' && tool.result) {
            resultEl = details.createEl('pre', { cls: 'iflow-tool-result' });
            const resultText = typeof tool.result === 'string'
                ? tool.result
                : JSON.stringify(tool.result, null, 2);
            resultEl.createEl('code', { text: resultText });
        }

        // Add error when failed
        if (tool.status === 'error' && tool.error) {
            errorEl = details.createDiv({ cls: 'iflow-tool-error' });
            errorEl.createSpan({ text: `❌ 错误: ${tool.error}` });
        }
    }
}
```

### CSS Styling

Tool calls have visual status indicators:

```css
/* Tool call card (styles.css lines 1002-1101) */
.iflow-tool-call {
    margin: 12px 0;
    padding: 12px;
    background: var(--background-secondary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 6px;
}

/* Status indicators via left border */
.iflow-tool-status-running {
    border-left: 3px solid var(--iflow-warn);  /* Yellow = running */
}

.iflow-tool-status-completed {
    border-left: 3px solid var(--iflow-success);  /* Green = success */
}

.iflow-tool-status-error {
    border-left: 3px solid var(--iflow-error);  /* Red = error */
}

/* Pulsing animation for running tools */
.iflow-tool-status-running .iflow-tool-icon {
    animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}
```

### Tool Call Lifecycle

```
1. User sends message → AI decides to use tool
   ↓
2. iFlow CLI sends: { type: 'tool_use', name: 'fs/write_text_file', input: {...} }
   ↓
3. Plugin creates UI: 🔄 fs/write_text_file (with parameters)
   ↓
4. Tool executes in iFlow CLI
   ↓
5. iFlow CLI sends: { type: 'tool_result', tool_use_id: 'xxx', result: null }
   ↓
6. Plugin updates UI: ✅ fs/write_text_file (with result)
```

### Integration with Message Flow

Tool calls are embedded within assistant messages:

```typescript
// Message structure
private sendMessage() {
    const assistantMsgId = this.addMessage('assistant', '');

    await this.iflowService.sendMessage({
        onChunk: (chunk: string) => {
            // Stream text content
            this.currentMessage += chunk;
            this.updateMessage(assistantMsgId, this.currentMessage);
        },
        onTool: (tool: IFlowToolCall) => {
            // Show/update tool call within same message
            this.showOrUpdateToolCall(assistantMsgId, tool);
        },
        onEnd: () => {
            // Save complete message with tool calls
            this.conversationStore.addAssistantMessage(id, this.currentMessage);
        },
    });
}
```

### Comparison with Claudian

| Feature | iFlow v0.7.0 | Claudian |
|---------|-------------|----------|
| **Tool detection** | ✅ `tool_use` / `tool_result` | ✅ `tool_use` / `tool_result` |
| **Status tracking** | ✅ running/completed/error | ✅ running/completed/error |
| **UI rendering** | ✅ Cards with icons | ✅ Expandable cards |
| **Parameter display** | ✅ JSON formatted | ✅ JSON formatted |
| **Result display** | ✅ JSON formatted | ✅ Formatted |
| **Error display** | ✅ Error messages | ✅ Error messages |
| **Animations** | ✅ Pulse for running | ✅ Progress indicators |
| **Buffering** | ❌ Immediate render | ✅ Batch rendering |

**Key difference**: Claudian buffers tool calls and renders them in batches for better performance, while iFlow renders immediately for simplicity.

### Debugging Tool Calls

Enable detailed logging to see tool call flow:

```typescript
// In iflowService.ts
console.log('[iFlow] Tool use detected:', content.name);
console.log('[iFlow] Tool result:', content.tool_use_id);

// In chatView.ts
console.log('[iFlow Chat] Tool call:', tool);
```

Filter browser console for `[iFlow]` to see tool call events.

### Common Issues

**Issue**: Tool calls not visible
- **Cause**: iFlow CLI not sending `tool_use` notifications
- **Fix**: Check iFlow CLI version and configuration

**Issue**: Tool stuck in "running" state
- **Cause**: `tool_result` never received
- **Fix**: Check iFlow CLI logs for errors

**Issue**: Tool result not displayed
- **Cause**: Result is `null` or `undefined`
- **Fix**: Some tools (like `fs/write_text_file`) return `null` on success

## When Adding Features

1. **Check existing patterns first** - don't reinvent
2. **Consider streaming impact** - will it work during isStreaming?
3. **Test conversation switching** - does state transfer correctly?
4. **Verify persistence** - do changes save to localStorage?
5. **Test export/import** - does data preserve correctly?
6. **Check vault isolation** - does each vault have independent data?
7. **Add debug logs** - help future debugging
8. **Update documentation** - keep CLAUDE.md and README.md current

### Canvas-Specific Considerations

When adding Canvas-related features:
- **Validate JSON structure** - always use `normalizeCanvasContent()` to ensure valid Canvas format
- **Detect file type** - use `isCanvasFile()` before processing
- **Inject format guidance** - add to prompt guidance if AI needs to understand Canvas format
- **Test with Obsidian** - open generated `.canvas` files in Obsidian to verify they render correctly
- **Consider iFlow CLI limitations** - iFlow doesn't have obsidian-skills, so format help must be at plugin level

### Tool Call-Specific Considerations

When adding tool call features:
- **Handle all content types** - check for `tool_use`, `tool_result`, and `text` types
- **Use unique IDs** - tool calls need stable IDs for updates (use `content.id` or generate one)
- **Update existing UI** - check if tool element exists before creating new one
- **Display all states** - show running, completed, and error states clearly
- **Format JSON output** - use `JSON.stringify(obj, null, 2)` for readable parameters/results
- **Handle null results** - some tools (like `fs/write_text_file`) return `null` on success
- **Test with real tools** - verify tool calls work with actual iFlow CLI tool execution
- **Log everything** - tool calls can be complex to debug, log all states and transitions
