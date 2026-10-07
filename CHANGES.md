# Changelog

## Phase 5 (2026-10-07)
- Completed Phase 5: Production Hardening & Windows MSI Release.
- Added `ReviewManager` to persist user findings statuses (open, reviewed, etc.) and notes locally.
- Added interactive review elements directly to the React `IngestionUI`.
- Integrated `Export HTML` and `Export JSON` report generation capabilities directly tied to the review state.
- Hardened Electron IPC bounds and `webContents` navigation routing to strictly prevent external site loading.
- Updated `package.json` and `electron-builder.yml` to compile the C++ engine statically and bundle it into the final Windows MSI distribution.
- Completed comprehensive final security pass across the Electron main loop, native C++ engine pipeline, and local filesystem abstraction layer.## Phase 4 (2026-10-07)
- Completed Phase 4: AI-Assisted Security Reasoning Layer.
- Added provider-agnostic `IAIProvider` and `MockAIProvider`.
- Added `SecretRedactor` to deterministically strip credentials from code before AI transit.
- Added `CorrelationEngine` for grouping findings logically before AI reasoning.
- Added `RiskScorer` to deterministically weight findings based on severity, confidence, and correlations.
- Plumbed `AIPipeline` into the Electron Main `analysis-start` endpoint so AI evaluations gracefully fallback without breaking the UI if unavailable.
- Upgraded `IngestionUI.tsx` to render rich AI assessments, updated Risk scores, and correlated finding groups.
- Tested AI resilience against Prompt Injection simulation and Secret Redaction integrity.## Phase 3 (2026-10-07)
- Completed Phase 3: Native C++ Static Analysis Engine + Findings Pipeline.
- Added C++ static analysis rules for unsafe string copy (`strcpy`) and unsafe command execution (`system()`).
- Added `AnalysisSession` and `RuleEngine` to Native C++ engine.
- Defined deterministic schema for `Findings`.
- Updated Electron IPC endpoints (`analysis-start`) to safely pass manifest to the Native Engine.
- Updated React UI (`IngestionUI.tsx`) to start analysis, display state, duration, findings, snippets, severity, and confidence.
- Integrated C++ RuleEngine tests using GoogleTest.

## Phase 2 (2026-10-07)
- Completed Phase 2: Secure Project Ingestion Pipeline.
- Added `yauzl` dependency for secure ZIP extraction.
- Implemented `WorkspaceManager` to isolate untrusted user input into temporary directories.
- Implemented robust `ZipExtractor` defending against path traversal, zip bombs, and absolute paths.
- Added `IngestionUI` for ZIP, file, and paste input.
- Added deterministic `ManifestBuilder` and `FileClassifier`.

## Phase 1 (2026-10-06)
- Implemented React application shell with navigation and engine status UI.
- Hardened Electron security (contextIsolation, nodeIntegration: false, sandbox).
- Established strict, typed IPC bridge for C++ communication.
- Implemented native process lifecycle manager in Electron main.
- C++ Engine processes structured JSON over stdin/stdout.
- Configured Vitest and GTest frameworks with initial test cases.
- Finalized Windows MSI packaging config for native payloads.

## Phase 0
- CI/CD packaging configurations added
