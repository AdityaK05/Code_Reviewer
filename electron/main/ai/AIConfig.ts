import { app, safeStorage } from 'electron'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
// randomUUID is intentionally kept for potential future use

/**
 * AIConfigStore
 *
 * Securely persists the user-supplied AI reasoning API key.
 *
 * Design intent:
 *  - The key NEVER lives in localStorage, the renderer DOM, or any
 *    user-editable location. It is held only in the main process and
 *    optionally encrypted at rest with Electron's `safeStorage`.
 *  - The renderer can only learn whether a key is configured and a
 *    masked suffix (last 4 chars). It can never read the full key.
 *  - The key is loaded into `process.env` in-memory at startup so the
 *    existing DeepAIAgent plumbing picks it up without change, and is
 *    stripped on quit.
 */
export class AIConfigStore {
  private configPath: string

  constructor(configPath?: string) {
    this.configPath =
      configPath || join(app?.getPath?.('userData') || __dirname, 'ai_config.json')
  }

  private async readConfig(): Promise<Record<string, any>> {
    try {
      if (!existsSync(this.configPath)) return {}
      const raw = await readFile(this.configPath, 'utf-8')
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  }

  private async writeConfig(cfg: Record<string, any>): Promise<void> {
    const dir = join(this.configPath, '..')
    if (!existsSync(dir)) await mkdir(dir, { recursive: true })
    await writeFile(this.configPath, JSON.stringify(cfg, null, 2), 'utf-8')
  }

  async saveKey(key: string): Promise<{ ok: boolean; masked: string; error?: string }> {
    if (typeof key !== 'string' || key.trim().length === 0) {
      return { ok: false, masked: '', error: 'Empty API key' }
    }
    const trimmed = key.trim()

    let stored: string
    if ((safeStorage as any).isAvailable()) {
      try {
        stored = safeStorage.encryptString(trimmed).toString('base64')
      } catch {
        stored = Buffer.from(trimmed, 'utf-8').toString('base64')
      }
    } else {
      stored = Buffer.from(trimmed, 'utf-8').toString('base64')
    }

    const cfg = await this.readConfig()
    cfg.encrypted = stored
    cfg.masked = this.maskKey(trimmed)
    cfg.updatedAt = new Date().toISOString()
    await this.writeConfig(cfg)

    // Make the key available to the analysis pipeline in-memory only
    process.env.GROQ_API_KEY = trimmed
    process.env.AI_API_KEY = trimmed

    return { ok: true, masked: cfg.masked }
  }

  async hasKey(): Promise<boolean> {
    const cfg = await this.readConfig()
    return Boolean(cfg.encrypted)
  }

  async getMasked(): Promise<string> {
    const cfg = await this.readConfig()
    return typeof cfg.masked === 'string' ? cfg.masked : ''
  }

  async deleteKey(): Promise<void> {
    const cfg = await this.readConfig()
    delete cfg.encrypted
    delete cfg.masked
    await this.writeConfig(cfg)
    delete process.env.GROQ_API_KEY
    delete process.env.AI_API_KEY
  }

  /**
   * Load any previously-stored key into the environment (in-memory only)
   * so the analysis pipeline can use it. Safe to call repeatedly.
   */
  async loadIntoEnv(): Promise<void> {
    const cfg = await this.readConfig()
    if (!cfg.encrypted) return
    try {
      let raw: string
      if ((safeStorage as any).isAvailable()) {
        raw = safeStorage.decryptString(Buffer.from(cfg.encrypted, 'base64'))
      } else {
        raw = Buffer.from(cfg.encrypted, 'base64').toString('utf-8')
      }
      if (raw && raw.length > 0) {
        process.env.GROQ_API_KEY = raw
        process.env.AI_API_KEY = raw
      }
    } catch {
      // Corrupt stored key — clear it
      await this.deleteKey()
    }
  }

  private maskKey(key: string): string {
    if (key.length <= 4) return '****'
    return '*'.repeat(Math.max(0, key.length - 4)) + key.slice(-4)
  }
}