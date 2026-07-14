import { SourceRuntime } from './runtime'
import type { RuntimeInstance } from './types'

export class RuntimeManager {
  private runtimes: Map<string, SourceRuntime> = new Map()
  private platformIndex: Map<string, RuntimeInstance[]> = new Map()

  async addRuntime(id: string, info: { name: string; version?: string; description?: string; author?: string; homepage?: string; rawScript: string }): Promise<boolean> {
    if (this.runtimes.has(id)) {
      await this.removeRuntime(id)
    }

    const runtime = new SourceRuntime(id, info)
    const success = await runtime.init()

    if (success && runtime.sources) {
      this.runtimes.set(id, runtime)
      for (const platform of Object.keys(runtime.sources)) {
        if (!this.platformIndex.has(platform)) {
          this.platformIndex.set(platform, [])
        }
        this.platformIndex.get(platform)!.push(runtime)
      }
      return true
    }

    return false
  }

  removeRuntime(id: string): Promise<void> {
    const runtime = this.runtimes.get(id)
    if (!runtime) return Promise.resolve()

    this.runtimes.delete(id)

    for (const [platform, list] of this.platformIndex) {
      const idx = list.findIndex(r => r.id === id)
      if (idx >= 0) list.splice(idx, 1)
      if (list.length === 0) this.platformIndex.delete(platform)
    }

    return runtime.destroy()
  }

  getRuntime(id: string): RuntimeInstance | undefined {
    return this.runtimes.get(id)
  }

  getRuntimesForPlatform(platform: string): RuntimeInstance[] {
    return this.platformIndex.get(platform) || []
  }

  getAllRuntimes(): RuntimeInstance[] {
    return Array.from(this.runtimes.values())
  }

  async getMusicUrl(platform: string, songInfo: any, quality: string): Promise<{ url: string; sourceId: string } | null> {
    const runtimes = this.getRuntimesForPlatform(platform)
    if (runtimes.length === 0) return null

    const sorted = [...runtimes].sort((a, b) => {
      const rateA = a.totalCalls > 0 ? a.successCalls / a.totalCalls : 0.5
      const rateB = b.totalCalls > 0 ? b.successCalls / b.totalCalls : 0.5
      return rateB - rateA
    })

    const candidates = sorted.slice(0, 3)

    const calls = candidates.map(rt => ({
      name: rt.envName,
      code: `lx._dispatch(${Date.now()}, "request", ${JSON.stringify(JSON.stringify({
        source: platform,
        action: 'musicUrl',
        info: { musicInfo: songInfo, type: quality },
      }))});`,
      timeoutMs: 18000,
    }))

    // executeParallel returns a single SongloftJSEnvParallelResult
    const parallelResult = await songloft.jsenv.executeParallel(calls, 3)

    if (parallelResult.successIndex >= 0 && parallelResult.result) {
      const result = parallelResult.result
      if (!result.error) {
        const candidate = candidates[parallelResult.successIndex]
        candidate.successCalls++
        candidate.totalCalls++

        // result.result is a string (last expression toString)
        // The dispatch result is JSON-encoded in the string
        if (typeof result.result === 'string') {
          try {
            const parsed = JSON.parse(result.result)
            const url = typeof parsed === 'string' ? parsed : (parsed?.url || null)
            if (url) return { url, sourceId: candidate.id }
          } catch {
            // If not JSON, treat as raw URL
            if (result.result.startsWith('http')) return { url: result.result, sourceId: candidate.id }
          }
        }
      }
    }

    // All failed - update totalCalls for candidates
    for (const c of candidates) {
      c.totalCalls++
    }

    return null
  }

  hasPlatform(platform: string): boolean {
    return this.platformIndex.has(platform) && this.platformIndex.get(platform)!.length > 0
  }

  getSupportedPlatforms(): string[] {
    return Array.from(this.platformIndex.keys())
  }
}
