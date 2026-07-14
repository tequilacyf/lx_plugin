import type { HTTPRequest, HTTPResponse } from '@songloft/plugin-sdk'
import { errorResponse, successResponse } from './response'
import type { SourceManager } from '../source/manager'

export function createSourceHandlers(sourceManager: SourceManager) {
  async function handleGetSources(_req: HTTPRequest): Promise<HTTPResponse> {
    try {
      const sources = await sourceManager.getAllSources()
      const batchStatus = sourceManager.getBatchStatus()
      return successResponse({ sources, batch: batchStatus })
    } catch (err: any) {
      return errorResponse(err.message || String(err), 500)
    }
  }

  async function handleImportSource(req: HTTPRequest): Promise<HTTPResponse> {
    try {
      const body = new TextDecoder().decode(req.body || new Uint8Array(0))
      const { script, filename } = JSON.parse(body)

      if (!script) return errorResponse('script is required')

      const result = await sourceManager.importScript(script, filename)
      if (!result.success) {
        return errorResponse(result.error || 'Import failed')
      }

      return successResponse({ id: result.id, name: result.name })
    } catch (err: any) {
      return errorResponse(err.message || String(err), 500)
    }
  }

  async function handleImportUrl(req: HTTPRequest): Promise<HTTPResponse> {
    try {
      const body = new TextDecoder().decode(req.body || new Uint8Array(0))
      const { url } = JSON.parse(body)

      if (!url) return errorResponse('url is required')

      const resp = await fetch(url)
      if (!resp.ok) return errorResponse(`Failed to fetch: ${resp.status}`)
      const script = await resp.text()

      const result = await sourceManager.importScript(script, url.split('/').pop())
      if (!result.success) {
        return errorResponse(result.error || 'Import failed')
      }

      return successResponse({ id: result.id, name: result.name })
    } catch (err: any) {
      return errorResponse(err.message || String(err), 500)
    }
  }

  async function handleDeleteSource(req: HTTPRequest): Promise<HTTPResponse> {
    try {
      const q = parseQuery(req.query)
      const id = q.id
      if (!id) return errorResponse('id is required')

      await sourceManager.deleteSource(id)
      return successResponse(null)
    } catch (err: any) {
      return errorResponse(err.message || String(err), 500)
    }
  }

  async function handleToggleSource(req: HTTPRequest): Promise<HTTPResponse> {
    try {
      const body = new TextDecoder().decode(req.body || new Uint8Array(0))
      const { id, enabled } = JSON.parse(body)

      if (!id) return errorResponse('id is required')

      let success: boolean
      if (enabled === true) {
        success = await sourceManager.enableSource(id)
      } else if (enabled === false) {
        success = await sourceManager.disableSource(id)
      } else {
        success = await sourceManager.toggleSource(id)
      }

      if (!success) return errorResponse('Toggle failed')
      return successResponse({ enabled: !enabled })
    } catch (err: any) {
      return errorResponse(err.message || String(err), 500)
    }
  }

  return {
    handleGetSources,
    handleImportSource,
    handleImportUrl,
    handleDeleteSource,
    handleToggleSource,
  }
}

// Need parseQuery import
import { parseQuery } from '@songloft/plugin-sdk'
