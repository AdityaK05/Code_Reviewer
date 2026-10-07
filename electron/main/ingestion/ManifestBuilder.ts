import { writeFile } from 'fs/promises'
import { join } from 'path'
import { ExtractedFile } from './ZipExtractor'

export interface ProjectManifest {
  schemaVersion: string
  sessionId: string
  sourceType: 'zip' | 'file' | 'paste'
  createdAt: string
  files: ExtractedFile[]
  summary: {
    totalFiles: number
    sourceFiles: number
    configFiles: number
    unknownFiles: number
  }
}

export class ManifestBuilder {
  static async buildAndSave(
    workspacePath: string,
    sessionId: string,
    sourceType: 'zip' | 'file' | 'paste',
    files: ExtractedFile[]
  ): Promise<ProjectManifest> {
    
    // Deterministic ordering
    files.sort((a, b) => a.relativePath.localeCompare(b.relativePath))

    let sourceFiles = 0
    let configFiles = 0
    let unknownFiles = 0

    for (const f of files) {
      if (f.type === 'source') sourceFiles++
      else if (f.type === 'config') configFiles++
      else unknownFiles++
    }

    const manifest: ProjectManifest = {
      schemaVersion: '1.0.0',
      sessionId,
      sourceType,
      createdAt: new Date().toISOString(),
      files,
      summary: {
        totalFiles: files.length,
        sourceFiles,
        configFiles,
        unknownFiles
      }
    }

    const manifestPath = join(workspacePath, 'manifest.json')
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')

    return manifest
  }
}
