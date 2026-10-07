import React, { useEffect, useState } from 'react'
import { Activity, Shield, FileText, Settings, Home, AlertCircle, CheckCircle2 } from 'lucide-react'
import { IngestionUI } from './components/IngestionUI'

function App(): JSX.Element {
  const [nativeStatus, setNativeStatus] = useState<'checking' | 'connected' | 'error'>('checking')
  const [engineInfo, setEngineInfo] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState<string>('')

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await window.codeReviewer.native.health()
        if (res.success && res.payload) {
          setNativeStatus('connected')
          setEngineInfo(res.payload)
        } else {
          setNativeStatus('error')
          setErrorMsg(res.error?.message || 'Unknown error')
        }
      } catch (err: any) {
        setNativeStatus('error')
        setErrorMsg(err.message || 'IPC failure')
      }
    }
    
    // Initial check
    checkHealth()
    
    // Periodic check
    const interval = setInterval(checkHealth, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex h-screen bg-[#0E1116] text-gray-300 font-sans antialiased overflow-hidden selection:bg-blue-500/30">
      
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-800 bg-[#161B22] flex flex-col">
        <div className="h-14 flex items-center px-4 border-b border-gray-800">
          <Shield className="w-5 h-5 text-blue-500 mr-2" />
          <span className="font-semibold text-gray-100 tracking-tight">Code_Reviewer</span>
        </div>
        
        <nav className="flex-1 py-4 px-2 space-y-1">
          <a href="#" className="flex items-center px-3 py-2 text-sm font-medium bg-gray-800/50 text-gray-100 rounded-md">
            <Home className="w-4 h-4 mr-3 text-gray-400" /> Dashboard
          </a>
          <a href="#" className="flex items-center px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800/30 hover:text-gray-200 rounded-md transition-colors">
            <FileText className="w-4 h-4 mr-3" /> Code Review
          </a>
          <a href="#" className="flex items-center px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800/30 hover:text-gray-200 rounded-md transition-colors">
            <Activity className="w-4 h-4 mr-3" /> Findings
          </a>
        </nav>

        {/* Engine Status Area */}
        <div className="p-4 border-t border-gray-800 bg-[#0D1117]">
          <div className="flex flex-col gap-2">
            <div className="flex items-center text-xs font-medium uppercase tracking-wider text-gray-500">
              Native Engine Status
            </div>
            {nativeStatus === 'checking' && (
              <div className="flex items-center text-sm text-yellow-500">
                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse mr-2" />
                Checking connection...
              </div>
            )}
            {nativeStatus === 'connected' && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center text-sm text-green-500">
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Connected
                </div>
                {engineInfo && (
                  <div className="text-xs text-gray-500 pl-6">
                    {engineInfo.engine} v{engineInfo.version} ({engineInfo.platform})
                  </div>
                )}
              </div>
            )}
            {nativeStatus === 'error' && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center text-sm text-red-500">
                  <AlertCircle className="w-4 h-4 mr-2" /> Unavailable
                </div>
                <div className="text-xs text-red-400/70 pl-6">
                  {errorMsg}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="p-2 border-t border-gray-800">
          <a href="#" className="flex items-center px-3 py-2 text-sm font-medium text-gray-400 hover:text-gray-200 rounded-md">
            <Settings className="w-4 h-4 mr-3" /> Settings
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0E1116]">
        <header className="h-14 border-b border-gray-800 flex items-center px-6 bg-[#0E1116]">
          <h2 className="text-sm font-medium text-gray-200">Dashboard</h2>
        </header>
        
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            
            <IngestionUI />

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#161B22] border border-gray-800 rounded-lg p-5">
                <div className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">Security Constraints</div>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li className="flex items-center"><CheckCircle2 className="w-4 h-4 text-green-500 mr-2"/> Context Isolation Enforced</li>
                  <li className="flex items-center"><CheckCircle2 className="w-4 h-4 text-green-500 mr-2"/> Node Integration Disabled</li>
                  <li className="flex items-center"><CheckCircle2 className="w-4 h-4 text-green-500 mr-2"/> Minimal Preload API</li>
                  <li className="flex items-center"><CheckCircle2 className="w-4 h-4 text-green-500 mr-2"/> Sandbox Enabled</li>
                </ul>
              </div>

              <div className="bg-[#161B22] border border-gray-800 rounded-lg p-5">
                <div className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">Bridge Diagnostics</div>
                <div className="bg-black/40 rounded p-3 text-xs font-mono text-gray-300 overflow-x-auto">
                  {nativeStatus === 'connected' ? (
                    <pre>{JSON.stringify(engineInfo, null, 2)}</pre>
                  ) : (
                    <span className="text-gray-600">No telemetry available.</span>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}

export default App
