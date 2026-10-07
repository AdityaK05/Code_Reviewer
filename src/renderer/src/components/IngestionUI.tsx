import React, { useState } from 'react'
import { Folder, File, Clipboard, Upload, X } from 'lucide-react'

export function IngestionUI() {
  const [status, setStatus] = useState<string>('idle') // idle, ingesting, success, error
  const [manifest, setManifest] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState<string>('')
  
  const [pasteMode, setPasteMode] = useState(false)
  const [pasteFilename, setPasteFilename] = useState('')
  const [pasteContent, setPasteContent] = useState('')

  const [reviews, setReviews] = useState<Record<string, { status: string, note: string }>>({})

  const handleZip = async () => {
    setStatus('ingesting')
    try {
      const res = await window.codeReviewer.ingestion.selectZip()
      if (res.success && res.payload) {
        setManifest(res.payload)
        setStatus('success')
      } else {
        if (res.error?.message === 'CANCELLED') {
          setStatus('idle')
        } else {
          setErrorMsg(res.error?.message || 'Failed to ingest ZIP')
          setStatus('error')
        }
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Error occurred')
      setStatus('error')
    }
  }

  const handleFile = async () => {
    setStatus('ingesting')
    try {
      const res = await window.codeReviewer.ingestion.selectFile()
      if (res.success && res.payload) {
        setManifest(res.payload)
        setStatus('success')
      } else {
        if (res.error?.message === 'CANCELLED') {
          setStatus('idle')
        } else {
          setErrorMsg(res.error?.message || 'Failed to ingest file')
          setStatus('error')
        }
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Error occurred')
      setStatus('error')
    }
  }

  const handlePaste = async () => {
    if (!pasteFilename.trim() || !pasteContent.trim()) return
    setStatus('ingesting')
    try {
      const res = await window.codeReviewer.ingestion.ingestPaste(pasteFilename, pasteContent)
      if (res.success && res.payload) {
        setManifest(res.payload)
        setStatus('success')
        setPasteMode(false)
      } else {
        setErrorMsg(res.error?.message || 'Failed to ingest paste')
        setStatus('error')
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Error occurred')
      setStatus('error')
    }
  }

  const [analysisStatus, setAnalysisStatus] = useState<string>('idle')
  const [analysisResult, setAnalysisResult] = useState<any>(null)

  const handleAnalysis = async () => {
    setAnalysisStatus('analyzing')
    try {
      const res = await window.codeReviewer.analysis.start(manifest.sessionId)
      if (res.success) {
        setAnalysisResult(res.payload)
        setAnalysisStatus('done')
      } else {
        setErrorMsg(res.error?.message || 'Analysis failed')
        setAnalysisStatus('error')
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Error occurred during analysis')
      setAnalysisStatus('error')
    }
  }

  const saveHistory = async (newReviews = reviews) => {
    try {
      await window.codeReviewer.review.save(manifest.sessionId, {
        sessionId: manifest.sessionId,
        createdAt: new Date().toISOString(),
        analysisResult,
        reviews: newReviews
      })
    } catch(e) {
      console.error(e)
    }
  }

  const updateReview = (findingId: string, updates: any) => {
    const newReviews = {
      ...reviews,
      [findingId]: { ...(reviews[findingId] || { status: 'open', note: '' }), ...updates, updatedAt: new Date().toISOString() }
    }
    setReviews(newReviews)
    saveHistory(newReviews)
  }

  const exportHtml = async () => {
    try {
      const res = await window.codeReviewer.review.exportHtml(manifest.sessionId, {
        sessionId: manifest.sessionId,
        createdAt: new Date().toISOString(),
        analysisResult,
        reviews
      })
      if (res.success && res.payload) {
        alert('HTML Export successful: ' + res.payload)
      } else if (!res.success && res.error?.message !== 'CANCELLED') {
        alert('Export failed: ' + res.error?.message)
      }
    } catch (e: any) {
      alert('Error: ' + e.message)
    }
  }

  const exportJson = async () => {
    try {
      const res = await window.codeReviewer.review.exportJson(manifest.sessionId, {
        sessionId: manifest.sessionId,
        createdAt: new Date().toISOString(),
        analysisResult,
        reviews
      })
      if (res.success && res.payload) {
        alert('JSON Export successful: ' + res.payload)
      } else if (!res.success && res.error?.message !== 'CANCELLED') {
        alert('Export failed: ' + res.error?.message)
      }
    } catch (e: any) {
      alert('Error: ' + e.message)
    }
  }

  if (status === 'success' && manifest) {
    if (analysisStatus === 'done' && analysisResult) {
      return (
        <div className="bg-[#161B22] border border-gray-800 rounded-lg p-6 space-y-4">
          <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-4">
            <h3 className="text-lg font-medium text-green-400">Analysis Complete</h3>
            <div className="flex gap-2">
              <button 
                onClick={exportHtml}
                className="text-xs px-3 py-1 bg-blue-900/50 hover:bg-blue-800/50 text-blue-300 rounded transition"
              >
                Export HTML
              </button>
              <button 
                onClick={exportJson}
                className="text-xs px-3 py-1 bg-purple-900/50 hover:bg-purple-800/50 text-purple-300 rounded transition"
              >
                Export JSON
              </button>
              <button 
                onClick={() => { setStatus('idle'); setManifest(null); setAnalysisStatus('idle'); setAnalysisResult(null); setReviews({}); }}
                className="text-xs px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition"
              >
                Close Analysis
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-4 text-sm text-gray-400 mb-6">
            <div><span className="text-gray-500 block mb-1">Duration</span> {analysisResult.durationMs}ms</div>
            <div><span className="text-gray-500 block mb-1">Analyzed Files</span> {analysisResult.analyzedFiles}</div>
            <div><span className="text-gray-500 block mb-1">Skipped Files</span> {analysisResult.skippedFiles}</div>
            <div><span className="text-gray-500 block mb-1">Findings</span> {analysisResult.findings?.length || 0}</div>
          </div>

          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-200">Findings</h4>
            {(!analysisResult.findings || analysisResult.findings.length === 0) ? (
              <div className="text-sm text-gray-500">No findings detected.</div>
            ) : (
              analysisResult.findings.map((f: any) => (
                <div key={f.id} className="bg-[#0D1117] border border-gray-800 rounded p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        f.risk === 'critical' ? 'bg-red-900/50 text-red-400' :
                        f.risk === 'high' ? 'bg-orange-900/50 text-orange-400' :
                        f.risk === 'medium' ? 'bg-yellow-900/50 text-yellow-400' :
                        'bg-blue-900/50 text-blue-400'
                      }`}>RISK: {f.risk?.toUpperCase() || f.severity?.toUpperCase()}</span>
                      <span className="text-xs text-gray-500 border border-gray-700 px-2 py-1 rounded">
                        CONFIDENCE: {f.confidence?.toUpperCase()}
                      </span>
                      <span className="text-sm font-semibold text-gray-200">{f.ruleId}: {f.title}</span>
                    </div>
                    <span className="text-xs text-gray-500">{f.file}:{f.line}</span>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">{f.description}</p>
                  <div className="bg-black/50 p-2 rounded text-xs font-mono text-gray-300 border border-gray-800 overflow-x-auto mb-2">
                    {f.evidence.snippet}
                  </div>
                  
                  {f.aiAssessment && (
                    <div className="mt-4 p-3 bg-blue-950/20 border border-blue-900/30 rounded">
                      <div className="flex items-center mb-2">
                        <span className="text-xs font-bold text-blue-400 uppercase tracking-wide mr-2">AI-Assisted Analysis</span>
                        <span className="text-[10px] bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded">Mock Provider</span>
                      </div>
                      <div className="space-y-2 text-sm text-gray-300">
                        <p><span className="text-gray-500">Why this matters:</span> {f.aiAssessment.explanation}</p>
                        <p><span className="text-gray-500">Potential impact:</span> {f.aiAssessment.impact}</p>
                        <p><span className="text-gray-500">Remediation:</span> {f.aiAssessment.recommendation}</p>
                      </div>
                    </div>
                  )}

                    {!f.aiAssessment && (
                      <div className="mt-2 text-xs text-green-500/70">
                        💡 {f.recommendation}
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-gray-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-400">Review Status</span>
                        <div className="flex bg-[#161B22] rounded border border-gray-700 overflow-hidden text-xs">
                          {['open', 'reviewed', 'dismissed', 'false_positive'].map(s => (
                            <button
                              key={s}
                              onClick={() => updateReview(f.id, { status: s })}
                              className={`px-3 py-1 ${
                                (reviews[f.id]?.status || 'open') === s 
                                ? 'bg-blue-600 text-white' 
                                : 'text-gray-400 hover:bg-gray-800'
                              }`}
                            >
                              {s.replace('_', ' ').toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                      <textarea
                        placeholder="Add review notes..."
                        value={reviews[f.id]?.note || ''}
                        onChange={e => updateReview(f.id, { note: e.target.value })}
                        className="w-full bg-[#161B22] border border-gray-700 rounded p-2 text-sm text-gray-300 outline-none focus:border-blue-500 resize-y"
                        rows={2}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          
          {analysisResult.correlations && analysisResult.correlations.length > 0 && (
            <div className="mt-6 space-y-4">
              <h4 className="text-md font-medium text-gray-200">Related Findings</h4>
              {analysisResult.correlations.map((c: any) => (
                <div key={c.id} className="bg-[#161B22] border border-gray-700 rounded p-4">
                  <div className="text-sm font-semibold text-gray-200 mb-1">{c.title}</div>
                  <div className="text-xs text-gray-400 mb-3">{c.rationale}</div>
                  <div className="pl-4 border-l-2 border-gray-700 space-y-1">
                    {c.findingIds.map((fid: string) => (
                      <div key={fid} className="text-xs font-mono text-gray-500">{fid}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="bg-[#161B22] border border-gray-800 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-green-400">Project Ready for Review</h3>
          <button 
            onClick={() => { setStatus('idle'); setManifest(null); setAnalysisStatus('idle'); }}
            className="text-xs px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition"
          >
            Reset
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-400 mb-6">
          <div><span className="text-gray-500 block mb-1">Source Type</span> {manifest.sourceType}</div>
          <div><span className="text-gray-500 block mb-1">Session ID</span> <span className="font-mono text-xs">{manifest.sessionId.split('-')[0]}</span></div>
          <div><span className="text-gray-500 block mb-1">Total Files</span> {manifest.summary.totalFiles}</div>
          <div><span className="text-gray-500 block mb-1">Source/Config Files</span> {manifest.summary.sourceFiles} / {manifest.summary.configFiles}</div>
        </div>
        
        {analysisStatus === 'error' && (
          <div className="mb-4 p-3 bg-red-950/50 border border-red-900/50 text-red-400 text-sm rounded">
            {errorMsg}
          </div>
        )}

        <button 
          onClick={handleAnalysis}
          disabled={analysisStatus === 'analyzing'}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-lg transition"
        >
          {analysisStatus === 'analyzing' ? 'Analyzing Source Code...' : 'Start Static Analysis'}
        </button>
      </div>
    )
  }

  return (
    <div className="bg-[#161B22] border border-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-100 mb-4">Import Project</h3>
      
      {status === 'error' && (
        <div className="mb-4 p-3 bg-red-950/50 border border-red-900/50 text-red-400 text-sm rounded flex justify-between items-center">
          <span>{errorMsg}</span>
          <button onClick={() => setStatus('idle')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {status === 'ingesting' ? (
        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
          <Upload className="w-8 h-8 mb-4 animate-bounce" />
          <p>Processing secure ingestion...</p>
        </div>
      ) : pasteMode ? (
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Filename</label>
            <input 
              type="text" 
              placeholder="e.g. main.cpp" 
              value={pasteFilename}
              onChange={e => setPasteFilename(e.target.value)}
              className="w-full bg-[#0D1117] border border-gray-700 rounded p-2 text-sm text-gray-200 outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Source Code</label>
            <textarea 
              rows={8}
              value={pasteContent}
              onChange={e => setPasteContent(e.target.value)}
              className="w-full bg-[#0D1117] border border-gray-700 rounded p-2 text-sm text-gray-200 font-mono outline-none focus:border-blue-500 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button 
              onClick={() => setPasteMode(false)}
              className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200"
            >
              Cancel
            </button>
            <button 
              onClick={handlePaste}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded transition disabled:opacity-50"
              disabled={!pasteFilename.trim() || !pasteContent.trim()}
            >
              Ingest Paste
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <button 
            onClick={handleZip}
            className="flex flex-col items-center justify-center p-6 border border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-500/10 transition-colors group"
          >
            <Folder className="w-8 h-8 text-gray-400 group-hover:text-blue-400 mb-3" />
            <span className="text-sm font-medium text-gray-300 group-hover:text-blue-300">ZIP Project</span>
            <span className="text-xs text-gray-500 mt-2 text-center">Select an archive to safely extract</span>
          </button>
          
          <button 
            onClick={handleFile}
            className="flex flex-col items-center justify-center p-6 border border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-500/10 transition-colors group"
          >
            <File className="w-8 h-8 text-gray-400 group-hover:text-blue-400 mb-3" />
            <span className="text-sm font-medium text-gray-300 group-hover:text-blue-300">Single File</span>
            <span className="text-xs text-gray-500 mt-2 text-center">Select an individual source file</span>
          </button>

          <button 
            onClick={() => setPasteMode(true)}
            className="flex flex-col items-center justify-center p-6 border border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-500/10 transition-colors group"
          >
            <Clipboard className="w-8 h-8 text-gray-400 group-hover:text-blue-400 mb-3" />
            <span className="text-sm font-medium text-gray-300 group-hover:text-blue-300">Paste Code</span>
            <span className="text-xs text-gray-500 mt-2 text-center">Paste code snippet directly</span>
          </button>
        </div>
      )}
    </div>
  )
}
