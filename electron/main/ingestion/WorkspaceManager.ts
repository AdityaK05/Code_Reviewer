import { app } from 'electron'
import { join, isAbsolute } from 'path'
import { randomUUID } from 'crypto'
import { mkdir, rm } from 'fs/promises'

export class WorkspaceManager {
  private baseDir: string

  constructor(baseDir?: string) {
    this.baseDir = baseDir || join(app?.getPath?.('userData') || __dirname, 'workspaces')
  }

  async createSessionWorkspace(): Promise<{ sessionId: string, workspacePath: string }> {
    const sessionId = randomUUID()
    const workspacePath = join(this.baseDir, sessionId)
    await mkdir(workspacePath, { recursive: true })
    return { sessionId, workspacePath }
  }

  async cleanupSession(sessionId: string): Promise<void> {
    const workspacePath = join(this.baseDir, sessionId)
    // Double check it's inside baseDir
    if (workspacePath.startsWith(this.baseDir)) {
      await rm(workspacePath, { recursive: true, force: true })
    }
  }

  getSession(sessionId: string): { sessionId: string, workspacePath: string } | null {
    // Basic validation to prevent arbitrary paths
    if (!sessionId || sessionId.includes('/') || sessionId.includes('\\') || sessionId.includes('..')) return null
    const workspacePath = join(this.baseDir, sessionId)
    return { sessionId, workspacePath }
  }

  isSafePath(workspacePath: string, targetPath: string): boolean {
    if (isAbsolute(targetPath)) return false
    
    // Normalize and check
    const resolvedPath = join(workspacePath, targetPath)
    if (!resolvedPath.startsWith(workspacePath)) {
      return false
    }
    return true
  }
}
