# Architecture Decisions

## Phase 0 & 1
1. **Electron + React choice**: Chosen as the primary frontend framework for cross-platform desktop UI with rich ecosystem support.
2. **C++ native-engine choice**: Kept as a separate controlled native process instead of a Node native module to ensure process isolation, crash resilience, and performance predictability.
3. **Separate native-process architecture**: Ensures UI doesn't freeze and avoids Node API surface vulnerabilities. Main process owns native lifecycle.
4. **CMake/vcpkg choice**: Standard C++ ecosystem tools for Windows native development.
5. **Windows MSI target**: The standard enterprise distribution mechanism.
6. **Objective-C/Objective-C++ future role**: Strictly reserved for eventual macOS native integration. Qt is not used for UI.
7. **Security Boundaries**: Renderer is completely unprivileged. Preload exposes minimal, typed API. No shell execution is permitted anywhere in the IPC or C++ logic.
8. **Communication**: Stdin/Stdout JSON structured protocol between Electron Main and C++ process.

## Phase 2
9. **Zero Trust Ingestion**: All uploaded projects are considered untrusted.
10. **Controlled Workspaces**: Extraction occurs ONLY in application-controlled workspaces in `userData`.
11. **Path Validation**: `yauzl` strictly validates archive paths. Pre-flight checks prevent traversal out of the workspace.
12. **No Execution**: The ingested project is strictly parsed as data. No builds, no shell scripts, and no package manager installs run during ingestion.
13. **Renderer Limitations**: Renderer has no filesystem access. It receives only sanitized, safe metadata (manifest) from Electron Main.

## Phase 3
14. **Native C++ Analysis**: Implemented in C++ to leverage high-performance text and AST processing capabilities while keeping analysis completely separated from Node.js (and the UI) ensuring crash resilience.
15. **Untrusted Source**: Analysis acts entirely on text and metadata; it does NOT execute code, invoke compiler extensions indiscriminately, or run binaries found in the workspace.
16. **Determinism over AI**: Reliable rule-matching with explicit severity and confidence intervals precedes arbitrary LLM usage to guarantee consistent baseline security and reproducible findings.
17. **Strict Context Boundaries**: Electron merely proxies validated identifiers (`sessionId`) instead of file paths, and the C++ Engine itself re-validates paths against the workspace root.
18. **Optional Analyzers**: If external tools like `clang-tidy` are integrated later, they will be invoked explicitly using argument arrays, not via shells. Currently, built-in rules guarantee operation without external dependencies.

## Phase 4
19. **AI is Enrichment, not Authoritative**: Deterministic findings remain the absolute source of truth. AI output is treated as untrusted and is validated strictly before appearing.
20. **Security First AI Context**: A `SecretRedactor` is aggressively applied to all source snippets BEFORE they are dispatched to any AI provider, preventing the leakage of API keys or tokens embedded in code.
21. **No Credentials in Renderer**: The React renderer possesses zero knowledge of AI Providers or their respective API Keys.
22. **Prompt Injection Resilience**: The system treats source code structurally as data. Test coverage simulates prompt injection to ensure the application degrades gracefully when the provider (or local fallback filters) rejects adversarial evaluation strings.
23. **Deterministic Risk Formula**: Risk scores are calculated mathematically based on deterministic weights. AI does not autonomously override base severities.
24. **Graceful Degradation**: If the AI pipeline times out, hits a rate limit, encounters malformed outputs, or intercepts prompt injection, it silently fails the AI block for that finding and delivers the core deterministic findings regardless.
