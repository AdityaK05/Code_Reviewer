import { IAIProvider } from './IAIProvider';
import { SecretRedactor } from './SecretRedactor';
import { CorrelationEngine } from './CorrelationEngine';
import { RiskScorer } from './RiskScorer';
import { MockAIProvider } from './MockAIProvider';

export class AIPipeline {
  private provider: IAIProvider | null = null;

  constructor(provider?: IAIProvider) {
    this.provider = provider || new MockAIProvider();
  }

  async processFindings(analysisResult: any): Promise<any> {
    const findings = analysisResult.findings || [];
    
    // 1. Correlation
    const correlations = CorrelationEngine.correlate(findings);

    const enrichedFindings = [];

    // 2. AI Enrichment
    for (const f of findings) {
      // Find correlation count
      const relatedCorrelations = correlations.filter(c => c.findingIds.includes(f.id));
      
      let aiAssessment = null;

      if (this.provider) {
        // Build safe context
        const safeSnippet = SecretRedactor.redact(f.evidence.snippet || '');
        const context = {
          findingId: f.id,
          ruleId: f.ruleId,
          severity: f.severity,
          file: f.file,
          line: f.line,
          snippet: safeSnippet
        };

        try {
          const aiOut = await this.provider.analyzeFinding(context);
          // 3. Validation
          if (aiOut.schemaVersion === 1 && aiOut.findingId === f.id) {
            aiAssessment = aiOut;
          }
        } catch (e: any) {
          console.error(`AI failed for finding ${f.id}:`, e.message);
          // Degrade gracefully, don't crash
        }
      }

      // 4. Deterministic Risk
      const finalRisk = RiskScorer.calculate(f.severity, f.confidence, relatedCorrelations.length);

      enrichedFindings.push({
        ...f,
        risk: finalRisk,
        aiAssessment
      });
    }

    let summary = null;
    if (this.provider) {
       try {
         summary = await this.provider.summarizeProject(enrichedFindings, correlations);
       } catch {
         console.error('Failed to generate summary');
       }
    }

    return {
      ...analysisResult,
      findings: enrichedFindings,
      correlations,
      summary,
      ai: {
        enabled: !!this.provider,
        provider: 'mock'
      }
    };
  }
}
