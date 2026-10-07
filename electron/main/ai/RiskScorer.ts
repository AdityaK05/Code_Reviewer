export class RiskScorer {
  static calculate(baseSeverity: string, confidence: string, correlationCount: number): string {
    // Basic deterministic matrix
    const severityValues: Record<string, number> = {
      'critical': 4,
      'high': 3,
      'medium': 2,
      'low': 1,
      'info': 0
    };

    const confidenceValues: Record<string, number> = {
      'high': 1.0,
      'medium': 0.8,
      'low': 0.5
    };

    const s = severityValues[baseSeverity.toLowerCase()] ?? 0;
    const c = confidenceValues[confidence.toLowerCase()] ?? 0.5;
    const correlationMultiplier = correlationCount > 0 ? 1.2 : 1.0;

    const score = s * c * correlationMultiplier;

    if (score >= 3.5) return 'critical';
    if (score >= 2.4) return 'high';
    if (score >= 1.5) return 'medium';
    if (score > 0) return 'low';
    return 'info';
  }
}
