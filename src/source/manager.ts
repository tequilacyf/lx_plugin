import { SourceStorage } from './storage'
import { parseSourceScript, nameToId, deduplicateId } from './parser'
import type { SourceMetadata, SourceImportResult, BatchImportStatus } from './types'
import type { RuntimeManager } from '../engine/manager'

export class SourceManager {
  private storage: SourceStorage
  private runtimeManager: RuntimeManager
  private batchStatus: BatchImportStatus = {
    loading: false,
    batch_current_id: null,
    batch_pending_ids: [],
    batch_total: 0,
    batch_completed: 0,
    batch_errors: [],
  }

  constructor(runtimeManager: RuntimeManager) {
    this.storage = new SourceStorage()
    this.runtimeManager = runtimeManager
  }

  async init(): Promise<void> {
    await this.storage.init()
  }

  async getAllSources(): Promise<SourceMetadata[]> {
    const index = await this.storage.getIndex()
    return Object.values(index)
  }

  async getSource(id: string): Promise<SourceMetadata | null> {
    return this.storage.getMetadata(id)
  }

  async importScript(script: string, filename?: string): Promise<SourceImportResult> {
    try {
      // Strip UTF-8 BOM and normalize
      let cleanScript = script
      if (cleanScript.charCodeAt(0) === 0xFEFF) cleanScript = cleanScript.slice(1)
      // Also strip any leading control characters
      while (cleanScript.length > 0 && cleanScript.charCodeAt(0) < 32 && cleanScript.charCodeAt(0) !== 10 && cleanScript.charCodeAt(0) !== 13) {
        cleanScript = cleanScript.slice(1)
      }
      songloft.log.info(`[importScript] len=${cleanScript.length} start="${cleanScript.substring(0, 80)}"`)
      const { metadata, rawScript } = parseSourceScript(cleanScript, filename?.replace(/\.\w+$/, ''))

      if (!metadata.name) {
        return { success: false, error: 'Unable to determine source name' }
      }

      const existingIds = new Set(await this.storage.getAllIds())
      let id = nameToId(metadata.name!)

      // Check if same name exists - delete old first
      const existingBySameName = Object.values(await this.storage.getIndex())
        .find(s => s.name === metadata.name)
      if (existingBySameName) {
        await this.deleteSource(existingBySameName.id)
        id = existingBySameName.id // Reuse same ID
      } else {
        id = deduplicateId(id, existingIds)
      }

      const now = Date.now()
      const sourceMeta: SourceMetadata = {
        id,
        name: metadata.name!,
        version: metadata.version,
        description: metadata.description,
        author: metadata.author,
        homepage: metadata.homepage,
        enabled: false,
        loaded: false,
        loading: false,
        scriptSize: rawScript.length,
        createdAt: now,
        updatedAt: now,
      }

      await this.storage.saveSource(sourceMeta, rawScript)

      return { success: true, id, name: metadata.name }
    } catch (err: any) {
      return { success: false, error: err.message || String(err) }
    }
  }

  async deleteSource(id: string): Promise<boolean> {
    // Unload from engine first
    await this.runtimeManager.removeRuntime(id)
    await this.storage.deleteSource(id)
    return true
  }

  async enableSource(id: string): Promise<boolean> {
    const meta = await this.storage.getMetadata(id)
    if (!meta) return false

    const script = await this.storage.getScript(id)
    if (!script) return false

    await this.storage.updateMetadata(id, { loading: true, error: undefined })

    try {
      const success = await this.runtimeManager.addRuntime(id, {
        name: meta.name,
        version: meta.version,
        description: meta.description,
        author: meta.author,
        homepage: meta.homepage,
        rawScript: script,
      })

      if (success) {
        await this.storage.updateMetadata(id, { enabled: true, loaded: true, loading: false })
        return true
      } else {
        await this.storage.updateMetadata(id, { enabled: false, loaded: false, loading: false, error: 'Failed to initialize source' })
        return false
      }
    } catch (err: any) {
      await this.storage.updateMetadata(id, { enabled: false, loaded: false, loading: false, error: err.message || String(err) })
      return false
    }
  }

  async disableSource(id: string): Promise<boolean> {
    await this.runtimeManager.removeRuntime(id)
    await this.storage.updateMetadata(id, { enabled: false, loaded: false })
    return true
  }

  async toggleSource(id: string): Promise<boolean> {
    const meta = await this.storage.getMetadata(id)
    if (!meta) return false
    const newEnabled = !meta.enabled
    if (newEnabled) {
      const ok = await this.enableSource(id)
      return ok ? true : meta.enabled
    } else {
      await this.disableSource(id)
      return false
    }
  }

  // Batch import (for ZIP uploads)
  async batchImport(scripts: Array<{ script: string; filename?: string }>): Promise<void> {
    if (this.batchStatus.loading) return

    // Step 1: Pre-persist all scripts synchronously (enabled=false)
    const persistedIds: string[] = []
    for (let i = 0; i < scripts.length; i++) {
      const item = scripts[i]
      try {
        const result = await this.importScript(item.script, item.filename)
        if (result.success && result.id) {
          persistedIds.push(result.id)
        } else {
          this.batchStatus.batch_errors.push({
            id: item.filename || `batch_${i}`,
            error: result.error || 'Import failed',
          })
        }
      } catch (err: any) {
        this.batchStatus.batch_errors.push({
          id: item.filename || `batch_${i}`,
          error: err.message || String(err),
        })
      }
    }

    if (persistedIds.length === 0) {
      this.batchStatus.loading = false
      return
    }

    this.batchStatus = {
      loading: true,
      batch_current_id: null,
      batch_pending_ids: [...persistedIds],
      batch_total: persistedIds.length,
      batch_completed: 0,
      batch_errors: [...this.batchStatus.batch_errors],
    }

    // Step 2: Background chain to enable each source
    const processNext = async () => {
      if (this.batchStatus.batch_pending_ids.length === 0) {
        this.batchStatus.loading = false
        this.batchStatus.batch_current_id = null
        return
      }

      const id = this.batchStatus.batch_pending_ids[0]
      this.batchStatus.batch_current_id = id

      try {
        await this.enableSource(id)
      } catch (err: any) {
        this.batchStatus.batch_errors.push({
          id,
          error: err.message || String(err),
        })
      }

      this.batchStatus.batch_completed++
      this.batchStatus.batch_pending_ids.shift()

      // Yield to env lock
      await new Promise(resolve => setTimeout(resolve, 1000))
      await processNext()
    }

    // Start processing (fire and forget)
    processNext().catch(err => {
      songloft.log.error(`[SourceManager] Batch import error: ${err}`)
      this.batchStatus.loading = false
    })
  }

  getBatchStatus(): BatchImportStatus {
    return { ...this.batchStatus }
  }

  getRuntimeManager(): RuntimeManager {
    return this.runtimeManager
  }
}
