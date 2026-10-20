import { app } from 'electron'
import { join, isAbsolute, resolve, relative } from 'path'
import { randomUUID } from 'crypto'
import { mkdir, rm } from 'fs/promises'

export class WorkspaceManager {
  private baseDir: string

  constructor(baseDir?: string) {
    this.baseDir = resolve(baseDir || join(app?.getPath?.('userData') || __dirname, 'workspaces'))
  }

  async createSessionWorkspace(): Promise<{ sessionId: string, workspacePath: string }> {
    const sessionId = randomUUID()
    const workspacePath = join(this.baseDir, sessionId)
    await mkdir(workspacePath, { recursive: true })
    return { sessionId, workspacePath }
  }

  async cleanupSession(sessionId: string): Promise<void> {
    const session = this.getSession(sessionId)
    if (session) {
      await rm(session.workspacePath, { recursive: true, force: true })
    }
  }

  getSession(sessionId: string): { sessionId: string, workspacePath: string } | null {
    // Strict alphanumeric/dash/underscore session identifier validation
    if (!sessionId || typeof sessionId !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(sessionId)) {
      return null
    }
    const workspacePath = join(this.baseDir, sessionId)
    const rel = relative(this.baseDir, resolve(workspacePath))
    if (rel.startsWith('..') || isAbsolute(rel)) {
      return null
    }
    return { sessionId, workspacePath }
  }

  isSafePath(workspacePath: string, targetPath: string): boolean {
    if (!targetPath || typeof targetPath !== 'string' || isAbsolute(targetPath)) return false
    
    // Normalize and canonicalize check
    const resolvedWorkspace = resolve(workspacePath)
    const resolvedTarget = resolve(workspacePath, targetPath)
    const rel = relative(resolvedWorkspace, resolvedTarget)
    return !rel.startsWith('..') && !isAbsolute(rel)
  }
}
