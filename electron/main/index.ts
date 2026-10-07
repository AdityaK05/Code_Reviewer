import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { spawn, ChildProcess } from 'child_process'
import { randomUUID } from 'crypto'
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

function startNativeProcess() {
  const isDev = !app.isPackaged
  const executableName = process.platform === 'win32' ? 'CodeReviewerEngine.exe' : 'CodeReviewerEngine'
  
  const executablePath = isDev
    ? join(__dirname, '../../native/build/Debug', executableName)
    : join(process.resourcesPath, 'native', executableName)

  try {
    nativeProcess = spawn(executablePath, [], {
      stdio: ['pipe', 'pipe', 'pipe']
    })

    if (!nativeProcess.stdout || !nativeProcess.stdin) {
      console.error('Failed to bind standard I/O to native process')
      return
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
  } catch (err) {
    console.error('Failed to spawn native process', err)
  }
}

function sendNativeRequest(operation: string, payload?: any): Promise<any> {
  return new Promise((resolve) => {
    if (!nativeProcess || !nativeProcess.stdin) {
      resolve({
        success: false,
        error: { code: 'ENGINE_UNAVAILABLE', message: 'Native engine is not running' }
      })
      return
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
    }, 5000)
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
  mainWindow.webContents.setWindowOpenHandler((details) => {
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
      const { manifest } = await ingestionService.ingestPaste(args.filename, args.content)
      return { success: true, payload: manifest }
    } catch (err: any) {
      return { success: false, error: { code: err.message, message: err.message } }
    }
  })

  ipcMain.handle('analysis-start', async (event, args: { sessionId: string }) => {
    try {
      // 1. Get session info securely
      const session = ingestionService.getWorkspaceManager().getSession(args.sessionId)
      if (!session) {
        return { success: false, error: { code: 'INVALID_SESSION', message: 'Session not found or invalid' } }
      }

      // 2. Validate manifest exists
      const manifestPath = join(session.workspacePath, 'manifest.json')
      const fs = require('fs')
      if (!fs.existsSync(manifestPath)) {
        return { success: false, error: { code: 'NO_MANIFEST', message: 'Manifest missing' } }
      }

      const manifestStr = fs.readFileSync(manifestPath, 'utf8')
      const manifest = JSON.parse(manifestStr)

      // 3. Send to C++ native engine
      const payload = {
        sessionId: args.sessionId,
        workspacePath: session.workspacePath,
        manifest: manifest
      }

      // We need to temporarily increase the timeout for analysis requests
      const nativeResponse = await sendNativeRequest('analyze', payload)
      
      if (!nativeResponse.success) {
        return nativeResponse;
      }

      // 4. Deep AI Scan (if API key is present)
      const aiAgent = new DeepAIAgent()
      const aiFindings = await aiAgent.scanProject(session.workspacePath, manifest)
      
      // Merge deterministic C++ findings with AI findings
      nativeResponse.payload.findings = [
        ...(nativeResponse.payload.findings || []),
        ...aiFindings
      ]

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
      await reviewManager.saveReview(args.sessionId, args.history)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: { message: err.message } }
    }
  })

  ipcMain.handle('review-load', async (event, args: { sessionId: string }) => {
    try {
      const history = await reviewManager.loadReview(args.sessionId)
      return { success: true, payload: history }
    } catch (err: any) {
      return { success: false, error: { message: err.message } }
    }
  })

  ipcMain.handle('review-export-html', async (event, args: { sessionId: string, history: any }) => {
    try {
      if (!mainWindow) return { success: false }
      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Export HTML Report',
        defaultPath: `Security_Report_${args.sessionId}.html`,
        filters: [{ name: 'HTML Files', extensions: ['html'] }]
      })
      if (canceled || !filePath) return { success: false, error: { message: 'CANCELLED' } }
      
      const html = await reviewManager.generateHtmlReport(args.history)
      const { writeFile } = require('fs/promises')
      await writeFile(filePath, html, 'utf-8')
      return { success: true, payload: filePath }
    } catch (err: any) {
      return { success: false, error: { message: err.message } }
    }
  })

  ipcMain.handle('review-export-json', async (event, args: { sessionId: string, history: any }) => {
    try {
      if (!mainWindow) return { success: false }
      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Export JSON Report',
        defaultPath: `Security_Report_${args.sessionId}.json`,
        filters: [{ name: 'JSON Files', extensions: ['json'] }]
      })
      if (canceled || !filePath) return { success: false, error: { message: 'CANCELLED' } }
      
      const { writeFile } = require('fs/promises')
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

