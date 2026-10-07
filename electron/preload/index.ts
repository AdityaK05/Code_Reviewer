import { contextBridge, ipcRenderer } from 'electron'

// Define the shape of the NativeResponse
interface NativeResponse {
  success: boolean
  requestId?: string
  payload?: any
  error?: {
    code: string
    message: string
  }
}

// Minimal secure exposed API
const api = {
  native: {
    health: (): Promise<NativeResponse> => {
      return ipcRenderer.invoke('native-request', { operation: 'health' })
    }
  },
  ingestion: {
    selectZip: (): Promise<NativeResponse> => {
      return ipcRenderer.invoke('ingest-select-zip')
    },
    selectFile: (): Promise<NativeResponse> => {
      return ipcRenderer.invoke('ingest-select-file')
    },
    ingestPaste: (filename: string, content: string): Promise<NativeResponse> => {
      return ipcRenderer.invoke('ingest-paste', { filename, content })
    }
  },
  analysis: {
    start: (sessionId: string): Promise<NativeResponse> => {
      return ipcRenderer.invoke('analysis-start', { sessionId })
    }
  },
  review: {
    save: (sessionId: string, history: any): Promise<NativeResponse> => {
      return ipcRenderer.invoke('review-save', { sessionId, history })
    },
    load: (sessionId: string): Promise<NativeResponse> => {
      return ipcRenderer.invoke('review-load', { sessionId })
    },
    exportHtml: (sessionId: string, history: any): Promise<NativeResponse> => {
      return ipcRenderer.invoke('review-export-html', { sessionId, history })
    },
    exportJson: (sessionId: string, history: any): Promise<NativeResponse> => {
      return ipcRenderer.invoke('review-export-json', { sessionId, history })
    }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('codeReviewer', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.codeReviewer = api
}
