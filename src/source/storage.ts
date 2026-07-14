import type { SourceIndex, SourceMetadata } from './types'

const INDEX_KEY = 'source_index'
const SCRIPT_PREFIX = 'source_script_'

export class SourceStorage {
  private index: SourceIndex = {}
  private loaded = false

  async init(): Promise<void> {
    if (this.loaded) return

    try {
      const indexJson = await songloft.storage.get(INDEX_KEY)
      if (indexJson && typeof indexJson === 'string') {
        this.index = JSON.parse(indexJson)
      }
    } catch (e) {
      songloft.log.error(`[SourceStorage] Failed to load index: ${e}`)
      this.index = {}
    }

    this.loaded = true
  }

  private async saveIndex(): Promise<void> {
    await songloft.storage.set(INDEX_KEY, JSON.stringify(this.index))
  }

  async getIndex(): Promise<SourceIndex> {
    if (!this.loaded) await this.init()
    return { ...this.index }
  }

  async getMetadata(id: string): Promise<SourceMetadata | null> {
    if (!this.loaded) await this.init()
    return this.index[id] || null
  }

  async getScript(id: string): Promise<string | null> {
    const val = await songloft.storage.get(SCRIPT_PREFIX + id)
    return typeof val === 'string' ? val : null
  }

  async saveSource(metadata: SourceMetadata, script: string): Promise<void> {
    if (!this.loaded) await this.init()
    this.index[metadata.id] = metadata
    await this.saveIndex()
    await songloft.storage.set(SCRIPT_PREFIX + metadata.id, script)
  }

  async deleteSource(id: string): Promise<void> {
    if (!this.loaded) await this.init()
    delete this.index[id]
    await this.saveIndex()
    await songloft.storage.delete(SCRIPT_PREFIX + id)
  }

  async updateMetadata(id: string, updates: Partial<SourceMetadata>): Promise<void> {
    if (!this.loaded) await this.init()
    if (this.index[id]) {
      Object.assign(this.index[id], updates)
      await this.saveIndex()
    }
  }

  async getAllIds(): Promise<string[]> {
    if (!this.loaded) await this.init()
    return Object.keys(this.index)
  }
}
