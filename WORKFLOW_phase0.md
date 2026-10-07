# Phase 0 Workflow

## Repository Structure
- `electron/` - Electron main and preload processes.
- `src/renderer/` - React frontend application.
- `native/` - C++ native engine source and CMake files.
- `tests/` - Testing scaffolding.
- `tools/agent-harness/` - Agent harness reference implementation.

## Build Flow
1. Install node dependencies: `npm install`
2. Build native engine: `cd native && cmake -B build && cmake --build build`
3. Run dev server: `npm run dev`

## Communication Architecture
Electron Renderer communicates with Electron Main via `preload` scripts (`contextBridge`).
Electron Main communicates with the C++ executable via standard I/O (JSON IPC).

## Testing & Packaging
- Vitest/Playwright for frontend testing.
- CTest/GoogleTest for native testing.
- `electron-builder` for MSI packaging.
