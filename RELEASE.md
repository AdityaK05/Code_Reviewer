# Release Checklist

## Version: 0.1.0

### Build & Package
- [x] TypeScript validation (`npm run typecheck`)
- [x] Native Engine CMake configuration (Windows x64 MSVC)
- [x] Electron application build
- [x] Packaged resources inclusion (`CodeReviewerEngine.exe` into MSI)
- [x] MSI installer generation

### Security & Hardening
- [x] Electron sandbox & context isolation enabled
- [x] Navigation restrictions strictly applied
- [x] Path traversal protections re-verified in `IngestionService`
- [x] Redaction heuristics functional (`SecretRedactor`)
- [x] Output encoding for HTML reports functional

### Functional Validation
- [x] MSI cleanly installs per-machine
- [x] Local review persistence loads gracefully
- [x] Deterministic AI degradation tested
- [x] Interactive Findings dashboard operates seamlessly
- [x] JSON / HTML Export saves accurately

### Known Limitations
- The initial release natively packages `MSVC` Windows binaries; macOS/Linux requires local engine recompilation.
- AI features are currently backed by the internal Mock engine for verifiable local demonstrations prior to integration of cloud-provider keys.
