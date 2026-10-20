import { IAIProvider, AIContext, StructuredAIOutput } from './IAIProvider';

export class MockAIProvider implements IAIProvider {
  async analyzeFinding(context: AIContext): Promise<StructuredAIOutput> {
    // If prompt injection is detected
    if (context.snippet.includes('Ignore previous instructions')) {
      throw new Error('AI Provider refused processing due to safety filters');
    }

    return {
      schemaVersion: 1,
      findingId: context.findingId,
      assessment: {
        validity: 'likely',
        confidence: 'high',
        risk: 'high'
      },
      explanation: `Mock AI explanation for ${context.ruleId}.`,
      impact: 'High potential for data loss.',
      attackScenario: 'Attacker leverages this path to overwrite memory.',
      recommendation: 'Use safer bounds-checked functions.',
      evidenceReferences: [
        { file: context.file, line: context.line }
      ]
    };
  }

  async correlateFindings(_findings: any[]): Promise<any> {
    return [];
  }

  async summarizeProject(findings: any[], _correlations: any[]): Promise<any> {
    return {
      totalAnalyzed: findings.length,
      highPriority: findings.filter(f => f.severity === 'critical' || f.severity === 'high').length
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
