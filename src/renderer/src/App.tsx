import React, { useEffect, useState } from 'react'
import { Activity, Shield, FileText, Settings, Home, AlertCircle, CheckCircle2 } from 'lucide-react'
import { IngestionUI } from './components/IngestionUI'
import { FindingsView } from './components/FindingsView'
import { DashboardView } from './components/DashboardView'
import { SettingsView } from './components/SettingsView'

function App(): React.ReactElement {
  const [nativeStatus, setNativeStatus] = useState<'checking' | 'connected' | 'error'>('checking')
  const [engineInfo, setEngineInfo] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState<string>('')
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'review' | 'findings' | 'settings'>('dashboard')
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [reviews, setReviews] = useState<Record<string, { status: string; note: string }>>({})

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

  const handleUpdateReview = (findingId: string, updates: any) => {
    const updated = {
      ...reviews,
      [findingId]: {
        ...(reviews[findingId] || { status: 'open', note: '' }),
        ...updates,
        updatedAt: new Date().toISOString()
      }
    }
    setReviews(updated)

    if (analysisResult?.sessionId) {
      window.codeReviewer.review.save(analysisResult.sessionId, {
        sessionId: analysisResult.sessionId,
        createdAt: new Date().toISOString(),
        analysisResult,
        reviews: updated
      }).catch(console.error)
    }
  }

  const handleExportHtml = async () => {
    if (!analysisResult?.sessionId) {
      alert('Please run a code review analysis first.')
      return
    }
    try {
      const res = await window.codeReviewer.review.exportHtml(analysisResult.sessionId, {
        sessionId: analysisResult.sessionId,
        createdAt: new Date().toISOString(),
        analysisResult,
        reviews
      })
      if (res.success && res.payload) {
        alert('HTML Report exported successfully to:\n' + res.payload)
      } else if (!res.success && res.error?.message !== 'CANCELLED') {
        alert('Export failed: ' + res.error?.message)
      }
    } catch (e: any) {
      alert('Export error: ' + e.message)
    }
  }

  const handleExportJson = async () => {
    if (!analysisResult?.sessionId) {
      alert('Please run a code review analysis first.')
      return
    }
    try {
      const res = await window.codeReviewer.review.exportJson(analysisResult.sessionId, {
        sessionId: analysisResult.sessionId,
        createdAt: new Date().toISOString(),
        analysisResult,
        reviews
      })
      if (res.success && res.payload) {
        alert('JSON Report exported successfully to:\n' + res.payload)
      } else if (!res.success && res.error?.message !== 'CANCELLED') {
        alert('Export failed: ' + res.error?.message)
      }
    } catch (e: any) {
      alert('Export error: ' + e.message)
    }
  }

  const findingsCount = analysisResult?.findings?.length || 0

  return (
    <div className="flex h-screen bg-[#0B0E14] text-gray-200 font-sans antialiased overflow-hidden selection:bg-blue-500/20">

      {/* Sidebar */}
      <aside className="w-64 glass flex flex-col justify-between">
        <div>
          {/* Logo Header */}
          <div className="h-14 flex items-center px-4 border-b border-white/5">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mr-2.5">
              <Shield className="w-4 h-4 text-blue-400" />
            </div>
            <span className="font-semibold text-white tracking-tight text-sm">Code_Reviewer</span>
            <span className="ml-auto text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/10 px-1.5 py-0.5 rounded font-mono">
              v0.1.0
            </span>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Home className="w-4 h-4 mr-3" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('review')}
              className={`w-full flex items-center px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'review'
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                  : 'text-gray-400 hover:bg-gray-800/40 hover:text-gray-200'
              }`}
            >
              <FileText className="w-4 h-4 mr-3" />
              <span>Code Review</span>
            </button>

            <button
              onClick={() => setActiveTab('findings')}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'findings'
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                  : 'text-gray-400 hover:bg-gray-800/40 hover:text-gray-200'
              }`}
            >
              <div className="flex items-center">
                <Activity className="w-4 h-4 mr-3" />
                <span>Findings</span>
              </div>
              {findingsCount > 0 && (
                <span className="text-[10px] bg-orange-950 text-orange-400 border border-orange-800/60 px-1.5 py-0.5 rounded-full font-mono font-semibold">
                  {findingsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'settings'
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                  : 'text-gray-400 hover:bg-gray-800/40 hover:text-gray-200'
              }`}
            >
              <Settings className="w-4 h-4 mr-3" />
              <span>Settings</span>
            </button>
          </nav>
        </div>

        {/* Engine Status Area in Footer */}
        <div className="p-3 border-t border-gray-800 bg-[#0D1117]/80">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              <span>Native Engine</span>
              <span className={`w-1.5 h-1.5 rounded-full ${nativeStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>

            {nativeStatus === 'checking' && (
              <div className="flex items-center text-xs text-yellow-500">
                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse mr-2" />
                Checking connection...
              </div>
            )}

            {nativeStatus === 'connected' && (
              <div className="flex flex-col">
                <div className="flex items-center text-xs text-green-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" /> Connected
                </div>
                {engineInfo && (
                  <div className="text-[10px] text-gray-500 pl-5 truncate font-mono">
                    {engineInfo.engine} v{engineInfo.version}
                  </div>
                )}
              </div>
            )}

            {nativeStatus === 'error' && (
              <div className="flex flex-col">
                <div className="flex items-center text-xs text-red-400 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" /> Unavailable
                </div>
                <div className="text-[10px] text-red-400/70 pl-5 truncate">
                  {errorMsg}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0E1116]">
        {/* Header Bar */}
        <header className="h-14 border-b border-gray-800 flex items-center justify-between px-6 bg-[#0E1116]">
          <h2 className="text-sm font-semibold text-gray-200 capitalize tracking-tight">
            {activeTab === 'dashboard' && 'Dashboard Overview'}
            {activeTab === 'review' && 'Code Review Workspace'}
            {activeTab === 'findings' && 'Security Findings & Audit'}
            {activeTab === 'settings' && 'Engine & AI Settings'}
          </h2>

          <div className="flex items-center gap-2">
            {findingsCount > 0 && activeTab !== 'findings' && (
              <button
                onClick={() => setActiveTab('findings')}
                className="text-xs px-3 py-1 bg-orange-950/40 text-orange-400 border border-orange-800/50 rounded-lg hover:bg-orange-900/30 transition flex items-center gap-1.5"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>{findingsCount} Findings Detected</span>
              </button>
            )}
          </div>
        </header>
        
        {/* Page Tab Body */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-5xl mx-auto space-y-6">
            
            {activeTab === 'dashboard' && (
              <DashboardView
                nativeStatus={nativeStatus}
                engineInfo={engineInfo}
                analysisResult={analysisResult}
                onNavigate={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'review' && (
              <IngestionUI
                onAnalysisComplete={(res) => {
                  setAnalysisResult(res)
                  setActiveTab('findings')
                }}
                onNavigateToFindings={() => setActiveTab('findings')}
              />
            )}

            {activeTab === 'findings' && (
              <FindingsView
                analysisResult={analysisResult}
                reviews={reviews}
                onUpdateReview={handleUpdateReview}
                onExportHtml={handleExportHtml}
                onExportJson={handleExportJson}
                onNavigateToReview={() => setActiveTab('review')}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                engineInfo={engineInfo}
                nativeStatus={nativeStatus}
                errorMsg={errorMsg}
              />
            )}

          </div>
        </div>
      </main>
    </div>
  )
}

export default App
