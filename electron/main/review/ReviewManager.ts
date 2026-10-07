import { app } from 'electron';
import { join } from 'path';
import { writeFile, readFile, mkdir, readdir } from 'fs/promises';
import { existsSync } from 'fs';

export interface ReviewState {
  id: string;
  findingId: string;
  status: 'open' | 'reviewed' | 'dismissed' | 'false_positive';
  note: string;
  updatedAt: string;
}

export interface LocalReviewHistory {
  sessionId: string;
  createdAt: string;
  analysisResult: any; // The full JSON from AIPipeline
  reviews: Record<string, ReviewState>; // findingId -> ReviewState
}

export class ReviewManager {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || join(app.getPath('userData'), 'reviews');
  }

  async init(): Promise<void> {
    if (!existsSync(this.baseDir)) {
      await mkdir(this.baseDir, { recursive: true });
    }
  }

  private getSessionFile(sessionId: string): string {
    // Prevent path traversal
    const safeId = sessionId.replace(/[^a-zA-Z0-9-]/g, '');
    return join(this.baseDir, `${safeId}.json`);
  }

  async saveReview(sessionId: string, history: LocalReviewHistory): Promise<void> {
    const file = this.getSessionFile(sessionId);
    await writeFile(file, JSON.stringify(history, null, 2), 'utf-8');
  }

  async loadReview(sessionId: string): Promise<LocalReviewHistory | null> {
    const file = this.getSessionFile(sessionId);
    if (!existsSync(file)) return null;
    
    try {
      const data = await readFile(file, 'utf-8');
      return JSON.parse(data) as LocalReviewHistory;
    } catch (err) {
      console.error(`Failed to load review ${sessionId}`, err);
      return null;
    }
  }

  async listReviews(): Promise<LocalReviewHistory[]> {
    if (!existsSync(this.baseDir)) return [];
    const files = await readdir(this.baseDir);
    const reviews: LocalReviewHistory[] = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const data = await readFile(join(this.baseDir, file), 'utf-8');
          reviews.push(JSON.parse(data));
        } catch (err) {
          // ignore corrupted
        }
      }
    }
    return reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async generateHtmlReport(history: LocalReviewHistory): Promise<string> {
    // Generate simple sanitized HTML
    const escapeHtml = (unsafe: string) => {
      return (unsafe || '').replace(/[&<"'>]/g, (m) => {
        switch (m) {
          case '&': return '&amp;';
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '"': return '&quot;';
          case "'": return '&#039;';
          default: return m;
        }
      });
    };

    const findings = history.analysisResult?.findings || [];
    const reviews = history.reviews || {};
    
    let html = `<!DOCTYPE html>
<html>
<head>
  <title>Security Review Report - ${escapeHtml(history.sessionId)}</title>
  <style>
    body { font-family: system-ui, sans-serif; line-height: 1.5; color: #333; max-width: 1000px; margin: 0 auto; padding: 2rem; }
    h1, h2, h3 { color: #111; border-bottom: 1px solid #eee; padding-bottom: 0.5rem; }
    .finding { border: 1px solid #ddd; padding: 1rem; margin-bottom: 1rem; border-radius: 4px; }
    .critical { border-left: 4px solid #d32f2f; }
    .high { border-left: 4px solid #ed6c02; }
    .medium { border-left: 4px solid #ff9800; }
    .low { border-left: 4px solid #0288d1; }
    .info { border-left: 4px solid #4caf50; }
    .badge { display: inline-block; padding: 0.25rem 0.5rem; font-size: 0.75rem; font-weight: bold; border-radius: 2px; background: #eee; }
    pre { background: #f5f5f5; padding: 1rem; overflow-x: auto; font-size: 0.85rem; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>Security Review Report</h1>
  <p><strong>Session ID:</strong> ${escapeHtml(history.sessionId)}</p>
  <p><strong>Date:</strong> ${escapeHtml(history.createdAt)}</p>
  
  <h2>Findings</h2>
`;

    if (findings.length === 0) {
      html += '<p>No security findings detected.</p>';
    }

    for (const f of findings) {
      const rev = reviews[f.id] || { status: 'open', note: '' };
      const riskClass = (f.risk || f.severity || 'info').toLowerCase();
      
      html += `
  <div class="finding ${escapeHtml(riskClass)}">
    <h3>${escapeHtml(f.ruleId)}: ${escapeHtml(f.title)}</h3>
    <p>
      <span class="badge">RISK: ${escapeHtml((f.risk || f.severity || '').toUpperCase())}</span>
      <span class="badge">STATUS: ${escapeHtml(rev.status.toUpperCase())}</span>
      <span class="badge">FILE: ${escapeHtml(f.file)}:${f.line}</span>
    </p>
    <p>${escapeHtml(f.description)}</p>
    <pre><code>${escapeHtml(f.evidence?.snippet)}</code></pre>
    <p><strong>Recommendation:</strong> ${escapeHtml(f.recommendation)}</p>`;
      
      if (f.aiAssessment) {
        html += `
    <div style="background: #e3f2fd; padding: 1rem; margin-top: 1rem; border-radius: 4px;">
      <h4>AI-Assisted Assessment</h4>
      <p><strong>Why it matters:</strong> ${escapeHtml(f.aiAssessment.explanation)}</p>
      <p><strong>Impact:</strong> ${escapeHtml(f.aiAssessment.impact)}</p>
    </div>`;
      }

      if (rev.note) {
        html += `
    <div style="background: #fff3e0; padding: 1rem; margin-top: 1rem; border-radius: 4px;">
      <h4>Reviewer Note</h4>
      <p>${escapeHtml(rev.note)}</p>
    </div>`;
      }
      
      html += `</div>\n`;
    }

    html += `
</body>
</html>`;
    return html;
  }
}
