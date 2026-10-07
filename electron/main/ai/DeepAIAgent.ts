import { readFile } from 'fs/promises';
import { join } from 'path';
import { ProjectManifest } from '../ingestion/ManifestBuilder';

export interface AIFinding {
  id: string;
  ruleId: string;
  title: string;
  description: string;
  severity: string; // critical, high, medium, low, info
  confidence: string; // high, medium, low
  category: string; // security, performance, architecture, style
  file: string;
  line: number;
  evidence: { snippet: string, startLine: number, endLine: number };
  recommendation: string;
}

export class DeepAIAgent {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || '';
  }

  async scanProject(workspacePath: string, manifest: ProjectManifest): Promise<AIFinding[]> {
    if (!this.apiKey) {
      console.warn('No GROQ_API_KEY found. Skipping Deep AI Scan.');
      return [];
    }

    const allFindings: AIFinding[] = [];

    // Filter source files, limit to 10 for safety in this version
    const sourceFiles = manifest.files.filter(f => f.type === 'source').slice(0, 10);

    for (const fileMeta of sourceFiles) {
      try {
        const fullPath = join(workspacePath, fileMeta.relativePath);
        const code = await readFile(fullPath, 'utf-8');
        
        // Skip files that are too huge for context
        if (code.length > 50000) continue;

        const findings = await this.scanFile(fileMeta.relativePath, code);
        allFindings.push(...findings);
      } catch (err) {
        console.error(`Failed to AI scan file ${fileMeta.relativePath}`, err);
      }
    }

    return allFindings;
  }

  private async scanFile(relativePath: string, code: string): Promise<AIFinding[]> {
    const prompt = `You are a world-class Security and Code Quality auditor.
Analyze the following source code for:
1. Security vulnerabilities (breaches, injections, hardcoded secrets, unsafe API usage)
2. Code quality issues (smells, anti-patterns, memory leaks)
3. Architecture flaws (tight coupling, bad state management)
4. Performance bottlenecks

Return ONLY a JSON object with a single key "findings" that contains an array of findings.
Schema for each finding:
{
  "ruleId": "AI-SEC-001",
  "title": "Short title",
  "description": "Detailed explanation of the breach or smell",
  "severity": "critical|high|medium|low|info",
  "confidence": "high|medium|low",
  "category": "security|quality|architecture|performance",
  "line": 10, // MUST BE AN INTEGER NUMBER, NOT A STRING
  "snippet": "1-2 lines of the problematic code",
  "recommendation": "How to fix it"
}

File: ${relativePath}
Code:
${code}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      console.error('OpenAI API Error:', await response.text());
      return [];
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    
    try {
      const parsedObj = JSON.parse(content);
      const parsed = parsedObj.findings;
      if (!Array.isArray(parsed)) return [];

      return parsed.map((item: any, idx: number) => ({
        id: `AI-${Date.now()}-${idx}`,
        ruleId: item.ruleId || 'AI-UNKNOWN',
        title: item.title || 'AI Finding',
        description: item.description || '',
        severity: item.severity || 'medium',
        confidence: item.confidence || 'high',
        category: item.category || 'quality',
        file: relativePath,
        line: typeof item.line === 'number' ? item.line : parseInt(item.line) || 1,
        evidence: {
          snippet: item.snippet || '',
          startLine: typeof item.line === 'number' ? item.line : parseInt(item.line) || 1,
          endLine: typeof item.line === 'number' ? item.line : parseInt(item.line) || 1
        },
        recommendation: item.recommendation || ''
      }));
    } catch (e) {
      console.error('Failed to parse AI output', e, content);
      return [];
    }
  }
}
