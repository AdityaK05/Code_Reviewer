import 'dotenv/config'
import { join } from 'path'
import { readFile } from 'fs/promises'
import { ProjectManifest } from '../ingestion/ManifestBuilder'
import { AICache } from './AICache'
import { GitDiffHelper } from './GitDiffHelper'

export interface AIFinding {
  id: string
  ruleId: string
  title: string
  description: string
  severity: string // critical, high, medium, low, info
  confidence: string // high, medium, low
  category: string // security, quality, architecture, performance
  file: string
  line: number
  evidence: { snippet: string; startLine: number; endLine: number }
  recommendation: string
}

export interface DeepAIScanOptions {
  deterministicFindings?: any[]
  diffOnly?: boolean
  maxFiles?: number
}

export class DeepAIAgent {
  private apiKey: string
  private baseUrl: string
  private model: string
  private cache: AICache

  constructor (cache?: AICache) {
    this.baseUrl = (process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/+$/, '')
    // Lightweight, fast, low-token model default (Groq Llama 3.1 8B Instant)
    this.model = process.env.GROQ_MODEL || process.env.AI_MODEL || 'qwen/qwen3.8-27b'
    this.apiKey = process.env.GROQ_API_KEY || process.env.AI_API_KEY || ''
    // Phase 2: Deterministic fallback when no API key is available
    if (!this.apiKey) {
      this.apiKey = '__DETERMINISTIC_FALLBACK__'
    }
    this.cache = cache || new AICache()
  }

  getCacheStats () {
    return this.cache.getStats()
  }

  async scanProject (
    workspacePath: string,
    manifest: ProjectManifest,
    options?: DeepAIScanOptions
  ): Promise<AIFinding[]> {
    // If using deterministic fallback (no API key), scan via deterministic analysis
    if (this.apiKey === '__DETERMINISTIC_FALLBACK__') {
      console.log(
        '[DeepAIAgent] No API key detected — using deterministic fallback analysis.'
      )
      return this.generateDeterministicFindingsFromManifest(
        workspacePath,
        manifest,
        options?.deterministicFindings || []
      )
    }

    if (!this.apiKey) {
      console.warn(
        '[DeepAIAgent] No API key found (GROQ_API_KEY). Skipping Deep AI Scan.'
      )
      return []
    }

    const allFindings: AIFinding[] = []
    const maxFiles = options?.maxFiles ?? 15

    // Check for Git Diff if diff-only is requested / default enabled
    let changedFileSet: Set<string> | null = null
    let fileChangedLines: Record<string, Set<number>> = {}
    if (options?.diffOnly !== false) {
      const diffInfo = await GitDiffHelper.getDiffSummary(workspacePath)
      if (diffInfo && diffInfo.changedFiles.length > 0) {
        changedFileSet = new Set(diffInfo.changedFiles.map(f => f.replace(/\\/g, '/')))
        fileChangedLines = diffInfo.fileChangedLines
        console.log(
          `[DeepAIAgent] Incremental Diff Scan active: ${changedFileSet.size} changed file(s) found.`
        )
      }
    }

    // Filter source files
    let sourceFiles = manifest.files.filter(f => f.type === 'source')
    if (changedFileSet) {
      const diffFiltered = sourceFiles.filter(f => {
        const normPath = f.relativePath.replace(/\\/g, '/')
        return changedFileSet.has(normPath) || Array.from(changedFileSet!).some(cf => normPath.endsWith(cf))
      })
      if (diffFiltered.length > 0) {
        sourceFiles = diffFiltered
      }
    }

    sourceFiles = sourceFiles.slice(0, maxFiles)

    // Map deterministic findings by relative path
    const deterministicMap = new Map<string, any[]>()
    if (options?.deterministicFindings) {
      for (const f of options.deterministicFindings) {
        const norm = (f.file || '').replace(/\\/g, '/')
        if (!deterministicMap.has(norm)) {
          deterministicMap.set(norm, [])
        }
        deterministicMap.get(norm)!.push(f)
      }
    }

    for (const fileMeta of sourceFiles) {
      try {
        const fullPath = join(workspacePath, fileMeta.relativePath)
        const code = await readFile(fullPath, 'utf-8')

        // Skip massive generated bundles or minified assets
        if (code.length > 250000) continue

        const normRelPath = fileMeta.relativePath.replace(/\\/g, '/')
        const deterministicForFile = deterministicMap.get(normRelPath) || []

        // Extract targeted snippets instead of sending the entire file
        const snippetChunks = this.extractTargetSnippets(
          code,
          deterministicForFile,
          fileChangedLines[normRelPath]
        )

        for (const chunk of snippetChunks) {
          const findings = await this.scanSnippetWithCache(
            fileMeta.relativePath,
            chunk.snippet,
            chunk.startLine,
            chunk.endLine
          )
          allFindings.push(...findings)
        }
      } catch (err) {
        console.error(`[DeepAIAgent] Failed to AI scan file ${fileMeta.relativePath}`, err)
      }
    }

    const stats = this.cache.getStats()
    console.log(
      `[DeepAIAgent] Scan complete. Found ${allFindings.length} findings. Cache hits: ${stats.hits}, misses: ${stats.misses}`
    )

    return allFindings
  }

  /**
   * Extracts targeted snippets around suspicious patterns or deterministic findings.
   * Drastically reduces token usage (by ~90%) compared to sending full multi-KB files.
   */
  private extractTargetSnippets (
    code: string,
    deterministicFindings: any[],
    changedLines?: Set<number>
  ): Array<{ snippet: string; startLine: number; endLine: number }> {
    const lines = code.split('\n')
    const totalLines = lines.length

    // Small files (< 120 lines) can be scanned as a single snippet
    if (totalLines <= 120) {
      return [{ snippet: code, startLine: 1, endLine: totalLines }]
    }

    const targetLines = new Set<number>()

    // 1. Add lines from deterministic findings (±10 lines context)
    for (const df of deterministicFindings) {
      if (typeof df.line === 'number' && df.line > 0) {
        targetLines.add(df.line)
      }
    }

    // 2. Add changed lines from git diff
    if (changedLines && changedLines.size > 0) {
      for (const lineNum of changedLines) {
        targetLines.add(lineNum)
      }
    }

    // 3. If no deterministic findings or changed lines specified, detect high-risk trigger tokens
    if (targetLines.size === 0) {
      const sensitivePattern = /\b(exec|eval|child_process|spawn|system|strcpy|strcat|sprintf|innerHTML|dangerouslySetInnerHTML|jwt|secret|password|token|Authorization|query|SELECT|INSERT|UPDATE|DELETE|crypto|authenticate)\b/i
      lines.forEach((lineText, idx) => {
        if (sensitivePattern.test(lineText)) {
          targetLines.add(idx + 1)
        }
      })
    }

    // If still no sensitive lines, sample the header module definition (lines 1 to 80)
    if (targetLines.size === 0) {
      const endLine = Math.min(80, totalLines)
      return [{
        snippet: lines.slice(0, endLine).join('\n'),
        startLine: 1,
        endLine
      }]
    }

    // Merge overlapping windows [line - 10, line + 10]
    const ranges: Array<[number, number]> = []
    const sortedLines = Array.from(targetLines).sort((a, b) => a - b)

    for (const l of sortedLines) {
      const start = Math.max(1, l - 10)
      const end = Math.min(totalLines, l + 10)

      if (ranges.length > 0 && ranges[ranges.length - 1][1] >= start - 3) {
        ranges[ranges.length - 1][1] = Math.max(ranges[ranges.length - 1][1], end)
      } else {
        ranges.push([start, end])
      }

      // Limit to at most 4 snippets per large file to strictly bound tokens
      if (ranges.length >= 4) break
    }

    return ranges.map(([startLine, endLine]) => ({
      snippet: lines.slice(startLine - 1, endLine).join('\n'),
      startLine,
      endLine
    }))
  }

  private async scanSnippetWithCache (
    relativePath: string,
    snippet: string,
    startLine: number,
    endLine: number
  ): Promise<AIFinding[]> {
    // Check SHA-256 hash in AICache
    const cached = await this.cache.get<AIFinding[]>(snippet, this.model)
    if (cached) {
      // Re-map relative path and line numbers in case context shifted
      return cached.map(f => ({
        ...f,
        file: relativePath,
        id: `AI-CACHE-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
      }))
    }

    const findings = await this.executeLLM(relativePath, snippet, startLine, endLine)
    await this.cache.set(snippet, this.model, findings)
    return findings
  }

  /**
   * Deterministic fallback: analyze actual source files from the manifest
   * using the same regex rules that the native C++ engine implements.
   * This ensures the app always produces risk findings even without an LLM API key.
   */
  private async generateDeterministicFindingsFromManifest (
    workspacePath: string,
    manifest: ProjectManifest,
    deterministicFindings: any[]
  ): Promise<AIFinding[]> {
    const allFindings: AIFinding[] = []
    const sourceFiles = manifest.files.filter(f => f.type === 'source')

    for (const fileMeta of sourceFiles) {
      try {
        const normRelPath = fileMeta.relativePath.replace(/\\/g, '/')
        let code = ''

        // Try to read actual file content from workspace
        try {
          const { readFile } = await import('fs/promises')
          code = await readFile(workspacePath + '/' + fileMeta.relativePath, 'utf-8')
        } catch {
          continue
        }

        const lines = code.split('\n')
        const lineCount = Math.max(lines.length, 1)

        // Scan each line against all security patterns: CR001, CR004, CR005, CR003
        for (let li = 0; li < lineCount; li++) {
          const line = li < lines.length ? lines[li] : ''
          const lineNum = li + 1

          // CR001: Unsafe string copy
          if (/\bstrcpy\s*\(/.test(line)) {
            allFindings.push({
              id: 'CR001-' + normRelPath + '-' + lineNum,
              ruleId: 'CR001',
              title: 'Unsafe string copy',
              description: 'Use of unsafe string copy function strcpy.',
              severity: 'high',
              confidence: 'medium',
              category: 'security',
              file: fileMeta.relativePath,
              line: lineNum,
              evidence: { snippet: line, startLine: lineNum, endLine: lineNum },
              recommendation: 'Use strncpy or safer bounded string copy functions.'
            })
          }

          // CR004: Dangerous command execution
          if (/\b(system|exec|eval|popen)\s*\(/.test(line)) {
            allFindings.push({
              id: 'CR004-' + normRelPath + '-' + lineNum,
              ruleId: 'CR004',
              title: 'Dangerous command execution',
              description: 'Use of unsafe command execution API.',
              severity: 'critical',
              confidence: 'high',
              category: 'security',
              file: fileMeta.relativePath,
              line: lineNum,
              evidence: { snippet: line, startLine: lineNum, endLine: lineNum },
              recommendation: 'Avoid system(). Use safer process execution APIs.'
            })
          }

          // CR005: Hardcoded secret
          if (/(password|passwd|secret|api_?key|auth_?token|access_?token|private_?key)\s*[:=]\s*['"][^'"]{4,}['"]/.test(line)) {
            allFindings.push({
              id: 'CR005-' + normRelPath + '-' + lineNum,
              ruleId: 'CR005',
              title: 'Hardcoded Secret',
              description: 'Potential hardcoded password or secret detected.',
              severity: 'high',
              confidence: 'medium',
              category: 'security',
              file: fileMeta.relativePath,
              line: lineNum,
              evidence: { snippet: line, startLine: lineNum, endLine: lineNum },
              recommendation: 'Use environment variables or a secret management system.'
            })
          }

          // CR003: SQL Injection
          if (/\((query|execute|exec|raw)\s*\(['"][^'"]*(SELECT|INSERT|UPDATE|DELETE|DROP)/i.test(line)) {
            allFindings.push({
              id: 'CR003-' + normRelPath + '-' + lineNum,
              ruleId: 'CR003',
              title: 'Potential SQL Injection',
              description: 'SQL query constructed with string concatenation of untrusted input.',
              severity: 'critical',
              confidence: 'high',
              category: 'security',
              file: fileMeta.relativePath,
              line: lineNum,
              evidence: { snippet: line, startLine: lineNum, endLine: lineNum },
              recommendation: 'Use parameterized queries / prepared statements exclusively.'
            })
          }
        }

        // Also scan code from the deterministic findings we were given
        for (const df of deterministicFindings) {
          if (df.line && df.line > 0 && df.line <= lineCount) {
            const lineIndex = df.line - 1
            const line = lines[lineIndex]
            if (line) {
              if (/\bstrcpy\s*\(/.test(line)) {
                allFindings.push({
                  id: 'CR001-' + normRelPath + '-' + df.line,
                  ruleId: 'CR001',
                  title: 'Unsafe string copy',
                  description: 'Use of unsafe string copy function strcpy.',
                  severity: 'high',
                  confidence: 'medium',
                  category: 'security',
                  file: fileMeta.relativePath,
                  line: df.line,
                  evidence: { snippet: line, startLine: df.line, endLine: df.line },
                  recommendation: 'Use strncpy or safer bounded string copy functions.'
                })
              }
              if (/\b(system|exec|eval|popen)\s*\(/.test(line)) {
                allFindings.push({
                  id: 'CR004-' + normRelPath + '-' + df.line,
                  ruleId: 'CR004',
                  title: 'Dangerous command execution',
                  description: 'Use of unsafe command execution API.',
                  severity: 'critical',
                  confidence: 'high',
                  category: 'security',
                  file: fileMeta.relativePath,
                  line: df.line,
                  evidence: { snippet: line, startLine: df.line, endLine: df.line },
                  recommendation: 'Avoid system(). Use safer process execution APIs.'
                })
              }
              if (/(password|passwd|secret|api_?key|auth_?token|access_?token|private_?key)\s*[:=]\s*['"][^'"]{4,}['"]/.test(line)) {
                allFindings.push({
                  id: 'CR005-' + normRelPath + '-' + df.line,
                  ruleId: 'CR005',
                  title: 'Hardcoded Secret',
                  description: 'Potential hardcoded password or secret detected.',
                  severity: 'high',
                  confidence: 'medium',
                  category: 'security',
                  file: fileMeta.relativePath,
                  line: df.line,
                  evidence: { snippet: line, startLine: df.line, endLine: df.line },
                  recommendation: 'Use environment variables or a secret management system.'
                })
              }
              if (/\((query|execute|exec|raw)\s*\(['"][^'"]*(SELECT|INSERT|UPDATE|DELETE|DROP)/i.test(line)) {
                allFindings.push({
                  id: 'CR003-' + normRelPath + '-' + df.line,
                  ruleId: 'CR003',
                  title: 'Potential SQL Injection',
                  description: 'SQL query constructed with string concatenation of untrusted input.',
                  severity: 'critical',
                  confidence: 'high',
                  category: 'security',
                  file: fileMeta.relativePath,
                  line: df.line,
                  evidence: { snippet: line, startLine: df.line, endLine: df.line },
                  recommendation: 'Use parameterized queries / prepared statements exclusively.'
                })
              }
            }
          }
        }
      } catch (err) {
        console.error(
          '[DeepAIAgent] Failed to deterministic scan file ' + fileMeta.relativePath,
          err
        )
      }
    }

    return allFindings
  }

  private async executeLLM (
    relativePath: string,
    snippet: string,
    startLine: number,
    endLine: number
  ): Promise<AIFinding[]> {
    // Simplified prompt that works well with qwen/qwen3.8-27b
    const prompt = `Find security vulnerabilities in this code. Return ONLY valid JSON with a "findings" array.
Each finding: {"ruleId": "AI-SEC-001", "title": "", "description": "", "severity": "critical|high|medium|low|info", "confidence": "high|medium|low", "category": "security", "line": ${startLine}, "snippet": "", "recommendation": ""}

Code (lines ${startLine}-${endLine} of ${relativePath}):
` + snippet + `
`

    try {
      const response = await fetch(this.baseUrl + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + this.apiKey
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 1024,
          response_format: { type: 'json_object' }
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[DeepAIAgent] API Error:', response.status, errorText)
        return []
      }

      const data = await response.json()
      let content = data.choices?.[0]?.message?.content?.trim() || ''

      // Clean markdown code blocks if present
      if (content.startsWith('```json')) {
        content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (content.startsWith('```')) {
        content = content.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }

      const parsedObj = JSON.parse(content)
      const parsed = parsedObj.findings
      if (!Array.isArray(parsed)) return []

      return parsed.map((item: any, idx: number) => {
        const lineNum = typeof item.line === 'number' ? item.line : parseInt(item.line, 10) || startLine
        return {
          id: 'AI-' + Date.now() + '-' + idx + '-' + Math.random().toString(36).substr(2, 4),
          ruleId: item.ruleId || 'AI-AUDIT',
          title: item.title || 'AI Identified Issue',
          description: item.description || '',
          severity: item.severity || 'medium',
          confidence: item.confidence || 'high',
          category: item.category || 'security',
          file: relativePath,
          line: lineNum,
          evidence: {
            snippet: item.snippet || snippet.split('\n')[0] || '',
            startLine: lineNum,
            endLine: lineNum
          },
          recommendation: item.recommendation || ''
        }
      })
    } catch (e) {
      console.error('[DeepAIAgent] Failed to query or parse AI response:', e)
      return []
    }
  }
}