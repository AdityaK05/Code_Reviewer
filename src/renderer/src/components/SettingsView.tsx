import React, { useState } from 'react'
import { Settings, Shield, Cpu, Key, CheckCircle2 } from 'lucide-react'

interface SettingsViewProps {
  engineInfo: any
  nativeStatus: string
  errorMsg: string
}

export function SettingsView({ engineInfo, nativeStatus, errorMsg }: SettingsViewProps): React.ReactElement {
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('user_groq_api_key') || '')
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false)
  const [modelName, setModelName] = useState<string>('llama-3.1-8b-instant')

  const handleSaveKey = () => {
    localStorage.setItem('user_groq_api_key', apiKey)
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 3000)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="glass rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-2">
          <Settings className="w-5 h-5 text-blue-500" />
          <span>System & Engine Settings</span>
        </h2>
        <p className="text-xs text-gray-400">
          Configure native static analysis parameters, Groq SLM reasoning credentials, and local caching.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Native Engine Specifications */}
        <div className="glass rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-200">
            <Cpu className="w-4 h-4 text-purple-400" />
            <span>Native Static Analysis Core</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-gray-400">Engine Binary</span>
              <span className="text-gray-200 font-mono">CodeReviewerEngine.exe</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-gray-400">Connection Status</span>
              <span className={nativeStatus === 'connected' ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                {nativeStatus.toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-gray-400">Engine Version</span>
              <span className="text-gray-200 font-mono">{engineInfo?.version || '0.1.0'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-gray-400">Platform Target</span>
              <span className="text-gray-200">{engineInfo?.platform || 'Windows x64'}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-gray-400">IPC Protocol</span>
              <span className="text-gray-200 font-mono">Standard I/O (JSON Line-Delimited)</span>
            </div>
          </div>

          {nativeStatus === 'error' && (
            <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-xs text-red-300">
              {errorMsg}
            </div>
          )}
        </div>

        {/* AI Model Configuration */}
        <div className="glass rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-200">
            <Key className="w-4 h-4 text-yellow-400" />
            <span>AI Reasoning Provider (Groq / Ollama)</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-gray-400 mb-1">Model Selection</label>
              <select
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-xs text-gray-200 outline-none focus:border-blue-500"
              >
                <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (Fast, Token Efficient)</option>
                <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Deep Reasoning)</option>
                <option value="mixtral-8x7b-32768">mixtral-8x7b-32768</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-400 mb-1">Groq API Key (Stored in .env or local)</label>
              <input
                type="password"
                placeholder="gsk_..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-xs text-gray-200 outline-none focus:border-blue-500 font-mono"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Keys in <code className="text-gray-400">.env</code> take precedence automatically.
              </p>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={handleSaveKey}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-lg transition"
              >
                Save Configuration
              </button>
              {savedSuccess && (
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Security Policies Card */}
      <div className="glass rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-200">
          <Shield className="w-4 h-4 text-green-400" />
          <span>Active Application Hardening</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-400">
          <div className="bg-black/20 p-3 rounded-lg border border-white/5">
            <span className="text-green-400 font-semibold block mb-0.5">Context Isolation</span>
            <span>Enforced & Separated</span>
          </div>
          <div className="bg-black/20 p-3 rounded-lg border border-white/5">
            <span className="text-green-400 font-semibold block mb-0.5">Node Integration</span>
            <span>Disabled in Renderer</span>
          </div>
          <div className="bg-black/20 p-3 rounded-lg border border-white/5">
            <span className="text-green-400 font-semibold block mb-0.5">Zip Slip Protection</span>
            <span>Path Boundary Check</span>
          </div>
          <div className="bg-black/20 p-3 rounded-lg border border-white/5">
            <span className="text-green-400 font-semibold block mb-0.5">Credential Redaction</span>
            <span>Pre-LLM Masking</span>
          </div>
        </div>
      </div>
    </div>
  )
}
