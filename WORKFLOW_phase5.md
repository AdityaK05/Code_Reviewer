# Phase 5: Production & Export Workflow

This details the full production lifecycle within the completed `Code_Reviewer` application.

## End-to-End User Journey

1. **Launch**: Application boots via Electron. Hardened initialization locks down navigation and process context.
2. **Ingestion**: User drops a `.zip` archive or inputs a snippet. The `IngestionService` extracts this cleanly into a managed session workspace under `userData/workspaces/<uuid>`, enforcing path safety and size boundaries.
3. **Static Analysis**: The React UI requests analysis via IPC. The Electron Main process proxies this request to the `CodeReviewerEngine` via standard I/O (JSON).
4. **Deterministic Evaluation**: The isolated native binary analyzes the code using lexical pattern-matching (e.g., `strcpy`, `system`).
5. **Correlation & Enrichment**: The results flow back to Electron Main, pass through the `SecretRedactor` to strip hardcoded API keys, and are processed by the optional AI Provider.
6. **Risk Aggregation**: A deterministic `RiskScorer` weights severity and AI correlations to output a unified Risk Level.
7. **Interactive Review**: The findings render in the React UI. Users evaluate findings, add notes, and adjust their review status (Open, Reviewed, False Positive, Dismissed).
8. **Export**: The user generates a stand-alone HTML report or machine-readable JSON structure detailing the review outcomes, statuses, and native findings.
9. **Persistence**: Review statuses are asynchronously saved to lightweight local `JSON` storage in `userData/reviews`.
10. **Cleanup**: Application shutdown gracefully terminates the native engine and releases resource locks.
