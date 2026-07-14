import type { RuntimeInstance, SourceInfo, SourceSources } from './types'
import { LX_PRELUDE_JS } from './lx_prelude'

let dispatchIdCounter = 0

export class SourceRuntime implements RuntimeInstance {
  envName: string
  id: string
  info: SourceInfo
  sources: SourceSources | null = null
  ready = false
  successCalls = 0
  totalCalls = 0
  private initPromise: Promise<boolean> | null = null

  constructor(id: string, info: SourceInfo) {
    this.id = id
    this.info = info
    this.envName = 'src_' + id.replace(/[^a-zA-Z0-9_-]/g, (ch) => {
      return '_' + ch.charCodeAt(0).toString(16).padStart(2, '0')
    })
  }

  async init(): Promise<boolean> {
    if (this.initPromise) return this.initPromise
    this.initPromise = this._doInit()
    return this.initPromise
  }

  private async _doInit(): Promise<boolean> {
    try {
      // Ensure clean env: destroy stale one if any
      try { await songloft.jsenv.destroy(this.envName) } catch {}
      await songloft.jsenv.create(this.envName, LX_PRELUDE_JS)

      const metaCode = `globalThis.lx.currentScriptInfo = ${JSON.stringify({
        name: this.info.name,
        version: this.info.version || '1.0.0',
        description: this.info.description || '',
        author: this.info.author || '',
        homepage: this.info.homepage || '',
        rawScript: this.info.rawScript,
      })};`
      await songloft.jsenv.execute(this.envName, metaCode, 5000)

      const result = await songloft.jsenv.executeWait(
        this.envName,
        this.info.rawScript,
        30000,
        ['lx_inited']
      )

      if (result.error) {
        songloft.log.error(`[SourceRuntime] Init error for ${this.id}: ${result.error}`)
        await this.destroy()
        return false
      }

      if (result.events && result.events.length > 0) {
        for (const evt of result.events) {
          if (evt.name === 'lx_inited') {
            try {
              const data = JSON.parse(evt.data)
              if (data && typeof data === 'object' && data.sources) {
                this.sources = data.sources
                this.ready = true
                songloft.log.info(`[SourceRuntime] Source ${this.id} initialized with platforms: ${Object.keys(data.sources).join(', ')}`)
              }
            } catch (e) {
              songloft.log.error(`[SourceRuntime] Failed to parse inited data for ${this.id}`)
            }
          }
        }
      }

      if (!this.ready) {
        songloft.log.warn(`[SourceRuntime] Source ${this.id} did not emit valid sources`)
        await this.destroy()
        return false
      }

      return true
    } catch (err) {
      songloft.log.error(`[SourceRuntime] Init failed for ${this.id}: ${err}`)
      await this.destroy()
      return false
    }
  }

  async getMusicUrl(platform: string, songInfo: any, quality: string): Promise<string | null> {
    if (!this.ready) return null
    this.totalCalls++

    const reqId = ++dispatchIdCounter
    const dispatchData = {
      source: platform,
      action: 'musicUrl',
      info: {
        musicInfo: songInfo,
        type: quality,
      },
    }

    try {
      const result = await songloft.jsenv.executeWait(
        this.envName,
        `lx._dispatch(${reqId}, "request", ${JSON.stringify(JSON.stringify(dispatchData))});`,
        18000,
        ['lx_dispatchResult', 'lx_dispatchError']
      )

      if (result.error) {
        songloft.log.warn(`[SourceRuntime] Dispatch error for ${this.id}: ${result.error}`)
        return null
      }

      if (result.events) {
        for (const evt of result.events) {
          if (evt.name === 'lx_dispatchResult') {
            try {
              const data = JSON.parse(evt.data)
              if (data.id === reqId) {
                this.successCalls++
                const url = typeof data.result === 'string' ? data.result
                  : (data.result && typeof data.result === 'object' ? data.result.url : null)
                return url || null
              }
            } catch (e) { /* ignore */ }
          }
          if (evt.name === 'lx_dispatchError') {
            try {
              const data = JSON.parse(evt.data)
              if (data.id === reqId) {
                songloft.log.warn(`[SourceRuntime] Dispatch error ${this.id}: ${data.error}`)
                return null
              }
            } catch (e) { /* ignore */ }
          }
        }
      }

      return null
    } catch (err) {
      songloft.log.error(`[SourceRuntime] getMusicUrl failed for ${this.id}: ${err}`)
      return null
    }
  }

  async destroy(): Promise<void> {
    this.ready = false
    this.sources = null
    try {
      await songloft.jsenv.destroy(this.envName)
    } catch (e) {
      // ignore destroy errors
    }
  }
}
