import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

export interface GitDiffInfo {
  isGitRepo: boolean;
  changedFiles: string[]; // relative paths
  fileChangedLines: Record<string, Set<number>>; // relativePath -> Set of 1-based line numbers
}

export class GitDiffHelper {
  static async isGitRepository(workspacePath: string): Promise<boolean> {
    try {
      if (existsSync(join(workspacePath, '.git'))) {
        return true;
      }
      const { stdout } = await execAsync('git rev-parse --is-inside-work-tree', {
        cwd: workspacePath,
        timeout: 3000
      });
      return stdout.trim() === 'true';
    } catch {
      return false;
    }
  }

  static async getDiffSummary(workspacePath: string): Promise<GitDiffInfo | null> {
    const isRepo = await this.isGitRepository(workspacePath);
    if (!isRepo) {
      return null;
    }

    try {
      // 1. Get changed files from git status (modified, added, untracked)
      const { stdout: statusOut } = await execAsync('git status --porcelain', {
        cwd: workspacePath,
        timeout: 5000
      });

      const changedFiles = new Set<string>();
      const lines = statusOut.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        // porcelain format: XY <path> or XY "path"
        const filePathPart = line.substring(3).trim().replace(/^"|"$/g, '');
        if (filePathPart) {
          // Normalize forward slashes
          changedFiles.add(filePathPart.replace(/\\/g, '/'));
        }
      }

      // 2. Parse git diff -U0 to find specific modified line numbers
      const fileChangedLines: Record<string, Set<number>> = {};
      try {
        const { stdout: diffOut } = await execAsync('git diff -U0 HEAD', {
          cwd: workspacePath,
          timeout: 5000
        });

        let currentFile: string | null = null;
        const diffLines = diffOut.split('\n');

        for (const dLine of diffLines) {
          if (dLine.startsWith('+++ b/')) {
            currentFile = dLine.substring(6).trim().replace(/\\/g, '/');
            if (!fileChangedLines[currentFile]) {
              fileChangedLines[currentFile] = new Set();
            }
          } else if (dLine.startsWith('@@ ') && currentFile) {
            // Format: @@ -start,count +start,count @@
            const match = dLine.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
            if (match) {
              const startLine = parseInt(match[1], 10);
              const count = match[2] !== undefined ? parseInt(match[2], 10) : 1;
              for (let i = 0; i < count; i++) {
                fileChangedLines[currentFile].add(startLine + i);
              }
            }
          }
        }
      } catch {
        // If git diff HEAD fails (e.g. initial commit with no commits yet), continue with changedFiles from status
      }

      return {
        isGitRepo: true,
        changedFiles: Array.from(changedFiles),
        fileChangedLines
      };
    } catch (err) {
      console.warn('[GitDiffHelper] Failed to collect git diff:', err);
      return null;
    }
  }
}
