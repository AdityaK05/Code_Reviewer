# Phase 2: Secure Project Ingestion Workflow

Phase 2 establishes the boundary where untrusted user input enters the system.

## 1. Input Selection
User triggers an action via the React UI (`IngestionUI` component):
- **ZIP Project**: Select an archive.
- **Single File**: Select a specific source file.
- **Paste Code**: Manually paste a snippet into a textarea.

## 2. Preload & IPC Boundary
The UI invokes the `window.codeReviewer.ingestion` API.
This API calls specific IPC channels (`ingest-select-zip`, `ingest-select-file`, `ingest-paste`).
The renderer does NOT pass filesystem paths for ZIP/File selection. Instead, the Main process spawns a native OS dialog (`dialog.showOpenDialog`) to obtain the file path securely.

## 3. Secure Workspace Creation
The `WorkspaceManager` generates a new UUID and creates a clean temporary directory in the application's user data directory (e.g. `AppData/Roaming/.../workspaces/<uuid>`).

## 4. Extraction & Validation
For ZIP archives, `ZipExtractor` uses `yauzl` to lazily process entries:
- **Path Traversal Protection**: Absolute paths and paths containing `..` are explicitly rejected.
- **Zip Bomb Protection**: Hard limits are placed on total uncompressed size (e.g. 500MB), max files (10000), and individual entry size (50MB).
- **Safe Writing**: Node's `fs` strictly writes to the assigned workspace directory. Attempting to escape throws an error.

For files/pastes, the content is copied/written safely into the workspace using a validated filename.

## 5. File Classification
`FileClassifier` inspects file extensions to determine the programming language and categorize files as `source`, `config`, or `unknown`.

## 6. Manifest Generation
`ManifestBuilder` generates a deterministic `manifest.json` inside the workspace containing metadata about the ingested files (relative paths, sizes, languages, types). 
The summary of this manifest is returned to the renderer process.

## 7. Cleanup
If ingestion fails or is cancelled, `WorkspaceManager.cleanupSession()` securely deletes the temporary workspace. The application does not execute or evaluate the ingested files; they are treated strictly as static data.
