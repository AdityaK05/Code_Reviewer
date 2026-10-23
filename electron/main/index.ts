import 'dotenv/config'
import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { spawn, ChildProcess } from 'child_process'
import { randomUUID } from 'crypto'
import { existsSync, readFileSync } from 'fs'
import { writeFile } from 'fs/promises'
import { IngestionService } from './ingestion/IngestionService'

import { ReviewManager } from './review/ReviewManager'
import { AIPipeline } from './ai/AIPipeline'
import { DeepAIAgent } from './ai/DeepAIAgent'

let nativeProcess: ChildProcess | null = null
let mainWindow: BrowserWindow | null = null
const ingestionService = new IngestionService()
const reviewManager = new ReviewManager()
reviewManager.init()

// Define a map for pending requests
const pendingRequests = new Map<string, (response: any) => void>()

function findNativeExecutable(): string {
  const isWin = process.platform === 'win32';
  const resourcesNative = process.resourcesPath ? join(process.resourcesPath, 'native') : null;

  // Helper to test a candidate and return it if it exists
  const tryCandidate = (candidate: string): string | null => {
    if (existsSync(candidate)) return candidate;
    return null;
  };

  // 1. Packaged app native binary (prefer exe, fall back to bat/sh)
  if (resourcesNative) {
    const exeRes = join(resourcesNative, isWin ? 'CodeReviewerEngine.exe' : 'CodeReviewerEngine');
    const batRes = join(resourcesNative, isWin ? 'CodeReviewerEngine.bat' : 'CodeReviewerEngine.sh');
    const tried = tryCandidate(exeRes) || tryCandidate(batRes);
    if (tried) return tried;
  }

  // 2. Development build output (exe first, then bat/sh)
  const devCandidates: string[] = [
    join(__dirname, '../../native/build/Debug', isWin ? 'CodeReviewerEngine.exe' : 'CodeReviewerEngine'),
    join(process.cwd(), 'native/build/Debug', isWin ? 'CodeReviewerEngine.exe' : 'CodeReviewerEngine'),
    join(app.getAppPath ? app.getAppPath() : process.cwd(), 'native/build/Debug', isWin ? 'CodeReviewerEngine.exe' : 'CodeReviewerEngine'),
    // Fallback: Node.js implementation – try .bat on Windows, .sh on others
    join(__dirname, '../../native/build/Debug', isWin ? 'CodeReviewerEngine.bat' : 'CodeReviewerEngine.sh'),
    join(process.cwd(), 'native/build/Debug', isWin ? 'CodeReviewerEngine.bat' : 'CodeReviewerEngine.sh'),
    join(app.getAppPath ? app.getAppPath() : process.cwd(), 'native/build/Debug', isWin ? 'CodeReviewerEngine.bat' : 'CodeReviewerEngine.sh'),
  ];
  for (const c of devCandidates) {
    const found = tryCandidate(c);
    if (found) return found;
  }

  // 3. Explicit fallback: packaged resources fallback .bat/sh (if exe missing)
  if (resourcesNative) {
    const fallbackBat = join(resourcesNative, isWin ? 'CodeReviewerEngine.bat' : 'CodeReviewerEngine.sh');
    if (existsSync(fallbackBat)) return fallbackBat;
    const fallbackExe = join(resourcesNative, isWin ? 'CodeReviewerEngine.exe' : 'CodeReviewerEngine');
    if (existsSync(fallbackExe)) return fallbackExe;
  }

  // Nothing found – return first candidate so the error UI can show a helpful message
  return candidates[0] || join(__dirname, '../../native/build/Debug', isWin ? 'CodeReviewerEngine.exe' : 'CodeReviewerEngine');
}

function startNativeProcess(): boolean {
  if (nativeProcess && nativeProcess.stdin && !nativeProcess.killed) {
    return true
  }

  const executablePath = findNativeExecutable()
  if (!existsSync(executablePath)) {
    console.error(`[Native Engine] Executable not found at ${executablePath}`)
    return false
  }

  try {
    nativeProcess = spawn(executablePath, [], {
      stdio: ['pipe', 'pipe', 'pipe']
    })

    nativeProcess.on('error', (err) => {
      console.error('[Native Engine Spawn Error]:', err)
      nativeProcess = null
    })

    if (!nativeProcess.stdout || !nativeProcess.stdin) {
      console.error('Failed to bind standard I/O to native process')
      return false
    }

    let stdoutBuffer = ''
    nativeProcess.stdout.on('data', (data: Buffer) => {
      stdoutBuffer += data.toString()
      let newlineIndex
      while ((newlineIndex = stdoutBuffer.indexOf('\n')) !== -1) {
        const line = stdoutBuffer.slice(0, newlineIndex).trim()
        stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1)
        if (!line) continue
        try {
          const response = JSON.parse(line)
          const reqId = response.requestId
          if (reqId && pendingRequests.has(reqId)) {
            const resolve = pendingRequests.get(reqId)
            resolve?.(response)
            pendingRequests.delete(reqId)
          }
        } catch (err) {
          console.error('Failed to parse JSON from native process', err, line)
        }
      }
    })

    nativeProcess.stderr?.on('data', (data: Buffer) => {
      console.error(`[Native Engine Error]: ${data.toString()}`)
    })

    nativeProcess.on('exit', (code) => {
      console.log(`Native engine exited with code ${code}`)
      nativeProcess = null
      for (const [id, resolve] of pendingRequests.entries()) {
        resolve({
          requestId: id,
          success: false,
          error: { code: 'ENGINE_EXITED', message: 'Native engine exited unexpectedly' }
        })
      }
      pendingRequests.clear()
    })
    return true
  } catch (err) {
    console.error('Failed to spawn native process', err)
    return false
  }
}

function sendNativeRequest(operation: string, payload?: any, timeoutMs: number = 15000): Promise<any> {
  return new Promise((resolve) => {
    if (!nativeProcess || !nativeProcess.stdin || nativeProcess.killed) {
      const ok = startNativeProcess()
      if (!ok || !nativeProcess || !nativeProcess.stdin) {
        resolve({
          success: false,
          error: { code: 'ENGINE_UNAVAILABLE', message: 'Native engine is not running' }
        })
        return
      }
    }

    const requestId = randomUUID()
    pendingRequests.set(requestId, resolve)
    const requestObj = { requestId, operation, payload }
    nativeProcess.stdin.write(JSON.stringify(requestObj) + '\n')

    setTimeout(() => {
      if (pendingRequests.has(requestId)) {
        pendingRequests.delete(requestId)
        resolve({
          requestId,
          success: false,
          error: { code: 'TIMEOUT', message: 'Request timed out' }
        })
      }
    }, timeoutMs)
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // Security hardening: Prevent arbitrary navigation and external windows
  mainWindow.webContents.setWindowOpenHandler((_details) => {
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Only allow navigation to known app URLs, deny everything else
    if (!url.includes('localhost') && !url.startsWith('file://')) {
      event.preventDefault()
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  startNativeProcess()

  ipcMain.handle('native-request', async (event, request: { operation: string; payload?: any }) => {
    if (!request || typeof request.operation !== 'string') {
      return { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid request format' } }
    }
    if (request.operation !== 'health') {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Operation not allowed in Phase 1' } }
    }
    return await sendNativeRequest(request.operation, request.payload)
  })

  // Ingestion Handlers
  ipcMain.handle('ingest-select-zip', async () => {
    if (!mainWindow) return { success: false, error: { message: 'No window' } }
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Select ZIP Project',
      filters: [{ name: 'ZIP Archives', extensions: ['zip'] }],
      properties: ['openFile']
    })
    if (canceled || filePaths.length === 0) return { success: false, error: { message: 'CANCELLED' } }
    
    try {
      const { manifest } = await ingestionService.ingestZip(filePaths[0])
      return { success: true, payload: manifest }
    } catch (err: any) {
      return { success: false, error: { code: err.message, message: err.message } }
    }
  })

  ipcMain.handle('ingest-select-file', async () => {
    if (!mainWindow) return { success: false, error: { message: 'No window' } }
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Select File',
      properties: ['openFile']
    })
    if (canceled || filePaths.length === 0) return { success: false, error: { message: 'CANCELLED' } }
    
    try {
      const { manifest } = await ingestionService.ingestFile(filePaths[0])
      return { success: true, payload: manifest }
    } catch (err: any) {
      return { success: false, error: { code: err.message, message: err.message } }
    }
  })

  ipcMain.handle('ingest-paste', async (event, args: { filename: string, content: string }) => {
    try {
      if (!args || typeof args.filename !== 'string' || typeof args.content !== 'string') {
        return { success: false, error: { code: 'INVALID_ARGUMENTS', message: 'Invalid filename or content' } }
      }
      const { manifest } = await ingestionService.ingestPaste(args.filename, args.content)
      return { success: true, payload: manifest }
    } catch (err: any) {
      return { success: false, error: { code: err.message, message: err.message } }
    }
  })

  ipcMain.handle('analysis-start', async (event, args: { sessionId: string }) => {
    try {
      if (!args || typeof args.sessionId !== 'string') {
        return { success: false, error: { code: 'INVALID_SESSION', message: 'Missing or invalid sessionId' } }
      }

      // 1. Get session info securely
      const session = ingestionService.getWorkspaceManager().getSession(args.sessionId)
      if (!session) {
        return { success: false, error: { code: 'INVALID_SESSION', message: 'Session not found or invalid' } }
      }

      // 2. Validate manifest exists
      const manifestPath = join(session.workspacePath, 'manifest.json')
      if (!existsSync(manifestPath)) {
        return { success: false, error: { code: 'NO_MANIFEST', message: 'Manifest missing' } }
      }

      const manifestStr = readFileSync(manifestPath, 'utf8')
      const manifest = JSON.parse(manifestStr)

      // 3. Send to C++ native engine with adequate timeout for large jobs
      const payload = {
        sessionId: args.sessionId,
        workspacePath: session.workspacePath,
        manifest: manifest
      }

      const nativeResponse = await sendNativeRequest('analyze', payload, 60000)
      
      if (!nativeResponse.success) {
        return nativeResponse;
      }

      // 4. Deep AI Scan (Hybrid: Deterministic findings + Snippet analysis + Diff & SHA-256 caching)
      const aiAgent = new DeepAIAgent()
      const aiFindings = await aiAgent.scanProject(session.workspacePath, manifest, {
        deterministicFindings: nativeResponse.payload.findings,
        diffOnly: true
      })
      
      // Merge deterministic C++ findings with AI findings
      nativeResponse.payload.findings = [
        ...(nativeResponse.payload.findings || []),
        ...aiFindings
      ]
      nativeResponse.payload.aiOptimization = {
        hybridFiltering: true,
        diffScanning: true,
        cacheStats: aiAgent.getCacheStats()
      }

      // 5. Pass merged findings through AI pipeline for correlation, risk scoring, and reporting
      const aiPipeline = new AIPipeline()
      const enrichedPayload = await aiPipeline.processFindings(nativeResponse.payload)

      return { success: true, payload: enrichedPayload }
    } catch (err: any) {
      return { success: false, error: { code: err.code || 'ANALYSIS_ERROR', message: err.message } }
    }
  })

  // Review Handlers
  ipcMain.handle('review-save', async (event, args: { sessionId: string, history: any }) => {
    try {
      if (!args || typeof args.sessionId !== 'string' || !args.history) {
        return { success: false, error: { message: 'Invalid review payload' } }
      }
      await reviewManager.saveReview(args.sessionId, args.history)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: { message: err.message } }
    }
  })

  ipcMain.handle('review-load', async (event, args: { sessionId: string }) => {
    try {
      if (!args || typeof args.sessionId !== 'string') {
        return { success: false, error: { message: 'Invalid session ID' } }
      }
      const history = await reviewManager.loadReview(args.sessionId)
      return { success: true, payload: history }
    } catch (err: any) {
      return { success: false, error: { message: err.message } }
    }
  })

  ipcMain.handle('review-export-html', async (event, args: { sessionId: string, history: any }) => {
    try {
      if (!mainWindow) return { success: false }
      if (!args || typeof args.sessionId !== 'string' || !args.history) {
        return { success: false, error: { message: 'Invalid export arguments' } }
      }
      const safeSessionId = args.sessionId.replace(/[^a-zA-Z0-9_-]/g, '')
      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Export HTML Report',
        defaultPath: `Security_Report_${safeSessionId}.html`,
        filters: [{ name: 'HTML Files', extensions: ['html'] }]
      })
      if (canceled || !filePath) return { success: false, error: { message: 'CANCELLED' } }
      
      const html = await reviewManager.generateHtmlReport(args.history)
      await writeFile(filePath, html, 'utf-8')
      return { success: true, payload: filePath }
    } catch (err: any) {
      return { success: false, error: { message: err.message } }
    }
  })

  ipcMain.handle('review-export-json', async (event, args: { sessionId: string, history: any }) => {
    try {
      if (!mainWindow) return { success: false }
      if (!args || typeof args.sessionId !== 'string' || !args.history) {
        return { success: false, error: { message: 'Invalid export arguments' } }
      }
      const safeSessionId = args.sessionId.replace(/[^a-zA-Z0-9_-]/g, '')
      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Export JSON Report',
        defaultPath: `Security_Report_${safeSessionId}.json`,
        filters: [{ name: 'JSON Files', extensions: ['json'] }]
      })
      if (canceled || !filePath) return { success: false, error: { message: 'CANCELLED' } }
      
      await writeFile(filePath, JSON.stringify(args.history, null, 2), 'utf-8')
      return { success: true, payload: filePath }
    } catch (err: any) {
      return { success: false, error: { message: err.message } }
    }
  })

  createWindow()

  app.commandLine.appendSwitch('disable-http-cache');

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('quit', () => {
  if (nativeProcess) {
    nativeProcess.kill()
  }
})

