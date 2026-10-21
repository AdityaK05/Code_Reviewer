# Code Reviewer

## Overview
Code Reviewer is an Electron‑based application that provides static security analysis of codebases using a hybrid architecture:
- **Native C++ engine** for fast, deterministic rule evaluation.
- **React renderer** for the UI, powered by Vite.
- **Groq/Llama AI integration** for advanced semantic insights.

## Architecture
- `electron/` – Main process, preload scripts, IPC bridge.
- `src/renderer/` – React front‑end with Tailwind, Framer Motion, and now Three.js for 3D visualisations.
- `native/` – C++ analysis engine exposing JSON‑line IPC.
- `tools/agent‑harness/` – Helper utilities for Claude Code.

## Build & Run
```bash
npm install            # install JS dependencies
npm run build:native   # compile the native engine (uses build_native.bat)
npm run build          # bundle Electron app
npm run dev            # start Electron in development mode
```

## Features
- Real‑time static analysis with 12 rule types (CR001‑CR012).
- AI‑enhanced findings correlation and risk scoring.
- Secure zip ingestion with path‑traversal and bomb protection.
- Exportable review history (HTML/JSON).
- 3D animated visualisations using **Three.js**.

## 3D Animations
The dashboard now includes a rotating cube rendered with Three.js (`src/renderer/src/components/ThreeScene.tsx`). It demonstrates how to embed WebGL content alongside existing UI components.

## Contributing
1. Fork the repository.
2. Create a feature branch.
3. Ensure `npm run lint && npm run test && npm run typecheck` passes.
4. Submit a Pull Request.

---
Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Code <noreply@anthropic.com>