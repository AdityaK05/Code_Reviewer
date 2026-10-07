# Phase 3: Native Static Analysis Engine

Phase 3 establishes the pipeline for performing deterministic static analysis on ingested source code using a dedicated C++ engine.

## Workflow

1. **Trigger Analysis**:
   - The React UI invokes `window.codeReviewer.analysis.start(sessionId)`.
   - The renderer provides ONLY the `sessionId`. It does not construct or pass arbitrary file paths.

2. **Electron Main Validation**:
   - The IPC handler intercepts `analysis-start`.
   - It securely resolves the session using the `WorkspaceManager`.
   - It validates that a valid `manifest.json` exists for that session.
   - It parses the manifest to avoid passing excessive unvalidated strings blindly.

3. **Bridging to Native Engine**:
   - Electron builds an IPC payload and sends `{"operation": "analyze", "payload": { "sessionId": "...", "workspacePath": "...", "manifest": ... }}` to the C++ process over stdin.

4. **Native Analysis Session**:
   - The C++ engine receives the payload and initializes an `AnalysisSession`.
   - The session parses the manifest specifically looking for files marked as `"type": "source"`.
   - It checks constraints, ensuring paths do not contain `..` or attempt to escape the `workspacePath`.
   
5. **Rule Execution**:
   - Files are dispatched to the `RuleEngine`.
   - The `RuleEngine` selects deterministic C++ `IRule` implementations (e.g. `UnsafeStringCopyRule`, `UnsafeCommandRule`) based on the language.
   - The rules read the source sequentially, matching lexical/AST patterns.
   - Findings are generated matching a strict schema incorporating `ruleId`, `severity`, `confidence`, and evidence snippets.

6. **Results & UI**:
   - The Native engine wraps the findings into an `AnalysisResult` and serializes it over stdout.
   - Electron Main deserializes the JSON and passes it back through the Preload bridge.
   - The React UI displays the duration, analyzed/skipped file counts, and the formatted findings including syntax snippets and severity badges.

## Security Constraints Enforced

- **No Execution**: The C++ engine treats all source files as data. It does not spawn compilers or build tools found in the workspace.
- **Resource Limits**: The engine ignores non-source files and protects against path traversal natively.
- **Crash Isolation**: Because analysis happens in a separate native process, fatal errors (OOM, segfaults) in the C++ engine do not crash the Electron shell. Electron can recover and report the failure.
