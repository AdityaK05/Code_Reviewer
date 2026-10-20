import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'path'
import { rm, stat } from 'fs/promises'
import { ZipExtractor } from '../../electron/main/ingestion/ZipExtractor'
import { WorkspaceManager } from '../../electron/main/ingestion/WorkspaceManager'

describe('Ingestion Service Security & Validation', () => {
  const fixturesDir = join(__dirname, '../fixtures')
  let workspaceManager: WorkspaceManager
  let testWorkspace: string

  beforeEach(async () => {
    const tempBase = join(__dirname, '../../test-workspaces')
    workspaceManager = new WorkspaceManager(tempBase)
    const session = await workspaceManager.createSessionWorkspace()
    testWorkspace = session.workspacePath
  })

  afterEach(async () => {
    try {
      await rm(testWorkspace, { recursive: true, force: true })
    } catch {
      // Ignore cleanup failure in tests
    }
  })

  it('securely extracts safe ZIP and builds manifest', async () => {
    const limits = { maxTotalSize: 1024 * 1024, maxEntrySize: 1024 * 1024, maxFiles: 100 }
    const zipPath = join(fixturesDir, 'safe-project.zip')
    
    const files = await ZipExtractor.extractSafe(zipPath, testWorkspace, limits)
    expect(files.length).toBe(2)
    
    const mainStat = await stat(join(testWorkspace, 'main.cpp'))
    expect(mainStat.isFile()).toBe(true)
  })

  it('rejects ZIP with path traversal (../)', async () => {
    const limits = { maxTotalSize: 1024 * 1024, maxEntrySize: 1024 * 1024, maxFiles: 100 }
    const zipPath = join(fixturesDir, 'traversal.zip')
    
    await expect(ZipExtractor.extractSafe(zipPath, testWorkspace, limits))
      .rejects.toThrow(/ARCHIVE_PATH_TRAVERSAL|INVALID_ARCHIVE/)
  })

  it('rejects ZIP with absolute paths', async () => {
    const limits = { maxTotalSize: 1024 * 1024, maxEntrySize: 1024 * 1024, maxFiles: 100 }
    const zipPath = join(fixturesDir, 'absolute-path.zip')
    
    await expect(ZipExtractor.extractSafe(zipPath, testWorkspace, limits))
      .rejects.toThrow(/ARCHIVE_PATH_TRAVERSAL|INVALID_ARCHIVE/)
  })

  it('enforces entry size limits (zip bomb protection)', async () => {
    const limits = { maxTotalSize: 1024 * 1024 * 5, maxEntrySize: 1024, maxFiles: 100 }
    const zipPath = join(fixturesDir, 'oversized-project.zip')
    
    await expect(ZipExtractor.extractSafe(zipPath, testWorkspace, limits))
      .rejects.toThrow(/ARCHIVE_ENTRY_TOO_LARGE/)
  })

  it('WorkspaceManager isSafePath logic correctly validates bounds', () => {
    const ws = 'C:\\Code_Reviewer\\workspaces\\123'
    expect(workspaceManager.isSafePath(ws, 'main.cpp')).toBe(true)
    expect(workspaceManager.isSafePath(ws, 'src/main.cpp')).toBe(true)
    expect(workspaceManager.isSafePath(ws, 'C:\\absolute\\path')).toBe(false)
    expect(workspaceManager.isSafePath(ws, '../../escape')).toBe(false)
  })
})
