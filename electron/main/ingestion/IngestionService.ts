import { WorkspaceManager } from './WorkspaceManager'
import { ZipExtractor, ExtractionLimits } from './ZipExtractor'
import { ManifestBuilder, ProjectManifest } from './ManifestBuilder'
import { FileClassifier } from './FileClassifier'
import { copyFile, stat, writeFile, mkdir } from 'fs/promises'
import { join, basename, dirname, extname } from 'path'

export class IngestionService {
  private workspaceManager = new WorkspaceManager()

  public getWorkspaceManager(): WorkspaceManager {
    return this.workspaceManager
  }

  private defaultLimits: ExtractionLimits = {
    maxTotalSize: 1024 * 1024 * 500, // 500MB
    maxEntrySize: 1024 * 1024 * 50,  // 50MB
    maxFiles: 10000
  }

  async ingestZip(zipPath: string): Promise<{ manifest: ProjectManifest, workspace: string }> {
    let session: { sessionId: string, workspacePath: string } | null = null
    try {
      session = await this.workspaceManager.createSessionWorkspace()
      
      const files = await ZipExtractor.extractSafe(zipPath, session.workspacePath, this.defaultLimits)
      
      const manifest = await ManifestBuilder.buildAndSave(
        session.workspacePath,
        session.sessionId,
        'zip',
        files
      )
      
      return { manifest, workspace: session.workspacePath }
    } catch (err: any) {
      if (session) await this.workspaceManager.cleanupSession(session.sessionId)
      throw new Error(err.message || 'INGESTION_FAILED')
    }
  }

  async ingestFile(filePath: string): Promise<{ manifest: ProjectManifest, workspace: string }> {
    let session: { sessionId: string, workspacePath: string } | null = null
    try {
      session = await this.workspaceManager.createSessionWorkspace()
      
      const fileStat = await stat(filePath)
      if (!fileStat.isFile()) throw new Error('INVALID_INPUT')
      if (fileStat.size > this.defaultLimits.maxEntrySize) throw new Error('FILE_TOO_LARGE')

      const filename = basename(filePath)
      const destPath = join(session.workspacePath, filename)
      
      await copyFile(filePath, destPath)
      
      const { language, type } = FileClassifier.classify(filename)
      const files = [{
        relativePath: filename,
        size: fileStat.size,
        language,
        type,
        extension: extname(filename)
      }]

      const manifest = await ManifestBuilder.buildAndSave(
        session.workspacePath,
        session.sessionId,
        'file',
        files
      )

      return { manifest, workspace: session.workspacePath }
    } catch (err: any) {
      if (session) await this.workspaceManager.cleanupSession(session.sessionId)
      throw new Error(err.message || 'INGESTION_FAILED')
    }
  }

  async ingestPaste(filename: string, content: string): Promise<{ manifest: ProjectManifest, workspace: string }> {
    let session: { sessionId: string, workspacePath: string } | null = null
    try {
      session = await this.workspaceManager.createSessionWorkspace()
      
      const destPath = join(session.workspacePath, filename)
      // Prevent traversal in pasted filename
      if (!this.workspaceManager.isSafePath(session.workspacePath, filename)) {
        throw new Error('INVALID_INPUT')
      }

      await mkdir(dirname(destPath), { recursive: true })
      await writeFile(destPath, content, 'utf-8')
      
      const { language, type } = FileClassifier.classify(filename)
      const files = [{
        relativePath: filename,
        size: Buffer.byteLength(content, 'utf8'),
        language,
        type,
        extension: extname(filename)
      }]

      const manifest = await ManifestBuilder.buildAndSave(
        session.workspacePath,
        session.sessionId,
        'paste',
        files
      )

      return { manifest, workspace: session.workspacePath }
    } catch (err: any) {
      if (session) await this.workspaceManager.cleanupSession(session.sessionId)
      throw new Error(err.message || 'INGESTION_FAILED')
    }
  }
}
