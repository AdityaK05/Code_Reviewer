import React from 'react'
import { Shield, FileText, Activity, ArrowRight, CheckCircle2, AlertTriangle, Bug, Zap } from 'lucide-react'

interface DashboardViewProps {
  nativeStatus: string
  engineInfo: any
  analysisResult: any
  onNavigate: (tab: 'dashboard' | 'review' | 'findings' | 'settings') => void
}

export function DashboardView({
  nativeStatus,
  engineInfo,
  analysisResult,
  onNavigate
}: DashboardViewProps): React.ReactElement {
  const findings = analysisResult?.findings || []
  const criticalCount = findings.filter((f: any) => (f.risk || f.severity) === 'critical').length
  const highCount = findings.filter((f: any) => (f.risk || f.severity) === 'high').length

  return (
    <div className="space-y-6">
      {/* Hero Welcome Card */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-950/40 via-[#161B22] to-purple-950/20 border border-blue-900/30 rounded-2xl p-6 md:p-8">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Zap className="w-3.5 h-3.5 text-blue-400" />
            <span>Hybrid C++ Static Analysis & Groq SLM AI</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-100 tracking-tight">
            Comprehensive Static Security Review
          </h1>
          <p className="text-sm text-gray-300 leading-relaxed">
            Audit your codebases for memory safety flaws, command injections, hardcoded credentials, and high-risk anti-patterns with deterministic speed and AI reasoning.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('review')}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm rounded-lg transition-colors shadow-lg shadow-blue-900/40"
            >
              <FileText className="w-4 h-4" />
              <span>Start Code Review</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            {findings.length > 0 && (
              <button
                onClick={() => onNavigate('findings')}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium rounded-lg transition-colors"
              >
                <Activity className="w-4 h-4 text-orange-400" />
                <span>View {findings.length} Findings</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Engine Status</span>
            <span className={`w-2 h-2 rounded-full ${nativeStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          </div>
          <div className="text-xl font-bold text-white capitalize">
            {nativeStatus === 'connected' ? 'Connected' : 'Unavailable'}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {engineInfo ? `${engineInfo.engine} v${engineInfo.version}` : 'Checking IPC...'}
          </p>
        </div>

        <div className="glass rounded-xl p-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Total Findings</span>
            <Bug className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-white">{findings.length}</div>
          <p className="text-xs text-gray-400 mt-1">
            {analysisResult ? `${analysisResult.analyzedFiles} file(s) evaluated` : 'No active session'}
          </p>
        </div>

        <div className="glass rounded-xl p-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Critical & High</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-xl font-bold text-red-400">{criticalCount + highCount}</div>
          <p className="text-xs text-gray-400 mt-1">
            {criticalCount} Critical, {highCount} High
          </p>
        </div>

        <div className="glass rounded-xl p-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Scan Duration</span>
            <Zap className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-xl font-bold text-white">
            {analysisResult?.durationMs ? `${analysisResult.durationMs}ms` : '--'}
          </div>
          <p className="text-xs text-gray-400 mt-1">Ultra-fast native C++ evaluation</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Security Baseline */}
        <div className="glass rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Shield className="w-4 h-4 text-green-400" />
            <span>Active Security Protections</span>
          </div>
          <ul className="space-y-2 text-xs text-gray-300">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              <span>Full Electron Context Isolation & Sandbox Enforced</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              <span>Strict Archive Zip Slip & Path Boundary Confinement</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              <span>Pre-LLM Credential Masking via SecretRedactor</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              <span>Prompt Injection Guard & Graceful Degradation</span>
            </li>
          </ul>
        </div>

        {/* Quick Launch Card */}
        <div className="glass rounded-xl p-5 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Activity className="w-4 h-4 text-blue-400" />
              <span>Quick Action Workflow</span>
            </div>
            <p className="text-xs text-gray-300">
              Drop any codebase or paste single-file snippets to run deterministic lexical rules (buffer overflows, command executions, hardcoded secrets) and optional SLM assessments.
            </p>
          </div>
          <button
            onClick={() => onNavigate('review')}
            className="mt-4 w-full py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-medium rounded-lg transition"
          >
            Launch Review Workspace →
          </button>
        </div>
      </div>
    </div>
  )
}
