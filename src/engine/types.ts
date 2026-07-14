export interface SourceInfo {
  name: string
  version?: string
  description?: string
  author?: string
  homepage?: string
  rawScript: string
}

export interface SourceSources {
  [platform: string]: {
    name: string
    type?: string
    actions?: string[]
    qualitys?: string[]
  }
}

export interface RuntimeInstance {
  envName: string
  id: string
  info: SourceInfo
  sources: SourceSources | null
  ready: boolean
  successCalls: number
  totalCalls: number
  getMusicUrl(platform: string, songInfo: any, quality: string): Promise<string | null>
}

export interface DispatchResult {
  id: number
  result?: any
  error?: string
}

export interface PlatformRuntime {
  platform: string
  runtimes: RuntimeInstance[]
}
