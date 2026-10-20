import * as yauzl from 'yauzl'
import { join, isAbsolute, normalize, dirname, resolve as pathResolve, relative, extname } from 'path'
import { createWriteStream } from 'fs'
import { mkdir } from 'fs/promises'
import { FileClassifier } from './FileClassifier'
import { pipeline } from 'stream/promises'

export interface ExtractionLimits {
  maxTotalSize: number
  maxEntrySize: number
  maxFiles: number
}

export interface ExtractedFile {
  relativePath: string
  size: number
  language: string
  type: string
  extension: string
}

export class ZipExtractor {
  static async extractSafe(
    zipPath: string,
    workspacePath: string,
    limits: ExtractionLimits
  ): Promise<ExtractedFile[]> {
    return new Promise((resolvePromise, rejectPromise) => {
      let isSettled = false
      const reject = (err: any) => {
        if (!isSettled) {
          isSettled = true
          rejectPromise(err)
        }
      }
      const resolve = (val: ExtractedFile[]) => {
        if (!isSettled) {
          isSettled = true
          resolvePromise(val)
        }
      }

      let totalFiles = 0
      let totalSize = 0
      const extractedFiles: ExtractedFile[] = []

      yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
        if (err || !zipfile) {
          return reject(new Error('INVALID_ARCHIVE'))
        }

        zipfile.readEntry()

        zipfile.on('entry', async (entry: yauzl.Entry) => {
          try {
            // Prevent traversal, drive letters, null bytes, and absolute paths
            if (
              !entry.fileName ||
              isAbsolute(entry.fileName) ||
              entry.fileName.includes('..') ||
              entry.fileName.includes('\0') ||
              /^[a-zA-Z]:/.test(entry.fileName)
            ) {
              throw new Error('ARCHIVE_PATH_TRAVERSAL')
            }

            // Skip directories and symlinks (handling regular files only)
            if (/\/$/.test(entry.fileName) || /\\$/.test(entry.fileName)) {
              zipfile.readEntry()
              return
            }

            totalFiles++
            if (totalFiles > limits.maxFiles) {
              throw new Error('ARCHIVE_TOO_MANY_ENTRIES')
            }

            const uncompressedSize = entry.uncompressedSize
            if (uncompressedSize > limits.maxEntrySize) {
              throw new Error('ARCHIVE_ENTRY_TOO_LARGE')
            }

            totalSize += uncompressedSize
            if (totalSize > limits.maxTotalSize) {
              throw new Error('ARCHIVE_TOO_LARGE')
            }

            // Normalize path for platform
            const relativeNormalized = normalize(entry.fileName)
            const targetPath = join(workspacePath, relativeNormalized)

            // Strict boundary confinement check
            const resolvedTarget = pathResolve(targetPath)
            const resolvedWorkspace = pathResolve(workspacePath)
            const relCheck = relative(resolvedWorkspace, resolvedTarget)
            if (relCheck.startsWith('..') || isAbsolute(relCheck)) {
              throw new Error('ARCHIVE_PATH_TRAVERSAL')
            }

            await mkdir(dirname(targetPath), { recursive: true })

            zipfile.openReadStream(entry, async (streamErr, readStream) => {
              if (streamErr || !readStream) {
                zipfile.close()
                return reject(new Error('EXTRACTION_FAILED'))
              }

              const writeStream = createWriteStream(targetPath)
              
              try {
                await pipeline(readStream, writeStream)
                
                const { language, type } = FileClassifier.classify(entry.fileName)
                extractedFiles.push({
                  relativePath: relativeNormalized,
                  size: uncompressedSize,
                  language,
                  type,
                  extension: extname(entry.fileName)
                })

                zipfile.readEntry()
              } catch (pipelineErr) {
                zipfile.close()
                reject(pipelineErr)
              }
            })
          } catch (processErr) {
            zipfile.close()
            reject(processErr)
          }
        })

        zipfile.on('end', () => resolve(extractedFiles))
        zipfile.on('error', () => {
          zipfile.close()
          reject(new Error('INVALID_ARCHIVE'))
        })
      })
    })
  }
}
