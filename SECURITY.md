# Security Overview

The `Code_Reviewer` establishes multiple defensive layers.

## Threat Model
**Untrusted Source Data**: Any source code, project file, or snippet provided by the user is assumed maliciously crafted to exploit the analyzer or extract system capabilities.

### 1. Electron Hardening
- **Context Isolation (`contextIsolation: true`)**: Preloads operate across an isolated boundary.
- **Node Integration (`nodeIntegration: false`)**: The renderer has no raw access to OS features.
- **Web Security (`webSecurity: true`)**: Standard origin policies are enforced.
- **Navigation Lock (`setWindowOpenHandler` and `will-navigate`)**: Arbitrary navigation to unexpected remote URLs is blocked natively in `main/index.ts`.

### 2. Ingestion Security
- **Path Traversal Mitigation**: `.zip` contents are validated against relative boundary escapes (`../`) and extracted exclusively to the localized workspace.
- **Workspace Isolation**: Projects are placed into unique UUID-based directories in `%AppData%`.
- **Absolute Constraints**: Analyzers are given the constrained workspace root; files are evaluated relatively.

### 3. Native Process Boundary
- **Controlled Binary**: `CodeReviewerEngine.exe` is bundled alongside the app. The execution path is hardcoded to the internal `process.resourcesPath/native` array.
- **Standard I/O Bridge**: Communication occurs exclusively via `stdin/stdout` using a constrained JSON schema. The native engine has no network capabilities.

### 4. AI Prompt & Secret Protection
- **Secret Stripping**: A `SecretRedactor` evaluates source code strings *before* dispatching to any external AI provider, proactively masking keys (e.g., AWS, OpenAI, MongoDB credentials) to prevent accidental exfiltration.
- **LLM Output Validation**: Structured output is strictly parsed. Prompt injection attempting to break the JSON layout is rejected gracefully by the `AIPipeline`, defaulting safely back to the deterministic finding.

### 5. Reporting Exfiltration Prevention
- **HTML Sanitization**: All exported `.html` reports proactively encode (`&lt;`, `&gt;`, `&quot;`, `&#039;`, `&amp;`) raw snippet evidence to mitigate HTML/Script Injection when viewed in external browsers.
