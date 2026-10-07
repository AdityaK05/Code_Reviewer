/// <reference types="vite/client" />

interface NativeResponse {
  success: boolean
  requestId?: string
  payload?: any
  error?: {
    code: string
    message: string
  }
}

interface Window {
  codeReviewer: {
    native: {
      health: () => Promise<NativeResponse>
    },
    ingestion: {
      selectZip: () => Promise<NativeResponse>,
      selectFile: () => Promise<NativeResponse>,
      ingestPaste: (filename: string, content: string) => Promise<NativeResponse>
    },
    analysis: {
      start: (sessionId: string) => Promise<NativeResponse>
    },
    review: {
      save: (sessionId: string, history: any) => Promise<NativeResponse>,
      load: (sessionId: string) => Promise<NativeResponse>,
      exportHtml: (sessionId: string, history: any) => Promise<NativeResponse>,
      exportJson: (sessionId: string, history: any) => Promise<NativeResponse>
    }
  }
}
