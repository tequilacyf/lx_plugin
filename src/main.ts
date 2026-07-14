import { createRouter } from '@songloft/plugin-sdk'
import type { HTTPRequest, HTTPResponse } from '@songloft/plugin-sdk'
import { RuntimeManager } from './engine/manager'
import { SourceManager } from './source/manager'
import { initAll } from './musicSdk'
import { registerRoutes } from './handlers'

let router: any = null
let sourceManager: SourceManager | null = null
let runtimeManager: RuntimeManager | null = null

async function onInit(): Promise<void> {
  songloft.log.info('[lxmusic] Plugin initializing...')

  // Initialize musicSdk (no-op for stateless SDKs, but good practice)
  await initAll()

  // Create managers
  runtimeManager = new RuntimeManager()
  sourceManager = new SourceManager(runtimeManager)

  // Initialize source manager (loads storage)
  await sourceManager.init()

  // Create HTTP router and register routes
  router = createRouter()
  registerRoutes(router, sourceManager, runtimeManager)

  // Load all enabled sources from storage
  const sources = await sourceManager.getAllSources()
  const enabledSources = sources.filter(s => s.enabled)

  if (enabledSources.length > 0) {
    songloft.log.info(`[lxmusic] Loading ${enabledSources.length} enabled sources...`)
    for (const source of enabledSources) {
      try {
        await sourceManager.enableSource(source.id)
        songloft.log.info(`[lxmusic] Loaded source: ${source.name} (${source.id})`)
      } catch (err) {
        songloft.log.error(`[lxmusic] Failed to load source ${source.id}: ${err}`)
      }
      // Small delay between source inits
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  songloft.log.info('[lxmusic] Plugin initialized successfully')
}

function onDeinit(): void {
  songloft.log.info('[lxmusic] Plugin deinitializing...')
  // Clean up runtimes
  if (runtimeManager) {
    const runtimes = runtimeManager.getAllRuntimes()
    for (const rt of runtimes) {
      runtimeManager.removeRuntime(rt.id).catch(() => {})
    }
  }
  router = null
  sourceManager = null
  runtimeManager = null
  songloft.log.info('[lxmusic] Plugin deinitialized')
}

async function onHTTPRequest(req: HTTPRequest): Promise<HTTPResponse> {
  try {
    if (!router) {
      return {
        statusCode: 503,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 503, msg: 'Plugin not initialized', data: null }),
      }
    }

    const response = await router.handle(req)
    if (response) return response

    // If router returns nothing, return 404
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 404, msg: 'Not found', data: null }),
    }
  } catch (err: any) {
    songloft.log.error(`[lxmusic] HTTP request error: ${err}`)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 500, msg: err.message || 'Internal server error', data: null }),
    }
  }
}

// Mount to globalThis for QuickJS
globalThis.onInit = onInit
globalThis.onDeinit = onDeinit
globalThis.onHTTPRequest = onHTTPRequest
