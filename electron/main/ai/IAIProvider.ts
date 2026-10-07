export interface AIContext {
  findingId: string;
  ruleId: string;
  severity: string;
  file: string;
  line: number;
  snippet: string;
}

export interface StructuredAIOutput {
  schemaVersion: number;
  findingId: string;
  assessment: {
    validity: 'likely' | 'uncertain' | 'unlikely';
    confidence: 'high' | 'medium' | 'low';
    risk: 'critical' | 'high' | 'medium' | 'low' | 'info';
  };
  explanation: string;
  impact: string;
  attackScenario: string;
  recommendation: string;
  evidenceReferences: {
    findingId?: string;
    file: string;
    line: number;
  }[];
}

export interface IAIProvider {
  analyzeFinding(context: AIContext): Promise<StructuredAIOutput>;
  correlateFindings(findings: any[]): Promise<any>;
  summarizeProject(findings: any[], correlations: any[]): Promise<any>;
  healthCheck(): Promise<boolean>;
}
