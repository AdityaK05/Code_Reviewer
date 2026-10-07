export class SecretRedactor {
  private static readonly PATTERNS = [
    // AWS Key
    /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g,
    // Generic API Keys or Tokens
    /(?:sk-[a-zA-Z0-9]{20,})/g,
    /(?:bearer\s+[a-zA-Z0-9\-\._~+\/]+=*)/gi,
    // Connection strings simple heuristic
    /(?:mongodb(?:\+srv)?:\/\/[^\s]+)/gi,
    /(?:postgres(?:ql)?:\/\/[^\s]+)/gi
  ];

  static redact(content: string): string {
    let redacted = content;
    for (const pattern of this.PATTERNS) {
      redacted = redacted.replace(pattern, '[REDACTED_SECRET]');
    }
    return redacted;
  }
}
