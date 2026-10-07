import * as yauzl from 'yauzl'
import { join, isAbsolute, normalize, dirname } from 'path'
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
    return new Promise((resolve, reject) => {
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
            // Prevent traversal and absolute paths
            if (isAbsolute(entry.fileName) || entry.fileName.includes('..')) {
              throw new Error('ARCHIVE_PATH_TRAVERSAL')
            }

            // Skip directories and symlinks (handling regular files only)
            if (/\/$/.test(entry.fileName)) {
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

            // Normalize path for Windows
            const relativeNormalized = normalize(entry.fileName)
            const targetPath = join(workspacePath, relativeNormalized)

            // Double check bounds
            if (!targetPath.startsWith(workspacePath)) {
              throw new Error('ARCHIVE_PATH_TRAVERSAL')
            }

            await mkdir(dirname(targetPath), { recursive: true })

            zipfile.openReadStream(entry, async (streamErr, readStream) => {
              if (streamErr || !readStream) {
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
                  extension: require('path').extname(entry.fileName)
                })

                zipfile.readEntry()
              } catch (pipelineErr) {
                reject(pipelineErr)
              }
            })
          } catch (processErr) {
            zipfile.close()
            reject(processErr)
          }
        })

        zipfile.on('end', () => resolve(extractedFiles))
        zipfile.on('error', (zipErr) => reject(new Error('INVALID_ARCHIVE')))
      })
    })
  }
}
