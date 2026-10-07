import { extname } from 'path'

export class FileClassifier {
  private static extensionMap: Record<string, string> = {
    '.c': 'c',
    '.cpp': 'cpp',
    '.cc': 'cpp',
    '.h': 'c',
    '.hpp': 'cpp',
    '.m': 'objective-c',
    '.mm': 'objective-cpp',
    '.java': 'java',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.go': 'go',
    '.rs': 'rust',
    '.cs': 'csharp',
    '.php': 'php',
    '.rb': 'ruby',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.sql': 'sql',
    '.html': 'html',
    '.css': 'css',
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.xml': 'xml',
    '.sh': 'shell'
  }

  static classify(filename: string): { language: string; type: string } {
    const ext = extname(filename).toLowerCase()
    const language = this.extensionMap[ext] || 'unknown'
    
    let type = 'source'
    if (['.json', '.yaml', '.yml', '.xml'].includes(ext)) {
      type = 'config'
    } else if (language === 'unknown') {
      type = 'unknown'
    }

    return { language, type }
  }
}
