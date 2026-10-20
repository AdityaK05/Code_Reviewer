import React, { useState } from 'react'
import { ShieldAlert, Download, Search, FileCode } from 'lucide-react'

interface FindingsViewProps {
  analysisResult: any
  reviews: Record<string, { status: string; note: string }>
  onUpdateReview: (findingId: string, updates: any) => void
  onExportHtml: () => void
  onExportJson: () => void
  onNavigateToReview: () => void
}

export function FindingsView({
  analysisResult,
  reviews,
  onUpdateReview,
  onExportHtml,
  onExportJson,
  onNavigateToReview
}: FindingsViewProps): React.ReactElement {
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const findings = analysisResult?.findings || []

  // Filter findings
  const filteredFindings = findings.filter((f: any) => {
    const risk = (f.risk || f.severity || 'info').toLowerCase()
    const rev = reviews[f.id] || { status: 'open', note: '' }
    
    if (filterSeverity !== 'all' && risk !== filterSeverity) return false
    if (filterStatus !== 'all' && rev.status !== filterStatus) return false

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const titleMatch = (f.title || '').toLowerCase().includes(q)
      const ruleMatch = (f.ruleId || '').toLowerCase().includes(q)
      const fileMatch = (f.file || '').toLowerCase().includes(q)
      const descMatch = (f.description || '').toLowerCase().includes(q)
      if (!titleMatch && !ruleMatch && !fileMatch && !descMatch) return false
    }

    return true
  })

  // Metric counts
  const criticalCount = findings.filter((f: any) => (f.risk || f.severity) === 'critical').length
  const highCount = findings.filter((f: any) => (f.risk || f.severity) === 'high').length
  const mediumCount = findings.filter((f: any) => (f.risk || f.severity) === 'medium').length
  const lowCount = findings.filter((f: any) => (f.risk || f.severity) === 'low' || (f.risk || f.severity) === 'info').length

  if (!analysisResult) {
    return (
      <div className="glass rounded-xl p-10 text-center max-w-2xl mx-auto space-y-4">
        <ShieldAlert className="w-12 h-12 text-blue-500 mx-auto opacity-75" />
        <h3 className="text-xl font-semibold text-white">No Analysis Findings Yet</h3>
        <p className="text-sm text-gray-400">
          Upload a project archive, select a source file, or paste code in the Code Review workspace to run the native static analysis engine.
        </p>
        <button
          onClick={onNavigateToReview}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm rounded-lg transition-colors shadow-lg shadow-blue-900/30"
        >
          Go to Code Review
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 glass p-5 rounded-xl">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>Security & Quality Findings</span>
            <span className="text-xs font-mono bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-full border border-blue-700/50">
              {findings.length} Total
            </span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Session: <span className="font-mono text-gray-300">{analysisResult.sessionId?.split('-')[0]}</span> | Analyzed files: {analysisResult.analyzedFiles} | Duration: {analysisResult.durationMs}ms
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onExportHtml}
            className="flex items-center gap-1.5 text-xs px-3.5 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg transition"
          >
            <Download className="w-3.5 h-3.5" /> Export HTML
          </button>
          <button
            onClick={onExportJson}
            className="flex items-center gap-1.5 text-xs px-3.5 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-lg transition"
          >
            <Download className="w-3.5 h-3.5" /> Export JSON
          </button>
        </div>
      </div>

      {/* Severity Counters */}
      <div className="grid grid-cols-4 gap-3">
        <button
          onClick={() => setFilterSeverity(filterSeverity === 'critical' ? 'all' : 'critical')}
          className={`glass p-3 rounded-lg border text-left transition ${
            filterSeverity === 'critical'
              ? 'border-red-500 bg-red-950/20'
              : 'hover:border-red-900/50'
          }`}
        >
          <div className="text-xs text-red-400 font-medium">Critical Risk</div>
          <div className="text-2xl font-bold text-white mt-0.5">{criticalCount}</div>
        </button>

        <button
          onClick={() => setFilterSeverity(filterSeverity === 'high' ? 'all' : 'high')}
          className={`glass p-3 rounded-lg border text-left transition ${
            filterSeverity === 'high'
              ? 'border-orange-500 bg-orange-950/20'
              : 'hover:border-orange-900/50'
          }`}
        >
          <div className="text-xs text-orange-400 font-medium">High Risk</div>
          <div className="text-2xl font-bold text-white mt-0.5">{highCount}</div>
        </button>

        <button
          onClick={() => setFilterSeverity(filterSeverity === 'medium' ? 'all' : 'medium')}
          className={`glass p-3 rounded-lg border text-left transition ${
            filterSeverity === 'medium'
              ? 'border-yellow-500 bg-yellow-950/20'
              : 'hover:border-yellow-900/50'
          }`}
        >
          <div className="text-xs text-yellow-400 font-medium">Medium Risk</div>
          <div className="text-2xl font-bold text-white mt-0.5">{mediumCount}</div>
        </button>

        <button
          onClick={() => setFilterSeverity(filterSeverity === 'low' ? 'all' : 'low')}
          className={`glass p-3 rounded-lg border text-left transition ${
            filterSeverity === 'low'
              ? 'border-blue-500 bg-blue-950/20'
              : 'hover:border-blue-900/50'
          }`}
        >
          <div className="text-xs text-blue-400 font-medium">Low / Info</div>
          <div className="text-2xl font-bold text-white mt-0.5">{lowCount}</div>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between glass p-3 rounded-lg">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search findings, rules, files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-md pl-9 pr-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto text-xs">
          <span className="text-gray-500">Status:</span>
          {['all', 'open', 'reviewed', 'false_positive', 'dismissed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-2.5 py-1 rounded transition whitespace-nowrap capitalize ${
                filterStatus === status
                  ? 'bg-blue-600 text-white font-medium'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Findings List */}
      <div className="space-y-4">
        {filteredFindings.length === 0 ? (
          <div className="glass rounded-lg p-8 text-center text-gray-400 text-sm">
            No findings match your current filters.
          </div>
        ) : (
          filteredFindings.map((f: any) => {
            const risk = (f.risk || f.severity || 'info').toLowerCase()
            const rev = reviews[f.id] || { status: 'open', note: '' }

            return (
              <div
                key={f.id}
                className={`glass rounded-xl p-5 space-y-3 transition-colors ${
                  risk === 'critical'
                    ? 'border-red-900/40 hover:border-red-800/70'
                    : risk === 'high'
                    ? 'border-orange-900/40 hover:border-orange-800/70'
                    : risk === 'medium'
                    ? 'border-yellow-900/40 hover:border-yellow-800/70'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        risk === 'critical'
                          ? 'bg-red-950/60 text-red-300 border-red-800/50'
                          : risk === 'high'
                          ? 'bg-orange-950/60 text-orange-300 border-orange-800/50'
                          : risk === 'medium'
                          ? 'bg-yellow-950/60 text-yellow-300 border-yellow-800/50'
                          : 'bg-blue-950/60 text-blue-300 border-blue-800/50'
                      }`}
                    >
                      {risk}
                    </span>
                    <span className="text-xs font-mono text-gray-400 bg-black/30 px-2 py-0.5 rounded border border-white/10">
                      {f.ruleId}
                    </span>
                    <span className="text-sm font-semibold text-white">{f.title}</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <FileCode className="w-3.5 h-3.5 text-gray-500" />
                    <span className="font-mono text-gray-300">
                      {f.file}:{f.line}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-gray-300 leading-relaxed">{f.description}</p>

                {/* Evidence snippet */}
                {f.evidence?.snippet && (
                  <div className="bg-black/20 border border-white/10 rounded-lg p-3 font-mono text-xs text-gray-200 overflow-x-auto">
                    <div className="text-[10px] text-gray-500 mb-1 select-none font-sans">
                      Line {f.line}:
                    </div>
                    <pre className="text-amber-200/90 whitespace-pre-wrap">{f.evidence.snippet}</pre>
                  </div>
                )}

                {/* AI Assessment or Recommendation */}
                {f.aiAssessment ? (
                  <div className="bg-blue-950/20 border border-blue-900/30 rounded-lg p-3 text-xs space-y-1.5 text-gray-300">
                    <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wide">
                      AI Vulnerability Insight
                    </div>
                    {f.aiAssessment.explanation && (
                      <p>
                        <strong className="text-gray-400">Analysis:</strong> {f.aiAssessment.explanation}
                      </p>
                    )}
                    {f.aiAssessment.impact && (
                      <p>
                        <strong className="text-gray-400">Impact:</strong> {f.aiAssessment.impact}
                      </p>
                    )}
                    {f.aiAssessment.recommendation && (
                      <p className="text-green-400/90">
                        <strong>Remediation:</strong> {f.aiAssessment.recommendation}
                      </p>
                    )}
                  </div>
                ) : (
                  f.recommendation && (
                    <div className="text-xs text-green-400/80 bg-green-950/10 border border-green-900/20 rounded-md p-2">
                      💡 <strong>Fix Recommendation:</strong> {f.recommendation}
                    </div>
                  )
                )}

                {/* Review status actions & Notes */}
                <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-gray-500 mr-1">Status:</span>
                    {['open', 'reviewed', 'false_positive', 'dismissed'].map((st) => (
                      <button
                        key={st}
                        onClick={() => onUpdateReview(f.id, { status: st })}
                        className={`px-2 py-0.5 rounded text-[11px] transition ${
                          rev.status === st
                            ? 'bg-blue-600 text-white font-medium'
                            : 'bg-white/5 text-gray-400 hover:text-gray-200 hover:bg-white/10'
                        }`}
                      >
                        {st.replace('_', ' ')}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    placeholder="Add reviewer notes..."
                    value={rev.note || ''}
                    onChange={(e) => onUpdateReview(f.id, { note: e.target.value })}
                    className="w-full sm:w-72 bg-black/20 border border-white/10 rounded px-2.5 py-1 text-xs text-gray-300 outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
