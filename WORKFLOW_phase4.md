# Phase 4: AI-Assisted Security Reasoning

Phase 4 establishes an intelligence layer above the deterministic static analysis pipeline. It is strictly opt-in and does not alter the fundamental static analysis flow if omitted or if it fails.

## Workflow

1. **Deterministic Finding Generation**:
   - The C++ native engine completes its static analysis.
   - It outputs findings in a structured, deterministic JSON schema.

2. **Finding Normalizer and Correlation Engine**:
   - `CorrelationEngine` receives the findings and groups them using deterministic heuristics (e.g., findings in the same file).
   - This prevents redundant or overlapping alerts and creates unified context for AI assessment.

3. **Secret Redactor**:
   - Before any code is sent to an external provider, it is passed through the `SecretRedactor`.
   - The redactor searches for patterns resembling API keys, secrets, access tokens, etc., and deterministically masks them (e.g., `[REDACTED_SECRET]`).
   - *This operates on the localized snippet being sent, ensuring no secrets leak out.*

4. **AI Context Builder & Provider Abstraction**:
   - The system utilizes a generic `IAIProvider` interface, avoiding vendor lock-in. Currently, a `MockAIProvider` serves as the test and baseline implementation.
   - Findings and their evidence snippets are assembled securely into an AI request.

5. **AI Evaluation**:
   - The selected provider evaluates the context and outputs structured feedback containing:
     - Confidence/Validity assessment
     - Why the finding matters
     - Attack scenario & impact
     - Remediation guidance

6. **Structured Output Validator**:
   - The response from the AI provider is parsed strictly as JSON and validated against the expected `StructuredAIOutput` schema.
   - Any malformed outputs or unexpected schema fields are discarded.
   - If the AI evaluates a snippet attempting prompt injection (e.g., "Ignore previous instructions"), this safety layer combined with provider filters will gracefully reject the evaluation without crashing.

7. **Deterministic Risk Aggregator**:
   - A final `RiskScorer` deterministically weighs the base severity, confidence, and correlation count to generate a final Risk level (Critical, High, Medium, Low, Info).
   - AI does not manipulate this baseline score, it only offers guidance.

8. **Review Result to UI**:
   - The enriched array containing base findings, AI assessments, risk scores, and correlation groups is returned safely to the React Renderer.
   - The UI beautifully renders the original finding, the AI-assisted assessment blocks, and related findings without modifying source files.

## Security Controls

- **Source Code is Untrusted Data**: Source code strings are never treated as instructions.
- **Provider Security**: The provider is isolated in the Electron Main process. API Keys never touch the Renderer UI, mitigating XSS leakage.
- **Graceful Fallback**: If the provider fails, times out, or encounters prompt injection, the `AIPipeline` gracefully catches the error and still emits the core deterministic findings.
- **No Command Execution**: The AI Provider cannot launch tools, execute shell commands, or traverse files.
