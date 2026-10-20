# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This repository is an Electron-based Code Reviewer application. It utilizes a hybrid architecture, combining a React frontend, an Electron main process for system orchestration, and a native C++ engine for intensive analysis tasks (such as secret detection and unsafe command analysis).

## Development Commands
- **Install Dependencies**: `npm install`
- **Build**: `npm run build` (This runs both the native engine build and the Electron/Vite build)
- **Run Dev Server**: `npm run dev`
- **Run Tests**:
  - Frontend/Main Tests: `npm run test`
  - Native Engine Tests: Run via `ctest` within the `native/build` directory (requires building first).
- **Linting**: `npm run lint`
- **Formatting**: `npm run format`
- **Type Checking**: `npm run typecheck`

## Architecture & Structure
- `electron/`: Main process and preload scripts.
- `src/renderer/`: React frontend.
- `native/`: Native C++ engine source and CMake configuration.
- `tests/`: Testing utilities and suites for frontend and main processes.
- `tools/agent-harness/`: Reference implementation for the agent harness; largely independent of the main app.

### Communication Flow
- **Frontend ↔ Main**: Communicates via Electron's `contextBridge` in preload scripts.
- **Main ↔ Native**: Main process communicates with the C++ analysis engine using standard I/O pipes (JSON IPC).
- **Native Analysis**: The C++ engine defines analysis rules (e.g., `native/include/analysis/`). Modifications here require rebuilding the native engine (`build:native` script).
