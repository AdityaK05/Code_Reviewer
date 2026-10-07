# Phase 1 Workflow

## Complete Runtime Flow
1. **Application Startup**: Electron main process starts and spawns the C++ native engine (`CodeReviewerEngine.exe`) using standard I/O streams for communication.
2. **BrowserWindow Creation**: Electron initializes the UI window with `nodeIntegration: false`, `contextIsolation: true`, and a `preload` script.
3. **Preload API Exposure**: The preload script uses `contextBridge` to expose a minimal `window.codeReviewer` object with specific APIs (e.g., `native.health()`).
4. **React Renderer Request**: The renderer calls `window.codeReviewer.native.health()`.
5. **IPC Channel**: The preload script delegates this to `ipcRenderer.invoke('native-request', { operation: 'health' })`.
6. **Main IPC Handler**: The main process verifies the request operation (only `health` allowed in Phase 1) and converts it to a structured JSON payload with a generated `requestId`.
7. **Native Process**: The main process writes the JSON string to the native engine's `stdin`.
8. **C++ Processing**: `CodeReviewerEngine` reads `stdin` line-by-line, parses the JSON using `nlohmann-json`, executes the logic, and writes a structured JSON response back to `stdout`.
9. **Main Resolution**: The main process parses the JSON from `stdout`, correlates the `requestId`, and resolves the original IPC Promise.
10. **Renderer UI Update**: The React UI receives the response and updates the engine status (connected/unavailable/error).

## Security Boundaries
- The renderer has NO direct filesystem or Node access.
- IPC is heavily restricted. Only explicitly whitelisted operations are processed.
- The C++ native engine does not accept arbitrary shell commands or executable paths.

## Error Paths
- **Native Process Crash**: Main process detects `exit` event and rejects all pending Promises with a structured error.
- **Timeout**: Requests not answered within 5 seconds fail safely.
- **Malformed Data**: JSON parse errors on either side result in structured error responses without crashing the application.
