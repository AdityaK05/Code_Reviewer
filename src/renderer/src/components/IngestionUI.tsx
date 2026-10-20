import React, { useState } from 'react'
import { Folder, File, Clipboard, Upload, X, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react'

interface IngestionUIProps {
  onAnalysisComplete?: (result: any) => void
  onNavigateToFindings?: () => void
}

export function IngestionUI({
  onAnalysisComplete,
  onNavigateToFindings
}: IngestionUIProps): React.ReactElement {
  const [status, setStatus] = useState<string>('idle') // idle, ingesting, success, error
  const [manifest, setManifest] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState<string>('')
  
  const [pasteMode, setPasteMode] = useState(false)
  const [pasteFilename, setPasteFilename] = useState('')
  const [pasteContent, setPasteContent] = useState('')

  const [analysisStatus, setAnalysisStatus] = useState<string>('idle')
  const [analysisResult, setAnalysisResult] = useState<any>(null)

  const handleZip = async () => {
    setStatus('ingesting')
    try {
      const res = await window.codeReviewer.ingestion.selectZip()
      if (res.success && res.payload) {
        setManifest(res.payload)
        setStatus('success')
        setAnalysisStatus('idle')
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
        setAnalysisStatus('idle')
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
        setAnalysisStatus('idle')
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

  const loadSampleCpp = () => {
    setPasteMode(true)
    setPasteFilename('security_sample.cpp')
    setPasteContent(`// CodeReviewer Security Test Sample
#include <iostream>
#include <cstring>
#include <cstdlib>

void execute_task(const char* userInput) {
    char localBuffer[32];

    // Security Issue 1: Buffer Overflow (CR001)
    strcpy(localBuffer, userInput);

    // Security Issue 2: Dangerous Command Execution (CR004)
    std::string command = std::string("ping -c 1 ") + localBuffer;
    system(command.c_str());

    // Security Issue 3: Hardcoded Secret (CR005)
    const char* apiKey = "sk-proj-4918249182491829481924819";
    std::cout << "Authenticated with: " << apiKey << std::endl;
}
`)
  }

  const loadSampleJs = () => {
    setPasteMode(true)
    setPasteFilename('server_sample.js')
    setPasteContent(`// CodeReviewer Node/JS Security Test Sample
const apiKey = "sk-ant-api03-abcdef1234567890abcdef";

function handleClient(req) {
    const input = req.query.cmd;

    // Security Issue 1: Arbitrary Code Injection (CR004)
    eval(input);

    // Security Issue 2: Command Execution (CR004)
    const { exec } = require('child_process');
    exec("cat " + req.query.file);
}
`)
  }

  const handleAnalysis = async () => {
    if (!manifest?.sessionId) return
    setAnalysisStatus('analyzing')
    try {
      const res = await window.codeReviewer.analysis.start(manifest.sessionId)
      if (res.success && res.payload) {
        setAnalysisResult(res.payload)
        setAnalysisStatus('done')
        if (onAnalysisComplete) {
          onAnalysisComplete(res.payload)
        }
      } else {
        setErrorMsg(res.error?.message || 'Analysis failed')
        setAnalysisStatus('error')
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Error occurred during analysis')
      setAnalysisStatus('error')
    }
  }

  if (status === 'success' && manifest) {
    return (
      <div className="glass rounded-xl p-6 space-y-6">
        <div className="flex justify-between items-center pb-4 border-b border-white/5">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span>Project Loaded</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Source: <span className="text-white capitalize font-medium">{manifest.sourceType}</span> | Session: <span className="font-mono text-gray-300">{manifest.sessionId.split('-')[0]}</span>
            </p>
          </div>

          <button
            onClick={() => { setStatus('idle'); setManifest(null); setAnalysisStatus('idle'); setAnalysisResult(null); }}
            className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition"
          >
            Import Another
          </button>
        </div>

        {/* Manifest Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-black/20 p-3 rounded-lg border border-white/5">
            <span className="text-gray-500 block mb-1">Total Files</span>
            <span className="text-sm font-semibold text-white">{manifest.summary.totalFiles}</span>
          </div>
          <div className="bg-black/20 p-3 rounded-lg border border-white/5">
            <span className="text-gray-500 block mb-1">Source Files</span>
            <span className="text-sm font-semibold text-blue-400">{manifest.summary.sourceFiles}</span>
          </div>
          <div className="bg-black/20 p-3 rounded-lg border border-white/5">
            <span className="text-gray-500 block mb-1">Config Files</span>
            <span className="text-sm font-semibold text-white">{manifest.summary.configFiles}</span>
          </div>
          <div className="bg-black/20 p-3 rounded-lg border border-white/5">
            <span className="text-gray-500 block mb-1">Status</span>
            <span className={`text-sm font-semibold ${analysisStatus === 'done' ? 'text-green-400' : 'text-yellow-400'}`}>
              {analysisStatus === 'done' ? 'Analyzed' : 'Pending Scan'}
            </span>
          </div>
        </div>

        {/* Files Preview list */}
        {manifest.files && manifest.files.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-gray-400">Included Source Files:</div>
            <div className="max-h-36 overflow-y-auto bg-black/20 rounded-lg border border-white/5 p-2 space-y-1">
              {manifest.files.map((file: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center text-xs py-1 px-2 hover:bg-white/5 rounded">
                  <span className="font-mono text-gray-300">{file.relativePath}</span>
                  <span className="text-gray-500 text-[11px] uppercase bg-white/5 px-1.5 py-0.5 rounded">{file.language}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {analysisStatus === 'error' && (
          <div className="p-3 bg-red-900/20 border border-red-900/30 text-red-300 text-xs rounded-lg">
            {errorMsg}
          </div>
        )}

        {analysisStatus === 'done' && analysisResult ? (
          <div className="bg-gradient-to-r from-blue-900/20 to-green-900/20 border border-green-800/20 rounded-xl p-5 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm font-semibold text-green-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Static Analysis Complete
                </span>
                <p className="text-xs text-gray-400 mt-0.5">
                  Identified <strong>{analysisResult.findings?.length || 0} findings</strong> across {analysisResult.analyzedFiles} file(s) in {analysisResult.durationMs}ms.
                </p>
              </div>

              {onNavigateToFindings && (
                <button
                  onClick={onNavigateToFindings}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-lg transition shadow-lg shadow-blue-900/20"
                >
                  <span>Explore Findings</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={handleAnalysis}
            disabled={analysisStatus === 'analyzing'}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
          >
            {analysisStatus === 'analyzing' ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Running C++ Static Analysis & AI Reasoner...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-blue-200" />
                <span>Start Static Analysis</span>
              </>
            )}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="glass rounded-xl p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-white/5">
        <div>
          <h3 className="text-lg font-semibold text-white">Code Review Workspace</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Select a project ZIP archive, an individual source file, or paste code to analyze.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadSampleCpp}
            className="text-[11px] px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-blue-300 rounded-lg border border-white/5 transition"
          >
            + Sample C++
          </button>
          <button
            onClick={loadSampleJs}
            className="text-[11px] px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-yellow-300 rounded-lg border border-white/5 transition"
          >
            + Sample JS
          </button>
        </div>
      </div>

      {status === 'error' && (
        <div className="p-3 bg-red-900/20 border border-red-900/30 text-red-300 text-xs rounded-lg flex justify-between items-center">
          <span>{errorMsg}</span>
          <button onClick={() => setStatus('idle')}><X className="w-4 h-4 text-red-400" /></button>
        </div>
      )}

      {status === 'ingesting' ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400 space-y-3">
          <Upload className="w-8 h-8 text-blue-500 animate-bounce" />
          <p className="text-sm font-medium text-gray-300">Extracting and validating source files safely...</p>
          <p className="text-xs text-gray-500">Checking Zip Slip path boundaries and size constraints</p>
        </div>
      ) : pasteMode ? (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Source File Name</label>
            <input
              type="text"
              placeholder="e.g. main.cpp or app.js"
              value={pasteFilename}
              onChange={e => setPasteFilename(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-xs text-white outline-none focus:border-blue-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Code Content</label>
            <textarea
              rows={10}
              placeholder="// Paste source code here..."
              value={pasteContent}
              onChange={e => setPasteContent(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-xs text-white font-mono outline-none focus:border-blue-500 resize-y"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setPasteMode(false)}
              className="px-4 py-2 text-xs text-gray-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              onClick={handlePaste}
              className="px-5 py-2 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition disabled:opacity-50 shadow-lg shadow-blue-900/20"
              disabled={!pasteFilename.trim() || !pasteContent.trim()}
            >
              Load Code for Review
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleZip}
            className="flex flex-col items-center justify-center p-6 border border-white/5 rounded-xl hover:border-blue-500/50 hover:bg-blue-500/5 transition group text-center"
          >
            <Folder className="w-8 h-8 text-gray-500 group-hover:text-blue-400 mb-2 transition" />
            <span className="text-sm font-medium text-gray-200 group-hover:text-blue-300">ZIP Archive</span>
            <span className="text-[11px] text-gray-500 mt-1">Select an archive (.zip) with path validation</span>
          </button>

          <button
            onClick={handleFile}
            className="flex flex-col items-center justify-center p-6 border border-white/5 rounded-xl hover:border-blue-500/50 hover:bg-blue-500/5 transition group text-center"
          >
            <File className="w-8 h-8 text-gray-500 group-hover:text-blue-400 mb-2 transition" />
            <span className="text-sm font-medium text-gray-200 group-hover:text-blue-300">Single Source File</span>
            <span className="text-[11px] text-gray-500 mt-1">Select an individual C++, JS, Python, or Go file</span>
          </button>

          <button
            onClick={() => setPasteMode(true)}
            className="flex flex-col items-center justify-center p-6 border border-white/5 rounded-xl hover:border-blue-500/50 hover:bg-blue-500/5 transition group text-center"
          >
            <Clipboard className="w-8 h-8 text-gray-500 group-hover:text-blue-400 mb-2 transition" />
            <span className="text-sm font-medium text-gray-200 group-hover:text-blue-300">Paste Code</span>
            <span className="text-[11px] text-gray-500 mt-1">Paste code snippet or load a vulnerable demo</span>
          </button>
        </div>
      )}
    </div>
  )
}
